import base64
import os
import time

import httpx

TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
SCOPE = "https://api.ebay.com/oauth/api_scope"


class EbayService:
    def __init__(self):
        self._token: str | None = None
        self._token_expires: float = 0.0

    def _get_token(self) -> str:
        # Client-credentials token, cached until ~60s before its TTL runs out.
        if self._token and time.time() < self._token_expires - 60:
            return self._token
        auth = base64.b64encode(
            f"{os.environ['EBAY_CLIENT_ID']}:{os.environ['EBAY_CLIENT_SECRET']}".encode()
        ).decode()
        resp = httpx.post(
            TOKEN_URL,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials", "scope": SCOPE},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]
        self._token_expires = time.time() + int(data.get("expires_in", 7200))
        return self._token

    def search(self, title: str, max_price: float | None = None) -> list[dict]:
        # Prefer genuinely secondhand results; some items have no used market
        # (e.g. cheap stationery), so fall back to the spec's any-condition filter.
        # The fallback trigger checks max_price too: a thin used market often returns
        # 1-2 results priced near retail, which then all get filtered out by the
        # router's >=10%-cheaper cap downstream. Falling back only on a truly empty
        # used search (the old behaviour) meant those cases silently returned nothing
        # even when cheaper any-condition listings existed.
        listings = self._search(title, used_only=True)
        survives_cap = [l for l in listings if max_price is None or l["price"] <= max_price]
        if not survives_cap:
            listings = self._search(title, used_only=False)
        return listings

    def _search(self, title: str, used_only: bool) -> list[dict]:
        filters = "buyingOptions:{FIXED_PRICE},itemLocationCountry:AU"
        if used_only:
            filters += ",conditions:{USED}"
        resp = httpx.get(
            SEARCH_URL,
            params={"q": title, "filter": filters, "limit": 10},
            headers={
                "Authorization": f"Bearer {self._get_token()}",
                "X-EBAY-C-MARKETPLACE-ID": "EBAY_AU",
            },
            timeout=15,
        )
        resp.raise_for_status()
        results = []
        for it in resp.json().get("itemSummaries", [])[:5]:
            loc = it.get("itemLocation") or {}
            location = ", ".join(p for p in [loc.get("city"), loc.get("stateOrProvince")] if p)
            results.append(
                {
                    "title": it.get("title", ""),
                    "price": float((it.get("price") or {}).get("value", 0)),
                    "image_url": ((it.get("image") or {}).get("imageUrl", "")),
                    "url": it.get("itemWebUrl", ""),
                    "condition": it.get("condition", "Used"),
                    "location": location or "Australia",
                }
            )
        return results


ebay_service = EbayService()
