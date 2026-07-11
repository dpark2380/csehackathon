import os

from fastapi import APIRouter
from pydantic import BaseModel

from services.mock_ebay import mock_ebay

router = APIRouter()


class SecondhandRequest(BaseModel):
    title: str


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
        from services.ebay_service import EbayService

        listings = EbayService().search(body.title)
    return SecondhandResponse(listings=listings)
