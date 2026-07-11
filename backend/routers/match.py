from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.clip_service import clip_service
from services.storage import storage

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
    # Find prior purchases visually matching the given item.
    user = storage.get_user(body.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # category is accepted but intentionally not used: pure visual similarity across all owned items.
    corpus = [item for item in user.get("order_history", []) if item.get("embedding") is not None]
    if not corpus:
        return MatchResponse(matches=[])

    try:
        matches = clip_service.top_k_matches(body.image_url, corpus, k=3)
    except Exception:
        raise HTTPException(status_code=422, detail="Failed to encode query image")

    return MatchResponse(
        matches=[
            MatchItem(
                image_url=m.get("image_url", ""),
                title=m.get("title", ""),
                purchase_date=m.get("purchase_date", ""),
                retailer=m.get("retailer", ""),
                similarity=m["similarity"],
            )
            for m in matches
        ]
    )
