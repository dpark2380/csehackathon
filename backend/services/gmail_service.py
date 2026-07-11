class GmailService:
    def get_auth_url(self, user_id: str) -> str:
        # build Google OAuth consent URL (gmail.readonly scope)
        raise NotImplementedError

    def handle_callback(self, code: str, state: str) -> dict:
        # exchange code, store refresh token, return user record
        raise NotImplementedError

    def fetch_order_emails(self, user_id: str) -> list[dict]:
        # query from:(noreply@shein.com OR auto-confirm@amazon.com.au) newer_than:180d, dispatch to parsers.shein/parsers.amazon by sender
        raise NotImplementedError

    def sync_order_history(self, user_id: str) -> None:
        # parse emails, precompute CLIP embeddings, store on user record
        raise NotImplementedError
