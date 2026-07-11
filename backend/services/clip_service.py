class ClipService:
    def __init__(self):
        # loads SentenceTransformer('clip-ViT-B-32'), warm at startup not per-request
        raise NotImplementedError

    def encode_image_url(self, url: str) -> list[float]:
        # fetch image via httpx, encode with CLIP
        raise NotImplementedError

    def similarity(self, query_emb: list[float], corpus_embs: list[list[float]]) -> list[float]:
        # cosine similarity via numpy
        raise NotImplementedError

    def top_k_matches(self, query_url: str, corpus: list[dict], k: int = 3) -> list[dict]:
        # returns corpus items with 'similarity' added, best first
        raise NotImplementedError
