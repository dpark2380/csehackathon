import io
import threading

import httpx
import numpy as np
from PIL import Image

# Torch encode is not safe under FastAPI's request thread pool on this platform
# (concurrent encodes segfault the process). All model use is serialized here.
_encode_lock = threading.Lock()


# Zero-shot category prompts; keys mirror the extension's broad categories.
BROAD_CATEGORY_PROMPTS = {
    "electronics": "a product photo of a consumer electronics device or gadget",
    "clothes": "a product photo of clothing, shoes or fashion apparel",
    "food": "a product photo of packaged food or snacks",
    "beverages": "a product photo of a drink or beverage",
    "medicine": "a product photo of medicine, vitamins or health supplements",
    "stationery": "a product photo of stationery or office supplies",
    "home": "a product photo of homeware, kitchenware or home decor",
}
# CLIP text-image cosine runs low even for good matches; below this we say "unknown".
CLASSIFY_MIN_SIMILARITY = 0.2


class ClipService:
    def __init__(self):
        self._model = None
        self._cat_keys: list[str] | None = None
        self._cat_embs = None

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer("clip-ViT-B-32")
        return self._model

    def warm(self) -> None:
        self._get_model()

    def encode_image_url(self, url: str) -> "np.ndarray":
        # Image fetch stays outside the lock (network-bound, safe in parallel).
        resp = httpx.get(url, timeout=10, follow_redirects=True)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        with _encode_lock:
            return self._get_model().encode(img)

    def similarity(self, query_emb, corpus_embs) -> "np.ndarray":
        query = np.asarray(query_emb, dtype=np.float32)
        corpus = np.asarray(corpus_embs, dtype=np.float32)
        dots = corpus @ query
        norms = np.linalg.norm(corpus, axis=1) * np.linalg.norm(query)
        norms = np.where(norms == 0, 1e-12, norms)
        return dots / norms

    def classify_image_url(self, url: str) -> str:
        # CLIP zero-shot: nearest category prompt wins; any failure or low confidence -> "unknown".
        if not url:
            return "unknown"
        try:
            emb = self.encode_image_url(url)
        except Exception:
            return "unknown"
        if self._cat_embs is None:
            with _encode_lock:
                if self._cat_embs is None:  # re-check under the lock
                    self._cat_keys = list(BROAD_CATEGORY_PROMPTS)
                    self._cat_embs = self._get_model().encode(
                        [BROAD_CATEGORY_PROMPTS[k] for k in self._cat_keys]
                    )
        sims = self.similarity(emb, self._cat_embs)
        best = int(np.argmax(sims))
        if float(sims[best]) < CLASSIFY_MIN_SIMILARITY:
            return "unknown"
        return self._cat_keys[best]

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
