from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class MatchRequest(BaseModel):
    user_id: str
    image_url: str
    title: str
    category: str


class MatchItem(BaseModel):
    image_url: str
    title: str
    purchase_date: str
    retailer: str
    similarity: float


class MatchResponse(BaseModel):
    matches: list[MatchItem]


@router.post("/match", response_model=MatchResponse)
def match_item(body: MatchRequest) -> MatchResponse:
    # Find prior purchases visually/textually matching the given item.
    raise NotImplementedError
