import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.storage import storage

router = APIRouter()

_TRUE_COST_TABLE: dict = json.loads(
    (Path(__file__).resolve().parent.parent / "static" / "true_cost_table.json").read_text()
)


class TallyResponse(BaseModel):
    dollars_saved: float
    kg_co2_avoided: float
    items_released: int


class Item(BaseModel):
    title: str
    image_url: str
    price: float
    retailer: str


class EstimatedSavings(BaseModel):
    dollars: float
    kg_co2: float


class Interception(BaseModel):
    id: str
    item: Item
    intercepted_at: str
    decision: str | None
    decided_at: str | None
    estimated_savings: EstimatedSavings | None


class HistoryResponse(BaseModel):
    interceptions: list[Interception]


class TrueCostRequest(BaseModel):
    price: float
    category: str
    hourly_rate: float


class TrueCostResponse(BaseModel):
    work_hours: float
    water_litres: float
    kg_co2: float


@router.get("/tally", response_model=TallyResponse)
def get_tally(user_id: str) -> TallyResponse:
    # Return the user's cumulative savings and released-item tally.
    user = storage.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return TallyResponse(**user["tally"])


@router.get("/history", response_model=HistoryResponse)
def get_history(user_id: str) -> HistoryResponse:
    # Return the user's full interception history.
    user = storage.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")
    return HistoryResponse(interceptions=user["interceptions"])


@router.post("/true-cost", response_model=TrueCostResponse)
def compute_true_cost(body: TrueCostRequest) -> TrueCostResponse:
    # Compute the true cost (work hours, water, CO2) of a purchase.
    if body.hourly_rate <= 0:
        raise HTTPException(status_code=422, detail="hourly_rate must be positive")
    entry = _TRUE_COST_TABLE.get(body.category, _TRUE_COST_TABLE["default"])
    work_hours = round(body.price / body.hourly_rate, 1)
    return TrueCostResponse(
        work_hours=work_hours,
        water_litres=entry["water_litres"],
        kg_co2=entry["kg_co2"],
    )
