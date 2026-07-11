# CLAUDE.md

## Ground rules for this project

- Read PROJECT_SPEC.md before making any decisions. It is the source of truth.
- Do not add features, tests, linting, strict TypeScript config, or dependencies beyond what's specified in PROJECT_SPEC.md.
- If something is ambiguous, ask before deciding. Do not silently pick an option.
- If you disagree with a choice in the spec, flag it in your response but do not override it. Wait for human confirmation.
- Prefer the simplest working implementation. This is a 42-hour hackathon, not a production system.
- Match existing code style within each subdirectory. Do not reformat files unrelated to the current task.
- When creating files, place them in the exact paths specified in PROJECT_SPEC.md's directory structures.
- Do not run `git commit` unless explicitly asked.
- Do not add license headers, extensive docstrings, or exhaustive error handling. Keep code compact.

## Stack summary (see PROJECT_SPEC.md for detail)

- Backend: FastAPI on Hugging Face Spaces, JSON file storage, CLIP via sentence-transformers.
- Extension: Chrome MV3, Vite + @crxjs/vite-plugin, React + Tailwind, Framer Motion, canvas-confetti.
- Landing page: Next.js on Vercel.

## Product name

Rebranded "Vault" → **impulse** (lowercase i) on 2026-09-11. All user-visible strings renamed; internal identifiers (VaultStorage, VaultMessage, vault/ dirs, chrome.storage keys) intentionally keep the old name — cosmetic rename only, per spec. Logo pending: goes in extension/public/icons/ (manifest icons + action.default_icon + tab favicon).

## Design principles (from the team's reference screenshots, repo root)

Applied across the extension UI 2026-09-11 — keep new UI consistent with these:
1. **Limited palette, 60-30-10**: cool off-white/white base (60), near-black ink + cool grays (30), ONE interactive blue + periwinkle tint, danger red sparingly (10). No new hues in UI chrome (charts excepted: categorical color has a data job). NOTE: the Tailwind class `forest` is a legacy alias that resolves to the blue accent token; prefer `accent` in new code.
2. **One font, few weights**: Inter only; semibold for headings/values, medium for buttons/labels, regular body. No font-bold.
3. **Generous spacing**: cards p-5/p-6, list gap-4; don't cram.
4. **Borders over shadows**: cards are bg-white + border-gray-200 hairline; hover = border-gray-300, not shadow. Only true overlays may elevate.
5. **No decorative background shapes.**
Theming: all colors via CSS custom properties in extension/src/vault/theme.css (light/dark/system, WCAG AA verified). New components must use the token-mapped Tailwind colors, never raw hex.

## What's built vs unbuilt

Update this section as work progresses so future Claude Code sessions have context on where things stand.

- [x] Backend skeleton and endpoints (all stubs raise NotImplementedError; /health works; Gradio mount syntax in app.py unverified — TODOs inline)
- [x] Gmail OAuth flow (web-redirect flow verified end-to-end 2026-07-11 with csehackathon0@gmail.com; user 105271286011729160573 synced 15 items with embeddings; /match verified on real data. Demo-day trap: consent screen's per-scope Gmail checkbox MUST be ticked — backend 400s with instructions if not)
- [x] CLIP matching pipeline (/match verified end-to-end with real embeddings; warmed at startup via lifespan; seed order_history embeddings still null so /match returns [] until Gmail sync or a backfill script fills them)
- [x] Storage (JSON per user), /log /tally /history /true-cost implemented + verified; startup seeding from seed/demo_user.json (order_history embeddings still null — filled by Gmail sync later)
- [x] CLIP concurrency fix: torch encode segfaults under FastAPI's thread pool on macOS — all model use serialized behind threading.Lock in clip_service (crashed live when the Vault fired /match+/categorize+/secondhand in parallel)
- [x] Secondhand v2: listings must be >=10% cheaper than the item (router-level cap, applies to mock too; honest empty state otherwise); multi-item orders get per-line-item searches (max 4) grouped in the panel
- [x] Spending tracker v2: donut (validated palette) + "How it was bought" breakdown (after timer / early bypass / whitelisted); whitelisted passthroughs now recorded to history via PASSTHROUGH message at click time; demo seed has 7 bought-anyway items across categories
- [x] eBay LIVE path verified 2026-09-11 (USE_MOCK_EBAY=false): client-credentials token w/ TTL cache, Browse item_summary/search EBAY_AU, used-only filter with any-condition fallback when no used market exists (spec deviation, flagged). Mock path kept as demo fallback — flip USE_MOCK_EBAY=true if the API misbehaves at demo time. Keyset needed the "no eBay user data" compliance exemption.
- [x] Extension shell (manifest, content script, background) — live Shein AU interception verified 2026-07-11: checkout renders in same-origin iframes (all_frames:true required), synthetic preload clicks filtered via isTrusted, deep scanner (shadow DOM + "place order" text fallback), extraction selectors verified against live checkout (order total + carousel img alt). Amazon AU verified live 2026-09-11 (row selector [data-csa-c-slot-id="checkout-item-block-itemBlock"], qty from "Change quantity of…" pattern). Multi-item carts fully itemised (per-item price + quantity, team-approved spec override); Vault shows order total first, then per-item list.
- [x] Vault dashboard UI (list/detail, countdown, decisions, confetti, popup with Reset Demo Data; demo seed = 1 ticking + 1 expired item)
- [x] Settings tab (decision time hours, category whitelist, min block price, hourly rate), Spending tracker tab (week/month/year, donut by broad category, CVD-validated palette), broad categories via CLIP zero-shot: backend POST /categorize (clip_service.classify_image_url, threshold 0.2, 'unknown' on any failure), called fire-and-forget from background.ts at interception; keyword fallback only for legacy items
- [x] Buy Anyway extensions (team-approved deviations from the spec's "log only" lock, 2026-09-11): checkout URL saved at interception + "Resume checkout" link in history; 30-min per-retailer interception pass after Buy Anyway so the purchase can complete; early-unlock bypass for time-sensitive buys gated by a written justification (≥20 chars, stored locally only, never sent to backend); "$X bought anyway this month" stat computed from history
- [ ] Landing page
- [x] Demo seeding script (demo-seeding/: 15 emails inserted via Gmail API messages.insert with backdated internal dates; parsers round-trip verified; re-run `seed_gmail.py` to re-seed)
- [ ] HF Spaces deployment