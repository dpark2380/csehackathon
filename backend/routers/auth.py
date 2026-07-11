from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

router = APIRouter(prefix="/auth")


class GmailAuthRequest(BaseModel):
    user_id: str


class GmailAuthResponse(BaseModel):
    auth_url: str


@router.post("/gmail", response_model=GmailAuthResponse)
def start_gmail_auth(body: GmailAuthRequest) -> GmailAuthResponse:
    # Kick off the Gmail OAuth flow and return the consent URL for the user.
    raise NotImplementedError


@router.get("/gmail/callback", response_class=RedirectResponse)
def gmail_auth_callback(code: str, state: str) -> RedirectResponse:
    # Exchange the OAuth code for tokens and redirect back to the extension.
    raise NotImplementedError
