import base64
import json
import os
import secrets
import uuid
from urllib.parse import urlencode

import httpx

from parsers import amazon, shein
from services.storage import storage

GMAIL_QUERY = "from:(noreply@shein.com OR auto-confirm@amazon.com.au) newer_than:180d"
# openid+email so the callback can derive user_id from the Google `sub` claim.
SCOPES = "openid email https://www.googleapis.com/auth/gmail.readonly"

# In-memory state store: fine for MVP (single process, states live for one auth round-trip).
_pending_states: set[str] = set()


class GmailService:
    def get_auth_url(self, user_id: str) -> str:
        # user_id from the extension is ignored: the real id is Google's `sub`, known only after auth.
        state = secrets.token_urlsafe(16)
        _pending_states.add(state)
        params = {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline",
            "prompt": "consent",  # force refresh_token issuance on re-auth
            "state": state,
        }
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)

    def handle_callback(self, code: str, state: str) -> dict:
        if state not in _pending_states:
            raise ValueError("unknown or reused OAuth state")
        _pending_states.discard(state)

        token_resp = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": os.environ["GOOGLE_CLIENT_ID"],
                "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
                "grant_type": "authorization_code",
            },
            timeout=15,
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()

        # Google's granular consent lets users untick individual scopes; without
        # gmail.readonly the sync 403s, so fail loud and early with instructions.
        if "gmail.readonly" not in tokens.get("scope", ""):
            raise ValueError(
                "Gmail access not granted: redo the consent and TICK the "
                "'View your email messages and settings' checkbox"
            )

        # Decode id_token payload without signature verification: token came straight
        # from Google over TLS in a server-to-server exchange. MVP-acceptable.
        payload_b64 = tokens["id_token"].split(".")[1]
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + "=" * (-len(payload_b64) % 4)))

        user_id = payload["sub"]
        user = storage.get_user(user_id) or {
            "user_id": user_id,
            "email": payload.get("email", ""),
            "postcode": "2033",
            "hourly_rate": 30,
            "gmail_refresh_token": "",
            "order_history": [],
            "interceptions": [],
            "tally": {"dollars_saved": 0.0, "kg_co2_avoided": 0.0, "items_released": 0},
        }
        if tokens.get("refresh_token"):
            user["gmail_refresh_token"] = tokens["refresh_token"]
        storage.save_user(user)
        return user

    def fetch_order_emails(self, user_id: str) -> list[dict]:
        # Heavy google client imports kept out of module scope so the app boots light.
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        user = storage.get_user(user_id)
        if not user or not user.get("gmail_refresh_token"):
            raise ValueError(f"no gmail refresh token for user {user_id}")

        creds = Credentials(
            token=None,
            refresh_token=user["gmail_refresh_token"],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.environ["GOOGLE_CLIENT_ID"],
            client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        )
        gmail = build("gmail", "v1", credentials=creds, cache_discovery=False)

        ids = [
            m["id"]
            for m in gmail.users()
            .messages()
            .list(userId="me", q=GMAIL_QUERY, maxResults=50)
            .execute()
            .get("messages", [])
        ]

        items: list[dict] = []
        for msg_id in ids:
            msg = gmail.users().messages().get(userId="me", id=msg_id, format="full").execute()
            headers = {h["name"].lower(): h["value"] for h in msg["payload"].get("headers", [])}
            html = self._extract_html(msg["payload"])
            if not html:
                continue
            sender = headers.get("from", "")
            if "shein.com" in sender:
                items.extend(shein.parse(html))
            elif "amazon" in sender:
                items.extend(amazon.parse(html))
        return items

    def sync_order_history(self, user_id: str) -> None:
        from services.clip_service import clip_service

        user = storage.get_user(user_id)
        if not user:
            raise ValueError(f"unknown user {user_id}")

        order_history = []
        for item in self.fetch_order_emails(user_id):
            try:
                embedding = clip_service.encode_image_url(item["image_url"]).tolist()
            except Exception:
                embedding = None  # unfetchable image: item stays visible, just unmatchable
            order_history.append({"id": str(uuid.uuid4()), **item, "embedding": embedding})

        user["order_history"] = order_history
        storage.save_user(user)

    def _extract_html(self, payload: dict) -> str | None:
        # Walk MIME tree for the first text/html part.
        if payload.get("mimeType") == "text/html" and payload.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", "replace")
        for part in payload.get("parts", []):
            html = self._extract_html(part)
            if html:
                return html
        return None


gmail_service = GmailService()
