class EbayService:
    def _get_token(self) -> str:
        # OAuth client-credentials token, cached for its TTL
        raise NotImplementedError

    def search(self, title: str) -> list[dict]:
        # GET https://api.ebay.com/buy/browse/v1/item_summary/search, q=title, filter buyingOptions FIXED_PRICE + itemLocationCountry:AU, limit 10, header X-EBAY-C-MARKETPLACE-ID: EBAY_AU; return top 5 by best price/condition
        raise NotImplementedError
