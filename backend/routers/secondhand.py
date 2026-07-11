import os

from fastapi import APIRouter
from pydantic import BaseModel

from services.mock_ebay import mock_ebay

router = APIRouter()


class SecondhandRequest(BaseModel):
    title: str
    # Price of the item being bought: listings must undercut it by >= 10% to be shown.
    item_price: float | None = None


class SecondhandListing(BaseModel):
    title: str
    price: float
    image_url: str
    url: str
    condition: str
    location: str


class SecondhandResponse(BaseModel):
    listings: list[SecondhandListing]


@router.post("/secondhand", response_model=SecondhandResponse)
def find_secondhand_listings(body: SecondhandRequest) -> SecondhandResponse:
    use_mock = os.getenv("USE_MOCK_EBAY", "true").lower() == "true"
    if use_mock:
        listings = mock_ebay.search(body.title)
    else:
        # Module singleton so the OAuth token cache survives across requests.
        from services.ebay_service import ebay_service

        listings = ebay_service.search(body.title)
    if body.item_price and body.item_price > 0:
        cap = body.item_price * 0.9
        listings = [l for l in listings if l["price"] <= cap]
    return SecondhandResponse(listings=listings)
