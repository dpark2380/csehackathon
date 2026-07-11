import io

import httpx
import numpy as np
from PIL import Image


class ClipService:
    def __init__(self):
        self._model = None

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer("clip-ViT-B-32")
        return self._model

    def warm(self) -> None:
        self._get_model()

    def encode_image_url(self, url: str) -> "np.ndarray":
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        return self._get_model().encode(img)

    def similarity(self, query_emb, corpus_embs) -> "np.ndarray":
        query = np.asarray(query_emb, dtype=np.float32)
        corpus = np.asarray(corpus_embs, dtype=np.float32)
        dots = corpus @ query
        norms = np.linalg.norm(corpus, axis=1) * np.linalg.norm(query)
        norms = np.where(norms == 0, 1e-12, norms)
        return dots / norms

    def top_k_matches(self, query_url: str, corpus: list[dict], k: int = 3) -> list[dict]:
        query_emb = self.encode_image_url(query_url)
        corpus_embs = [item["embedding"] for item in corpus]
        sims = self.similarity(query_emb, corpus_embs)
        order = np.argsort(sims)[::-1][:k]
        results = []
        for idx in order:
            item = dict(corpus[idx])
            item.pop("embedding", None)
            item["similarity"] = float(sims[idx])
            results.append(item)
        return results


clip_service = ClipService()
