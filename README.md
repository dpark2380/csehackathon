# impulse

**A Chrome extension that catches impulse purchases at the exact moment they happen.**
UNSW Hackathon 2026.

When you click *Place Order* on Shein or Amazon AU, impulse intercepts the purchase and holds it for 24 hours. While it waits, it shows you what you already own that looks the same (CLIP visual matching against your real order history), the same item secondhand on eBay for at least 10% less, and what the purchase really costs in work hours, water, and CO₂. Then you decide: release the money back to your future, or buy it anyway.

## The problem

Consumerism happens at the checkout moment. Downstream fixes (recycling, resale) process waste that has already been manufactured and shipped. The most sustainable product is the one never bought — but nothing intervenes at the instant of the purchase decision, when a pause would matter most.

## The solution

impulse intervenes exactly there. It blocks the finalising click, opens a full-page dashboard, and applies behavioural friction: a countdown hold, visual proof you already own similar things (from your actual Gmail order history), cheaper secondhand alternatives, and the true cost of the item reframed in hours of your life. Buying is still your choice — impulse just makes it a conscious one, and keeps score of the money you released.

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Chrome Extension (MV3, React + Vite)                          │
│                                                                 │
│  content.ts ────────▶ background.ts ────────▶ impulse dashboard │
│  (intercepts the      (service worker:        (list/detail,     │
│   Place Order click,   stores interceptions,   countdown, decide,│
│   scrapes cart items)  opens the dashboard)    spending, settings)│
└────────────────────────────────┬────────────────────────────────┘
                                 │ REST
                                 ▼
                  ┌──────────────────────────────┐
                  │  FastAPI backend             │
                  │  /auth/gmail   OAuth + sync   │
                  │  /match        CLIP matching  │
                  │  /categorize   CLIP zero-shot │
                  │  /secondhand   eBay Browse    │
                  │  /true-cost    lookup table   │
                  │  /log /tally /history         │
                  └───────┬──────────┬───────────┘
                          ▼          ▼
                  Gmail API      eBay Browse API      JSON file store
                  (order emails) (live AU listings)   (per-user data)
```

## Tech stack

| Layer | Tech |
|---|---|
| Extension | Chrome Manifest V3, Vite + @crxjs, React 18, TypeScript, Tailwind (CSS custom-property theming, light/dark, WCAG AA), TanStack Query, Framer Motion, canvas-confetti |
| Backend | FastAPI (Python 3.11+), deployed as a Hugging Face Space (Gradio wrapper) |
| ML | CLIP (`clip-ViT-B-32` via sentence-transformers): visual similarity matching + zero-shot product categorisation |
| APIs | Gmail API (OAuth 2.0, read-only), eBay Browse API (client credentials, `EBAY_AU`) |
| Storage | Per-user JSON files backend-side; `chrome.storage.local` extension-side |

## Setup

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in Google + eBay credentials
uvicorn main:app --reload --port 8000
```

Check `http://localhost:8000/health` returns `{"status":"ok"}`. Interactive API docs at `/docs`. First boot downloads the CLIP model (~600 MB, one-off). Set `USE_MOCK_EBAY=true` to run without eBay credentials (curated fake listings).

### Extension

```bash
cd extension
npm install
npm run build
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `extension/dist`. On the extension's Details page, make sure the per-site access toggles (shein.com, amazon.com.au, localhost) are on. After any rebuild, hit the refresh arrow on the extension card and reload open tabs.

### Demo email seeding (optional, powers "You already own")

```bash
cd demo-seeding
../backend/.venv/bin/python seed_gmail.py --dry-run   # preview the 15 fake order emails
../backend/.venv/bin/python seed_gmail.py             # insert into the demo Gmail (browser consent)
```

### Risk-free checkout test page

```bash
cd extension/test-checkout && python3 -m http.server 9999
```

Open `http://localhost:9999` — a fake multi-item checkout with real markup. Click **PLACE ORDER** to exercise the whole pipeline with zero purchase risk.

## Using impulse

1. **Sign in** — click the impulse toolbar icon → *Sign in with Google*. This syncs your order-confirmation emails and builds your visual purchase history (read-only Gmail access; the backend keeps a refresh token, your password is never seen).
2. **Shop normally** — on Shein or Amazon AU, add to cart and check out as usual.
3. **The intercept** — clicking *Place Order* is blocked, a toast confirms, and the impulse dashboard opens with your cart held: every item listed with its price, quantity, and product category.
4. **The hold** — a countdown (default 24h, configurable) runs. *Release & Save* is always available. *Buy Anyway* unlocks when time runs out — or early, if you write down who the purchase is for and why it can't wait.
5. **Decide** —
   - **Release & Save**: confetti, and your tally ($ saved, kg CO₂ avoided, items released) goes up.
   - **Buy Anyway**: the purchase is recorded, the original checkout reopens in a new tab, and interception pauses for 30 minutes so you can complete it.
6. **Review** — the **Spending** tab shows money spent anyway: a category donut, every item you bought with prices, and how each purchase happened (after the timer, early bypass, or whitelisted).

### Settings

| Setting | What it does |
|---|---|
| Decision time | Hours an item is held before Buy Anyway unlocks (applies to existing holds too) |
| Minimum price to block | Carts under this total pass through untouched |
| Whitelisted categories | Electronics, Clothes, Essentials, Toys, Home, Office, Pet supplies, Other — orders made up entirely of ticked categories are never held (but still recorded) |
| Theme | System / Light / Dark, applies instantly |
| Hourly rate | Powers the "hours of your work" true-cost stat |
| Reset Demo Data | (popup) restores the seeded demo state |

## Repo layout

```
backend/        FastAPI app, CLIP services, parsers, JSON storage
extension/      Chrome MV3 extension (React dashboard, content/background scripts)
demo-seeding/   Fake order-confirmation email generator + Gmail injector
landing/        Marketing site (Next.js)
```

## Team

Built in 42 hours at UNSW Hackathon 2026 by Daniel Park, Wilson Zhang, James Li & Jimmy Yang.

- Demo video: *coming soon*
- Landing page: [here!](https://dpark2380.github.io/csehackathon/)
