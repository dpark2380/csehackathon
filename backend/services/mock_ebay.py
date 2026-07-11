class MockEbayService:
    def search(self, title: str) -> list[dict]:
        # return 5 curated hardcoded listings matched by category/title keywords
        raise NotImplementedError
