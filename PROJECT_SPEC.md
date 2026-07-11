# Checkout Interceptor: Project Specification

## Overview

A Chrome extension that intercepts checkout attempts on Shein (fashion) and Amazon (electronics/general goods), redirects the user to a full-page "Vault" dashboard, and holds the purchase for 24 hours while showing behavioural interventions (similar items already owned, secondhand alternatives available nationwide, true cost reframing). Goal: reduce impulse purchases and consumerism at the decision point.

## Problem Statement

Consumerism happens at the checkout moment. Downstream solutions (recycling, resale) process waste already manufactured and shipped. The most sustainable good is one never bought. This product intervenes at the exact purchase decision using the user's own purchase history and behavioural techniques.

## Locked Decisions (do not deviate without team discussion)

- **Retailers:** Amazon (electronics/general goods) and Shein (fashion). Not ASOS. Not a third site.
- **Categories:** fashion (via Shein) and electronics/small gadgets (via Amazon). True-cost table must cover both.
- **Timer duration:** 24 hours in the product spec. For the demo video, initialise the countdown at a value like `23:47:12` to imply it's been running, rather than starting from 24:00:00. Do not build a "demo mode" speed multiplier, it's extra scope for no real benefit.
- **"Buy Anyway" behaviour:** logs the decision only. Does NOT navigate back to the retailer's cart or attempt to complete the purchase programmatically. Simplest possible implementation: record the decision, update UI state, done.
- **Vault multi-item view:** the Vault is a proper list of all blocked/held items, not just "most recent + history." On open, show all pending interceptions (not yet decided) as cards, plus a separate history section below for already-decided ones. Clicking a pending card opens its full detail view (owned items, secondhand, true cost, decision buttons).
- **Demo reset button:** build a visible "Reset Demo Data" button (in the popup or a settings corner of the Vault) that wipes `chrome.storage.local` and re-seeds it with the starting demo state (tally, pending items, history). This lets you re-run the demo cleanly between rehearsals without manually clearing storage. Persist the seeded starting tally across normal use; the reset button is purely for demo/rehearsal convenience.
- **Gmail seeding:** fake order-confirmation emails, sent via script into a real test Gmail account, so the real Gmail OAuth + fetch + parse pipeline runs live in the demo. Do not hardcode parsed JSON directly into the backend, and do not place real orders. Seed at least 15 items split across both categories (roughly 8-10 fashion, 5-7 electronics) so any demo cart item has a convincing match.
- **eBay listings:** Production API access requires one business day of verification which lands mid-build. Backend implements a `USE_MOCK_EBAY` environment variable. When true, `/secondhand` returns curated hardcoded listings from `services/mock_ebay.py`. When false, it hits the real eBay Browse API (nationwide, `EBAY_AU` marketplace, sorted by best price/condition, not distance-filtered since delivery makes distance irrelevant). Build the mock path first, it's faster and always demoable. Swap to real if Production credentials arrive by hour 30. If not, ship with the mock. Do not spend build time hunting for eBay workarounds (Apify actors, scrapers) beyond this fallback.
- **Postcode and hourly rate:** hardcoded for the demo user in `chrome.storage.local` at build time. No settings screen needed for MVP.
- **User ID storage:** stored in `chrome.storage.local` after the Gmail OAuth callback returns it. No other persistence layer needed on the extension side.
- **Tally starting state:** seed `chrome.storage.local` with a starting tally (e.g. "$180 saved, 9kg CO2 avoided, 4 items released") before recording, so the demo doesn't open on a zero state. Reset button restores this exact starting state.
- **Vault layout:** start with a simple vertical scroll layout for the four panels (owned items, secondhand, true cost, decision buttons). Experiment with a condensed/expandable layout only if time allows after the scroll version works end to end. Do not block the hero flow on a fancier layout.
- **Video structure:** include a brief (~5 second) tech-stack card near the end, not a deep technical explanation.
- **Product name:** not finalised. "Vault" is the working name used throughout this spec and the codebase. Decide the final name later; renaming at the end is a find-and-replace, not a rebuild.
- **OAuth redirect handling:** untested assumption that Google Cloud Console accepts a `chrome-extension://` redirect URI directly. Test this at hour 2. If it's rejected, fall back to a minimal hosted callback page (e.g. a single static page on Vercel) that receives the OAuth code and posts it back to the extension via `window.postMessage` or a query param the extension polls for.
- **Team logistics:** working together in one room for the full 42 hours, continuous informal sync rather than scheduled standups. Scope-cut authority defaults to whoever is closest to the blocked component; escalate to the team lead only if it's a cross-cutting decision.

