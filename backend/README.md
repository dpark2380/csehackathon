# Vault Backend

FastAPI backend for the Vault Chrome extension (checkout interceptor).

## Local setup

Create a virtual environment with Python 3.11+:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

## Run locally

Start the development server:

```bash
uvicorn main:app --reload --port 8000
```

Verify health check at `http://localhost:8000/health` returns `{"status": "ok"}`. API docs available at `http://localhost:8000/docs`.

## Deployment

Deployed as a Hugging Face Space using Gradio SDK on CPU basic free tier. The `app.py` file is the Space entry point and mounts the FastAPI app via Gradio. To deploy, push the `backend/` directory to the Space's git remote. Note that the first boot takes 2–3 minutes while the CLIP model downloads.
