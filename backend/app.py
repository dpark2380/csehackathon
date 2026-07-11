# Hugging Face Space entry point (Gradio SDK). Judges never see the Gradio UI;
# it exists so the Space starts cleanly while FastAPI serves the real API.
import gradio as gr

from main import app as fastapi_app

with gr.Blocks() as demo:
    gr.Markdown("# Vault Backend\nThis Space hosts the API. See /docs for endpoints.")

# VERIFIED locally against gradio==6.20.0 (2026-07-11): signature is
# mount_gradio_app(app, blocks, path) -> FastAPI; /health, /docs and /gradio
# all serve correctly under `uvicorn app:app`.
app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")

# TODO(human): still unverified — whether HF's Gradio SDK runner serves this
# module's `app` (FastAPI routes at the Space root) or only launches `demo`.
# Verify by hitting /health on the deployed Space before wiring the
# extension's BACKEND_URL.