## Core Product Flow

1. User shops on Shein (fashion) or Amazon (electronics/general goods).
2. User clicks "Place Order" / "Checkout". Content script suppresses default action.
3. Toast appears (2 seconds): "Sent to your Vault for a mindfulness check."
4. New tab opens to the Vault dashboard (`chrome-extension://[id]/vault.html`).
5. Dashboard displays, all at once:
   - Intercepted item (photo, title, price, retailer).
   - 24-hour countdown timer (prominent, circular, elegant).
   - **You Already Own** panel: 2-3 CLIP matches from Gmail order history with similarity score and purchase date.
   - **Same Item, Secondhand Nearby** panel: live eBay listings, nationwide, sorted by best price/condition match.
   - **True Cost** panel: price reframed as work hours (from user hourly rate) + environmental estimate (water litres, kg CO2).
   - Two buttons: **Release & Save** (primary, prominent) and **Buy Anyway** (secondary).
6. On Release: confetti animation, tally updates ($ saved, kg CO2, items released), item logged.
7. On Buy Anyway: decision logged, item moves to history section, no navigation.
8. On timer expiry: dashboard shifts to "decision time" state, both buttons active.
9. Vault shows all pending (undecided) interceptions as a list, plus a history section below for decided ones, with cumulative tally always visible at top.

## Technical Stack

### Backend

- **Framework:** FastAPI (Python 3.11+)
- **Deployment:** Hugging Face Spaces (Gradio SDK, Blank template, CPU basic free tier, Private)
- **Storage:** Per-user JSON files in `data/` directory (no database for MVP)
- **Keep-alive:** GitHub Actions cron pinging `/health` every 10 minutes

### ML

- **Model:** `sentence-transformers/clip-ViT-B-32` (via `sentence-transformers` library, easier API than raw HuggingFace)
- **Similarity:** Cosine similarity via NumPy on in-memory embedding arrays
- **No FAISS or vector DB required for demo scale**

### Extension

- **Manifest:** V3
- **Build tool:** Vite with `@crxjs/vite-plugin`
- **Frontend:** React + Tailwind CSS
- **Animations:** Framer Motion + `canvas-confetti`
- **Data fetching:** TanStack Query (React Query)

### APIs

- **Gmail API:** OAuth 2.0 via Google Cloud Console, `gmail.readonly` scope, test-user allow-list
- **eBay Browse API:** Client Credentials OAuth, Australian marketplace (`EBAY_AU`)

### Landing Page

- **Framework:** Next.js on Vercel
- **Styling:** Tailwind CSS
- **Domain:** Free `.vercel.app` subdomain

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Chrome Extension (MV3)                                       │
│                                                                │
│  ┌────────────────┐   ┌──────────────────┐   ┌────────────┐  │
│  │ content.js     │──▶│ background.js    │──▶│ vault.html │  │
│  │ (intercepts    │   │ (service worker) │   │ (React app)│  │
│  │  checkout)     │   │                  │   │            │  │
│  └────────────────┘   └──────────────────┘   └─────┬──────┘  │
└─────────────────────────────────────────────────────┼─────────┘
                                                      │
                                                      ▼
                                     ┌────────────────────────────┐
                                     │  FastAPI Backend           │
                                     │  (Hugging Face Spaces)     │
                                     │                            │
                                     │  /auth/gmail               │
                                     │  /match  (CLIP)            │
                                     │  /secondhand (eBay)        │
                                     │  /log                      │
                                     │  /tally                    │
                                     │  /history                  │
                                     └────────┬───────────────────┘
                                              │
                       ┌──────────────────────┼──────────────────────┐
                       ▼                      ▼                      ▼
              ┌────────────────┐   ┌──────────────────┐   ┌──────────────────┐
              │ Gmail API      │   │ eBay Browse API  │   │ Local JSON store │
              │ (order emails) │   │ (secondhand)     │   │ (user data)      │
              └────────────────┘   └──────────────────┘   └──────────────────┘
