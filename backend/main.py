from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers import auth, log, match, secondhand, user
from services.storage import storage


@asynccontextmanager
async def lifespan(app: FastAPI):
    # HF Space filesystem is ephemeral: restore committed demo seed on fresh start.
    storage.seed_if_empty()
    # CLIP model load is the slowest cold-start step (~30s): warm at startup, not per-request.
    from services.clip_service import clip_service

    clip_service.warm()
    yield


app = FastAPI(title="Vault Backend", lifespan=lifespan)

# Spec's allow_origins=["chrome-extension://*"] doesn't work: Starlette doesn't
# expand wildcards inside origin entries. Regex form approved instead.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"chrome-extension://.*",  # tighten to specific ID in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(match.router)
app.include_router(secondhand.router)
app.include_router(log.router)
app.include_router(user.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
