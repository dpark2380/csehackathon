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

## What's built vs unbuilt

Update this section as work progresses so future Claude Code sessions have context on where things stand.

- [x] Backend skeleton and endpoints (all stubs raise NotImplementedError; /health works; Gradio mount syntax in app.py unverified — TODOs inline)
- [x] Gmail OAuth flow (web-redirect flow verified end-to-end 2026-07-11 with csehackathon0@gmail.com; user 105271286011729160573 synced 15 items with embeddings; /match verified on real data. Demo-day trap: consent screen's per-scope Gmail checkbox MUST be ticked — backend 400s with instructions if not)
- [x] CLIP matching pipeline (/match verified end-to-end with real embeddings; warmed at startup via lifespan; seed order_history embeddings still null so /match returns [] until Gmail sync or a backfill script fills them)
- [x] Storage (JSON per user), /log /tally /history /true-cost implemented + verified; startup seeding from seed/demo_user.json (order_history embeddings still null — filled by Gmail sync later)
- [x] eBay mock path (/secondhand + USE_MOCK_EBAY dispatch) — listing data is placeholder, needs human curation; live ebay_service.py pending Production credentials
- [x] Extension shell (manifest, content script, background) — live Shein AU interception verified 2026-07-11: checkout renders in same-origin iframes (all_frames:true required), synthetic preload clicks filtered via isTrusted, deep scanner (shadow DOM + "place order" text fallback), extraction selectors verified against live checkout (order total + carousel img alt). Amazon AU verified live 2026-09-11 (row selector [data-csa-c-slot-id="checkout-item-block-itemBlock"], qty from "Change quantity of…" pattern). Multi-item carts fully itemised (per-item price + quantity, team-approved spec override); Vault shows order total first, then per-item list.
- [x] Vault dashboard UI (list/detail, countdown, decisions, confetti, popup with Reset Demo Data; demo seed = 1 ticking + 1 expired item)
- [x] Buy Anyway extensions (team-approved deviations from the spec's "log only" lock, 2026-09-11): checkout URL saved at interception + "Resume checkout" link in history; 30-min per-retailer interception pass after Buy Anyway so the purchase can complete; early-unlock bypass for time-sensitive buys gated by a written justification (≥20 chars, stored locally only, never sent to backend); "$X bought anyway this month" stat computed from history
- [ ] Landing page
- [x] Demo seeding script (demo-seeding/: 15 emails inserted via Gmail API messages.insert with backdated internal dates; parsers round-trip verified; re-run `seed_gmail.py` to re-seed)
- [ ] HF Spaces deployment