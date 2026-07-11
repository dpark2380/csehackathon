from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class Item(BaseModel):
    title: str
    image_url: str
    price: float
    retailer: str


class EstimatedSavings(BaseModel):
    dollars: float
    kg_co2: float


class LogRequest(BaseModel):
    user_id: str
    item: Item
    decision: Literal["release", "buy"]
    estimated_savings: EstimatedSavings


class Tally(BaseModel):
    dollars_saved: float
    kg_co2_avoided: float
    items_released: int


class LogResponse(BaseModel):
    ok: bool
    new_tally: Tally


@router.post("/log", response_model=LogResponse)
def log_decision(body: LogRequest) -> LogResponse:
    # Record the user's release/buy decision and update their running tally.
    raise NotImplementedError
