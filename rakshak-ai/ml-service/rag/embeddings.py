import os

os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TQDM_DISABLE", "1")

from langchain_huggingface import HuggingFaceEmbeddings
from config import EMBEDDING_MODEL

# Cache embeddings to load only once
_EMBEDDINGS = None


def get_embeddings():
    """Return HuggingFace embeddings instance (cached, local, no API key required)."""
    global _EMBEDDINGS
    if _EMBEDDINGS is None:
        _EMBEDDINGS = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _EMBEDDINGS