```

## Backend Specification

### Directory Structure

```
backend/
├── main.py                  # FastAPI app entry
├── requirements.txt
├── app.py                  # Gradio app entry (HF Spaces looks for this)
├── .env.example
├── routers/
│   ├── auth.py             # Gmail OAuth flow
│   ├── match.py            # CLIP matching endpoint
│   ├── secondhand.py       # eBay search endpoint
│   ├── log.py              # Decision logging
│   └── user.py             # Tally and history
├── services/
│   ├── clip_service.py     # CLIP model loading and inference
│   ├── gmail_service.py    # Gmail API + email parsers
│   ├── ebay_service.py     # eBay Browse API client (live path)
│   ├── mock_ebay.py        # Curated hardcoded listings for demo (fallback path)
│   └── storage.py          # JSON file read/write
├── parsers/
│   ├── shein.py            # Shein order-confirmation HTML parser
│   └── amazon.py           # Amazon parser
├── data/                   # Per-user JSON files
│   └── .gitkeep
└── static/
    └── true_cost_table.json  # Category → water/CO2 lookup
```

### Endpoints

| Method | Path | Purpose | Request Body | Response |
|--------|------|---------|--------------|----------|
| POST | `/auth/gmail` | Initiate OAuth | `{ user_id }` | `{ auth_url }` |
| GET | `/auth/gmail/callback` | OAuth callback, sync orders | (query: `code`, `state`) | Redirect to extension |
| POST | `/match` | Get similar owned items | `{ user_id, image_url, title, category }` | `{ matches: [{ image_url, title, purchase_date, retailer, similarity }] }` |
| POST | `/secondhand` | Get secondhand eBay listings (nationwide) | `{ title }` | `{ listings: [{ title, price, image_url, url, condition, location }] }` |
| POST | `/log` | Log purchase decision | `{ user_id, item, decision: 'release' \| 'buy', estimated_savings }` | `{ ok: true, new_tally }` |
| GET | `/tally?user_id=` | Get cumulative savings | - | `{ dollars_saved, kg_co2_avoided, items_released }` |
| GET | `/history?user_id=` | Get interception history | - | `{ interceptions: [...] }` |
| POST | `/true-cost` | Calculate true cost | `{ price, category, hourly_rate }` | `{ work_hours, water_litres, kg_co2 }` |
| GET | `/health` | Keep-alive | - | `{ status: 'ok' }` |

### CLIP Service

```python
# services/clip_service.py sketch
from sentence_transformers import SentenceTransformer
from PIL import Image
import numpy as np
import httpx

class ClipService:
    def __init__(self):
        self.model = SentenceTransformer('clip-ViT-B-32')
    
    def encode_image_url(self, url: str) -> np.ndarray:
        response = httpx.get(url, timeout=10)
        img = Image.open(io.BytesIO(response.content))
        return self.model.encode(img)
    
    def similarity(self, query_emb: np.ndarray, corpus_embs: np.ndarray) -> np.ndarray:
        # Cosine similarity
        return np.dot(corpus_embs, query_emb) / (
            np.linalg.norm(corpus_embs, axis=1) * np.linalg.norm(query_emb)
        )
    
    def top_k_matches(self, query_url: str, corpus: list[dict], k: int = 3):
        query_emb = self.encode_image_url(query_url)
        corpus_embs = np.array([item['embedding'] for item in corpus])
        scores = self.similarity(query_emb, corpus_embs)
        top_indices = np.argsort(scores)[::-1][:k]
        return [
            {**corpus[i], 'similarity': float(scores[i])}
            for i in top_indices
        ]
