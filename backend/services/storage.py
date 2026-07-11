import json
from pathlib import Path


class Storage:
    def __init__(self, data_dir: str | Path | None = None):
        self.data_dir = Path(data_dir) if data_dir else Path(__file__).resolve().parent.parent / "data"
        self.seed_dir = Path(__file__).resolve().parent.parent / "seed"
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, user_id: str) -> Path:
        return self.data_dir / f"{user_id}.json"

    def get_user(self, user_id: str) -> dict | None:
        path = self._path(user_id)
        if not path.exists():
            return None
        return json.loads(path.read_text())

    def save_user(self, user: dict) -> None:
        self._path(user["user_id"]).write_text(json.dumps(user, indent=2))

    def update_tally(self, user_id: str, dollars: float, kg_co2: float) -> dict:
        user = self.get_user(user_id)
        tally = user["tally"]
        tally["dollars_saved"] = round(tally["dollars_saved"] + dollars, 2)
        tally["kg_co2_avoided"] = round(tally["kg_co2_avoided"] + kg_co2, 1)
        tally["items_released"] += 1
        self.save_user(user)
        return tally

    def append_interception(self, user_id: str, interception: dict) -> None:
        user = self.get_user(user_id)
        user["interceptions"].append(interception)
        self.save_user(user)

    def seed_if_empty(self) -> None:
        if any(self.data_dir.glob("*.json")):
            return
        if not self.seed_dir.exists():
            return
        for f in self.seed_dir.glob("*.json"):
            user = json.loads(f.read_text())
            self.save_user(user)  # save under {user_id}.json, in case seed filename differs


storage = Storage()
