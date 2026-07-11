import argparse
import base64
import datetime
import os
import sys
from email.mime.text import MIMEText
from email.utils import format_datetime

from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
from items import ITEMS
from templates import render_amazon, render_shein

DEMO_TO = "csehackathon0@gmail.com"
SCOPES = ["https://www.googleapis.com/auth/gmail.insert"]
HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN_PATH = os.path.join(HERE, "token.json")
OUT_DIR = os.path.join(HERE, "out")


def render(item: dict) -> str:
    return render_shein(item) if item["retailer"] == "shein" else render_amazon(item)


def build_message(item: dict, html: str) -> bytes:
    if item["retailer"] == "shein":
        sender = "SHEIN <noreply@shein.com>"
        subject = f"Your SHEIN order {item['order_number']} has been confirmed"
    else:
        sender = "Amazon.com.au <auto-confirm@amazon.com.au>"
        subject = f"Your Amazon.com.au order {item['order_number']} of \"{item['title']}\""

    msg = MIMEText(html, "html")
    msg["From"] = sender
    msg["To"] = DEMO_TO
    msg["Subject"] = subject
    order_dt = datetime.datetime.strptime(item["order_date"], "%Y-%m-%d").replace(
        tzinfo=datetime.timezone.utc
    )
    msg["Date"] = format_datetime(order_dt)
    return msg.as_bytes()


def get_credentials():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            load_dotenv(os.path.join(HERE, "..", "backend", ".env"))
            client_config = {
                "installed": {
                    "client_id": os.environ["GOOGLE_CLIENT_ID"],
                    "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": ["http://localhost:8765/"],
                }
            }
            flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
            creds = flow.run_local_server(port=8765)
        with open(TOKEN_PATH, "w") as f:
            f.write(creds.to_json())
    return creds


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        os.makedirs(OUT_DIR, exist_ok=True)
        for i, item in enumerate(ITEMS):
            html = render(item)
            path = os.path.join(OUT_DIR, f"{item['retailer']}_{i}.html")
            with open(path, "w") as f:
                f.write(html)
        print(f"Wrote {len(ITEMS)} emails to {OUT_DIR}")
        return

    from googleapiclient.discovery import build

    creds = get_credentials()
    service = build("gmail", "v1", credentials=creds)

    for item in ITEMS:
        html = render(item)
        raw = base64.urlsafe_b64encode(build_message(item, html)).decode()
        service.users().messages().insert(
            userId="me",
            body={"raw": raw, "labelIds": ["INBOX"]},
            internalDateSource="dateHeader",
        ).execute()
        print(f"Inserted {item['retailer']} {item['order_number']}")

    print(f"Seeded {len(ITEMS)} emails into {DEMO_TO}")


if __name__ == "__main__":
    main()