```

### Gmail Service

- Use `google-auth-oauthlib` for OAuth flow.
- Store refresh token in user's JSON file.
- Query strategy: `from:(noreply@shein.com OR auto-confirm@amazon.com.au) newer_than:180d`
- For each matching email, dispatch to the appropriate parser based on sender.
- Each parser returns a list of `{ image_url, title, price, purchase_date, retailer }`.
- Precompute CLIP embeddings for all parsed items during initial sync, store on user record.

### eBay Service

`/secondhand` reads `USE_MOCK_EBAY` env var and dispatches to one of two paths.

**Mock path (`services/mock_ebay.py`, default):**
- Loads a JSON file of hand-curated listings, keyed by category or by simple title-keyword matching.
- Returns 5 listings that plausibly match the query. Person C curates these to look real: correct-looking prices, image URLs from actual eBay listing thumbnails (or generic product photos), condition strings ("Used - Excellent", "New Other", etc.), location strings scattered across Australian cities.
- Zero latency, 100% reliability. This is the ship-safe path.

**Live path (`services/ebay_service.py`):**
- Endpoint: `https://api.ebay.com/buy/browse/v1/item_summary/search`
- Auth: OAuth Client Credentials, cache token for its TTL.
- Params: `q={title}`, `filter=buyingOptions:{FIXED_PRICE},itemLocationCountry:AU`, `limit=10`.
- Marketplace header: `X-EBAY-C-MARKETPLACE-ID: EBAY_AU`.
- Return top 5 by best price/condition match, nationwide (Australia-wide via `EBAY_AU`), not filtered by user location.
- Only enabled when eBay Production credentials are available and `USE_MOCK_EBAY=false`.

### Storage

- One JSON file per user at `data/{user_id}.json`.
- Schema:

```json
{
  "user_id": "google-oauth-sub-id",
  "email": "user@example.com",
  "postcode": "2033",
  "hourly_rate": 30,
  "gmail_refresh_token": "...",
  "order_history": [
    {
      "id": "uuid",
      "retailer": "shein",
      "title": "Black Ribbed Crop Top",
      "image_url": "https://...",
      "price": 12.99,
      "purchase_date": "2025-03-14",
      "embedding": [0.12, -0.34, ...]  // 512-dim CLIP vector
    }
  ],
  "interceptions": [
    {
      "id": "uuid",
      "item": { "title": "...", "image_url": "...", "price": 45.00, "retailer": "amazon" },
      "intercepted_at": "2026-07-11T14:30:00Z",
      "decision": "release",
      "decided_at": "2026-07-11T15:12:00Z",
      "estimated_savings": { "dollars": 45.00, "kg_co2": 3.2 }
    }
  ],
  "tally": {
    "dollars_saved": 340.00,
    "kg_co2_avoided": 24.5,
    "items_released": 8
  }
}
```

### True Cost Table

`static/true_cost_table.json`:

```json
{
  "fast_fashion_top": { "water_litres": 2700, "kg_co2": 5.5 },
  "jeans": { "water_litres": 7500, "kg_co2": 33.4 },
  "shoes": { "water_litres": 4400, "kg_co2": 14.0 },
  "dress": { "water_litres": 3000, "kg_co2": 8.0 },
  "electronics_small": { "water_litres": 500, "kg_co2": 40.0 },
  "default": { "water_litres": 1500, "kg_co2": 5.0 }
}
```

Sources: cite one credible source in pitch (e.g., WWF, UN Environment). Rough figures are fine.

### Dependencies (`requirements.txt`)

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
sentence-transformers==3.2.0
torch==2.5.0
pillow==11.0.0
numpy==2.1.0
google-auth==2.35.0
google-auth-oauthlib==1.2.1
google-api-python-client==2.149.0
beautifulsoup4==4.12.3
lxml==5.3.0
httpx==0.27.2
python-dotenv==1.0.1
python-multipart==0.0.12
```

### Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://<user>-<space-name>.hf.space/auth/gmail/callback  # exact host verified from live Space
EBAY_CLIENT_ID=            # empty until Production credentials arrive
EBAY_CLIENT_SECRET=        # empty until Production credentials arrive
USE_MOCK_EBAY=true         # flip to false once real credentials work
EXTENSION_ORIGIN=chrome-extension://your-extension-id
FRONTEND_REDIRECT_URL=chrome-extension://your-extension-id/vault.html
```

