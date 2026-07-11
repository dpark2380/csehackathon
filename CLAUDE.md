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
- [ ] Gmail OAuth flow
- [ ] CLIP matching pipeline
- [ ] eBay Browse integration
- [ ] Extension shell (manifest, content script, background)
- [ ] Vault dashboard UI
- [ ] Landing page
- [ ] Demo seeding script
- [ ] HF Spaces deployment