import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from services.gmail_service import gmail_service

router = APIRouter(prefix="/auth")


class GmailAuthRequest(BaseModel):
    user_id: str


class GmailAuthResponse(BaseModel):
    auth_url: str


@router.post("/gmail", response_model=GmailAuthResponse)
def start_gmail_auth(body: GmailAuthRequest) -> GmailAuthResponse:
    return GmailAuthResponse(auth_url=gmail_service.get_auth_url(body.user_id))


@router.get("/gmail/callback", response_class=RedirectResponse)
def gmail_auth_callback(code: str, state: str) -> RedirectResponse:
    try:
        user = gmail_service.handle_callback(code, state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Synchronous on purpose: by the time the Vault opens, embeddings exist and /match works.
    gmail_service.sync_order_history(user["user_id"])
    redirect_base = os.environ.get("FRONTEND_REDIRECT_URL", "/docs")
    return RedirectResponse(f"{redirect_base}?user_id={user['user_id']}")