### Deployment (Hugging Face Spaces, Gradio SDK)

Free-tier constraints ruled out a Docker Space. We deploy as a Gradio Space using Gradio's FastAPI integration, so all the FastAPI endpoints and Pydantic models above stay intact.

**Space creation:**
- Template: Blank
- SDK: Gradio
- Hardware: CPU basic (free tier)
- Dev mode: off (paid feature)
- Storage bucket: not mounted (paid / not needed for demo)
- Privacy: Private during the build, flip to Public before submission if the judges need to see the URL

**app.py (Space entry point):**

Gradio Spaces run whatever is in `app.py`. Wrap the FastAPI app in a small Gradio shell so the Space starts cleanly. Exact syntax to be confirmed by Person C against Gradio's current docs (Gradio's FastAPI mounting API has changed between versions; do not trust generated code without checking the version installed).

Rough shape:

```python
# app.py
import gradio as gr
from main import app as fastapi_app  # your existing FastAPI app

# Minimal Gradio UI so the Space has something to render; judges never see this.
with gr.Blocks() as demo:
    gr.Markdown("# Vault Backend\nThis Space hosts the API. See /docs for endpoints.")

# Mount FastAPI onto the Gradio app. Verify the exact function name and signature
# against the installed Gradio version before writing more code around this.
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")
```

**Persistence:**
- No storage bucket. Per-user JSON files live in the Space's own filesystem under `data/`.
- Seed data (fake order history for the demo user) is committed to the repo and loaded at startup if `data/` is empty.
- The Vault's Reset Demo button re-runs the seeding logic. This is the intended persistence story: seeded state on every fresh start, reset button between rehearsals.
- Do not rely on data written during judging surviving a Space restart. It's not important for the demo.

**Requirements install:**
- `requirements.txt` at the repo root of the Space. HF Spaces installs it on build.
- No manual pip install needed.

**Endpoint URLs:**
- The exact URL structure depends on how `mount_gradio_app` routes. Verify by hitting the deployed Space's `/health` endpoint before wiring the extension against it.
- Expected shape: `https://<user>-<space-name>.hf.space/<endpoint>` for FastAPI routes, but confirm. The extension's `BACKEND_URL` constant should be set to whatever URL actually responds to `/health` on the deployed Space.

**Cold start:**
- Free-tier Spaces sleep after ~48 hours of inactivity. The GitHub Actions keep-alive cron pinging `/health` every 10 minutes handles this.
- First boot after a fresh deploy takes 2-3 minutes because `sentence-transformers` downloads the CLIP model on first import. This is unavoidable on the free tier. Deploy early and warm the Space well before demo time.

**Deploying:**
- Two options: (a) push directly to the Space's git remote (HF gives you a git URL when the Space is created); (b) develop in your main GitHub repo and mirror the `backend/` subdirectory to the Space's repo via a script.
- Option (a) is simpler for the hackathon. Add the HF Space as a second git remote on the backend directory.

**Known unknowns (verify before hour 5):**
- Exact Gradio mount syntax for the current library version.
- Exact public URL shape for FastAPI routes mounted onto a Gradio Space.
- Whether `chrome.identity.getAuthToken` OAuth flows from an extension can call a `hf.space` URL without CORS issues (test with a real request early).

### CORS Config

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],  # tighten to specific ID in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Extension Specification

### Directory Structure

