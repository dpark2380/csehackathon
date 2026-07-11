# Demo Seeding

Seeds 15 fake Shein/Amazon order-confirmation emails into the demo Gmail (csehackathon0@gmail.com) via the Gmail API.

Run `python seed_gmail.py --dry-run` to preview the rendered emails in `out/` without touching Gmail.
Run `python seed_gmail.py` to actually seed — this opens a browser for OAuth consent as csehackathon0@gmail.com (the web OAuth client must have `http://localhost:8765/` in its authorized redirect URIs).
Credentials are cached in `token.json` (gitignored) and reused/refreshed on subsequent runs.
