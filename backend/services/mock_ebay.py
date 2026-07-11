import json
from pathlib import Path

_DATA_PATH = Path(__file__).parent.parent / "static" / "mock_ebay_listings.json"

_FASHION_KEYWORDS = {
    "top", "tee", "shirt", "jeans", "pants", "dress", "skirt", "shoe",
    "sneaker", "hoodie", "jacket", "bag",
}
_ELECTRONICS_KEYWORDS = {
    "earbud", "headphone", "charger", "cable", "speaker", "watch", "mouse",
    "keyboard", "lamp", "fan", "gadget", "usb",
}


class MockEbayService:
    def __init__(self) -> None:
        self._listings: dict[str, list[dict]] | None = None

    def _load(self) -> dict[str, list[dict]]:
        if self._listings is None:
            with open(_DATA_PATH) as f:
                self._listings = json.load(f)
        return self._listings

    def _bucket(self, title: str) -> str:
        lowered = title.lower()
        if any(kw in lowered for kw in _FASHION_KEYWORDS):
            return "fashion"
        if any(kw in lowered for kw in _ELECTRONICS_KEYWORDS):
            return "electronics"
        return "default"

    def search(self, title: str) -> list[dict]:
        listings = self._load()
        return listings[self._bucket(title)]


mock_ebay = MockEbayService()
