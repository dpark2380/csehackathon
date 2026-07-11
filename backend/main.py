from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, log, match, secondhand, user

app = FastAPI(title="Vault Backend")

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