```
extension/
├── manifest.json
├── vite.config.ts
├── package.json
├── src/
│   ├── background.ts        # Service worker
│   ├── content.ts           # Injected into retail sites
│   ├── vault/
│   │   ├── index.html
│   │   ├── main.tsx         # React entry
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── CountdownTimer.tsx
│   │   │   ├── InterceptedItem.tsx
│   │   │   ├── OwnedItemsPanel.tsx
│   │   │   ├── SecondhandPanel.tsx
│   │   │   ├── TrueCostPanel.tsx
│   │   │   ├── DecisionButtons.tsx
│   │   │   ├── ConfettiOverlay.tsx
│   │   │   └── HistoryFeed.tsx
│   │   ├── api/
│   │   │   └── client.ts    # Backend API wrapper
│   │   └── styles.css
│   ├── popup/
│   │   ├── index.html
│   │   └── main.tsx         # Simple settings/auth UI
│   └── shared/
│       ├── storage.ts       # chrome.storage wrappers
│       └── types.ts
└── public/
    └── icons/
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Vault",
  "version": "0.1.0",
  "description": "Interrupts impulse purchases with a mindfulness check.",
  "permissions": ["storage", "tabs", "identity"],
  "host_permissions": [
    "https://*.shein.com/*",
    "https://*.amazon.com.au/*",
    "https://*.hf.space/*"
  ],
  "background": {
    "service_worker": "src/background.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://*.shein.com/checkout/*",
        "https://*.amazon.com.au/gp/buy/*"
      ],
      "js": ["src/content.ts"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/index.html"
  },
  "web_accessible_resources": [
    {
      "resources": ["src/vault/index.html"],
      "matches": ["<all_urls>"]
    }
  ],
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/gmail.readonly"]
  }
}
```

### Checkout Detection Strategy

Two-layer detection. Both layers must fire for interception to trigger.

**Layer 1: URL match (manifest-level filter).** The content script is only injected on URLs matching the manifest's `content_scripts.matches` globs. Everything outside the funnel never even sees our code.

Target URL patterns:
- Shein: `https://*.shein.com/checkout/*` (and any locale-prefixed variants like `/uk/checkout/*`, verify at build time by opening real checkout).
- Amazon AU: `https://www.amazon.com.au/gp/buy/*` (the `/spc/handlers/display.html` is the classic "review and place order" page; broader glob catches variants).

**Layer 2: DOM button presence (runtime detection).** Once injected, the content script uses a `MutationObserver` on `document.body` to watch for the specific "Place Order" / "Place your order" button appearing. Both sites are dynamic and the button may not exist on initial script execution.

Selectors to try (verify all against the live sites at hour 2, these will drift):

- **Shein:** `button[data-btn-name="Place Order"]`, `button.j-place-order`, `.place-order-button-effiency` (Shein has used all three at various points; keep an array of selectors and match the first one found).
- **Amazon AU:** `input[name="placeYourOrder1"]`, `#placeYourOrder`, `#submitOrderButtonId`, `input[aria-labelledby*="submitOrderButton"]` (Amazon varies by cart state, Prime membership, digital vs physical goods; collect variants during testing).

**Interception logic:** every time the observer fires (DOM mutation), check for any matching selector. If the button is found and doesn't already have a `data-vault-attached="true"` marker, attach a capture-phase click listener and set the marker. The capture phase is important: it fires before the site's own click handlers, so `e.preventDefault()` and `e.stopPropagation()` actually stop the purchase.

**What we are NOT trying to do:** we are not trying to answer "is this a checkout page?" as a page-state question. We are trying to answer "did the user just click the button that finalises a purchase?" These are different questions, and the button-click approach handles edge cases (SPA state changes, dynamic re-renders, error retries) automatically.

**Item data extraction:** at the moment of interception (inside the click handler, before opening the Vault), scrape the current cart summary from the DOM:
- Product title(s) from the order summary section.
- Total price from the order total field.
- Primary product image URL from the summary thumbnail.
- Retailer identifier from `window.location.hostname`.

For MVP, if the cart has multiple items, capture the first one for the Vault display. Multi-item cart handling is out of scope.

**Fallback if selectors break during the demo:** keep a "manual trigger" hotkey (e.g. `Cmd+Shift+V`) that fires the interception with hardcoded demo item data. This is not shipped in the pitch but is a safety net if the DOM changes 2 hours before submission. Person B implements this at hour 38 as part of demo prep.



