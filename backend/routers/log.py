import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.storage import storage

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
    user = storage.get_user(body.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="user not found")

    now = datetime.now(timezone.utc).isoformat()
    interception = {
        "id": str(uuid.uuid4()),
        "item": body.item.model_dump(),
        "intercepted_at": now,
        "decision": body.decision,
        "decided_at": now,
        "estimated_savings": body.estimated_savings.model_dump(),
    }
    storage.append_interception(body.user_id, interception)

    if body.decision == "release":
        new_tally = storage.update_tally(
            body.user_id, body.estimated_savings.dollars, body.estimated_savings.kg_co2
        )
    else:
        new_tally = storage.get_user(body.user_id)["tally"]

    return LogResponse(ok=True, new_tally=Tally(**new_tally))
