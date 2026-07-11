from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


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
    raise NotImplementedError


@router.get("/history", response_model=HistoryResponse)
def get_history(user_id: str) -> HistoryResponse:
    # Return the user's full interception history.
    raise NotImplementedError


@router.post("/true-cost", response_model=TrueCostResponse)
def compute_true_cost(body: TrueCostRequest) -> TrueCostResponse:
    # Compute the true cost (work hours, water, CO2) of a purchase.
    raise NotImplementedError
