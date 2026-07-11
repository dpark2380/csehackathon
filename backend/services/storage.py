class Storage:
    def __init__(self, data_dir: str = "data"):
        raise NotImplementedError

    def get_user(self, user_id: str) -> dict | None:
        # read data/{user_id}.json
        raise NotImplementedError

    def save_user(self, user: dict) -> None:
        # write data/{user_id}.json
        raise NotImplementedError

    def update_tally(self, user_id: str, dollars: float, kg_co2: float) -> dict:
        # increment tally fields, return new tally
        raise NotImplementedError

    def append_interception(self, user_id: str, interception: dict) -> None:
        raise NotImplementedError

    def seed_if_empty(self) -> None:
        # load committed demo seed data if data/ is empty (HF Space fresh start)
        raise NotImplementedError
