from fastapi import APIRouter
from pydantic import BaseModel

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
    # Search secondhand marketplaces for listings matching the item title.
    raise NotImplementedError