```typescript
// src/content.ts sketch
const SITE_CONFIGS = {
  'shein.com': {
    buttonSelector: 'button[data-btn-name="Place Order"], button.j-place-order',
    itemExtractor: () => ({
      title: document.querySelector('.product-name')?.textContent,
      price: parsePrice(document.querySelector('.total-price')?.textContent),
      imageUrl: document.querySelector('.product-image img')?.src,
      retailer: 'shein'
    })
  },
  'amazon.com.au': { /* ... */ }
};

function getConfig() {
  const host = window.location.hostname;
  return Object.entries(SITE_CONFIGS).find(([domain]) => host.includes(domain))?.[1];
}

function attachInterception() {
  const config = getConfig();
  if (!config) return;
  
  // MutationObserver to survive SPA re-renders
  const observer = new MutationObserver(() => {
    const btn = document.querySelector(config.buttonSelector);
    if (btn && !btn.dataset.vaultAttached) {
      btn.dataset.vaultAttached = 'true';
      btn.addEventListener('click', handleCheckout, { capture: true });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function handleCheckout(e: Event) {
  e.preventDefault();
  e.stopPropagation();
  
  const config = getConfig()!;
  const item = config.itemExtractor();
  
  showToast('Sent to your Vault for a mindfulness check.');
  
  await chrome.runtime.sendMessage({ type: 'INTERCEPT', item });
}

attachInterception();
```

### Background Service Worker

```typescript
// src/background.ts sketch
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === 'INTERCEPT') {
    const interceptionId = crypto.randomUUID();
    
    // Store item in chrome.storage
    const item = { ...msg.item, id: interceptionId, intercepted_at: Date.now() };
    const stored = await chrome.storage.local.get('pending_interceptions');
    const pending = stored.pending_interceptions || [];
    pending.push(item);
    await chrome.storage.local.set({ pending_interceptions: pending });
    
    // Open Vault tab
    const vaultUrl = chrome.runtime.getURL(`src/vault/index.html?id=${interceptionId}`);
    await chrome.tabs.create({ url: vaultUrl });
    
    sendResponse({ ok: true });
  }
});
```

### Vault Dashboard (React)

Key components:

- **CountdownTimer:** Circular SVG countdown with hours/minutes/seconds. Framer Motion for the arc animation. Reads expiry from `chrome.storage.local`.
- **InterceptedItem:** Card showing item photo, title, price, retailer.
- **OwnedItemsPanel:** Grid of 2-3 matched items with similarity badge ("92% match"), purchase date, retailer.
- **SecondhandPanel:** List of eBay listings with photo, price, distance, condition, "View on eBay" link.
- **TrueCostPanel:** Three stats: work hours, water litres, kg CO2. Big numbers, small labels.
- **DecisionButtons:** "Release & Save" (green, prominent) + "Buy Anyway" (grey, subtle). Buy Anyway only logs the decision, no navigation. Timer-locked until expiry unless override enabled.
- **ConfettiOverlay:** Triggered on release. `canvas-confetti` burst + Framer Motion tally increment animation.
- **VaultList:** Vertical scroll list of all pending (undecided) interceptions as cards. Clicking a card opens the full detail view (owned items, secondhand, true cost, decision buttons) for that item.
- **HistoryFeed:** Vertical list of past (decided) interceptions with decision badges, shown below the pending list, with cumulative tally always visible at top.
- **ResetDemoButton:** wipes `chrome.storage.local` and re-seeds the starting demo state (tally, pending items, history). For rehearsal use only, not part of the core product pitch.

Design tokens:

- Primary: warm neutral (`#F5F1EA`), accent green (`#2D6A4F`), warning red (`#BC4749`).
- Font: Inter or similar clean sans-serif. Larger sizes for premium feel (base 16-18px).
- Rounded corners (12-16px), soft shadows, generous whitespace.
- Dark mode not required for MVP.

### API Client

```typescript
// src/vault/api/client.ts sketch
const BACKEND_URL = 'https://your-space.hf.space';  // replace with actual Space URL once deployed

export const api = {
  async getMatches(userId: string, item: InterceptedItem) {
    const res = await fetch(`${BACKEND_URL}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, ...item })
    });
    return res.json();
  },
  async getSecondhand(title: string) { /* ... */ },  // nationwide search, no postcode needed
  async logDecision(userId: string, itemId: string, decision: 'release' | 'buy') { /* ... */ },
  async getTally(userId: string) { /* ... */ },
  async getHistory(userId: string) { /* ... */ },
  async getTrueCost(price: number, category: string, hourlyRate: number) { /* ... */ }
};
```

### Auth Flow

1. User installs extension.
2. First open of popup or Vault: "Sign in with Google" button.
3. Uses `chrome.identity.getAuthToken({ interactive: true })` to get an OAuth token with Gmail scope.
4. Send token to backend `/auth/gmail`. Backend uses it to fetch order history and precompute embeddings.
5. Backend returns `user_id`. Extension stores `user_id` in `chrome.storage.local` for future API calls.

### Dependencies (`package.json`)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tanstack/react-query": "^5.59.0",
    "framer-motion": "^11.11.0",
    "canvas-confetti": "^1.9.3",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.28",
    "@types/chrome": "^0.0.278",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

## Landing Page Specification

- Next.js single-page marketing site.
- Sections: hero (product tagline + demo GIF), problem statement, how it works (3 steps with screenshots), team, "install extension" CTA (link to GitHub for now).
- Hosted at `vault-hackathon.vercel.app` or similar.

## Demo Data Seeding

For the demo, one team member's Gmail must have realistic seeded order history covering categories that will match the demo cart items. Options:

1. **Real seeding:** actually place small orders on Shein/Amazon and let the emails accumulate. (Not recommended, see Locked Decisions above, fake emails via script is the chosen approach.)
2. **Injected seeding:** send crafted "order confirmation" HTML emails to the demo Gmail from a script, matching real retailer email formats. Faster and more controllable.

Prepare at least 15 seeded orders split across both categories (roughly 8-10 fashion items like tops/jeans/shoes from Shein, 5-7 electronics items like headphones/chargers/gadgets from Amazon) so any demo cart item matches convincingly.

## Fallback / Hardcoded Demo Path

If any of the following fails at demo time, have a pre-recorded backup ready:

- Gmail OAuth breaks.
- Retail site DOM changes and selectors don't fire.
- CLIP matching returns poor results for the demo item.
- eBay API rate limits or fails.

Backup plan: a static clone of a Shein or Amazon checkout page hosted locally, with all backend responses mocked to return known-good data. This is the "worst case" demo and should still film cleanly.

## Priority Order (Cut from Bottom If Behind)

1. Checkout interception fires on demo site.
2. Vault dashboard opens with intercepted item visible.
3. "You Already Own" panel shows at least one convincing match.
4. Countdown timer displays.
5. Release & Save button triggers confetti + tally update.
6. Secondhand panel shows real eBay results.
7. Vault list (pending items) and history section (decided items) both render correctly.
8. True Cost panel with work hours + environmental estimate.
9. Buy Anyway button logs decision and moves item to history.
10. Landing page live and polished.

Items 1-5: hero flow, must work.
Items 6-10: nice-to-have, cut ruthlessly if behind at hour 30.

## Explicitly Out of Scope

- Push notifications or email reminders (fake in pitch).
- Cross-posting to Depop/Marketplace/Gumtree.
- Mobile app.
- Real payment integration.
- User accounts beyond Google OAuth.
- SQL database (JSON files fine).
- Multi-user features.
- Production security hardening.
- Full retailer coverage beyond Shein + Amazon.

## Repo Structure (Top Level)

```
vault/
├── README.md
├── backend/          # FastAPI app
├── extension/        # Chrome MV3 extension
├── landing/          # Next.js landing page
├── demo-seeding/     # Scripts to seed demo Gmail
└── .github/
    └── workflows/
        └── keepalive.yml  # HF Spaces ping
```

## README Requirements (For Judges)

- One-paragraph problem statement.
- One-paragraph solution.
- Architecture diagram (ASCII or image).
- Tech stack list.
- Setup instructions per component.
- Team credits.
- Link to demo video.
- Link to landing page.

## Notes for Implementation

- Use type hints throughout Python code; use TypeScript throughout extension.
- Every API endpoint should have Pydantic request/response models.
- Log errors verbosely during dev; downgrade to structured logs for demo.
- CLIP model loading is the slowest cold-start step (~30s). Warm at startup, not per-request.
- Extension IDs change per install in dev mode. Use `chrome.runtime.id` at runtime, not hardcoded.
- Test the extension in a fresh Chrome profile at hour 40 to catch any state-leak bugs.