import os
from dotenv import load_dotenv

_HERE        = os.path.dirname(os.path.abspath(__file__))
_ML_ROOT     = os.path.dirname(_HERE)
_PROJECT_ROOT = os.path.dirname(_ML_ROOT)

_BACKEND_ENV = os.path.join(_PROJECT_ROOT, "backend", ".env")
if os.path.exists(_BACKEND_ENV):
    # override=False: only fills missing vars — won't overwrite PORT or existing env
    load_dotenv(_BACKEND_ENV, override=False)

# ── Base paths ────────────────────────────────────────────────────────────────

DOCUMENTS_DIR  = os.path.join(_ML_ROOT, "documents")
CHROMA_DIR     = os.path.join(_HERE, "chroma_db")

import glob
PDF_FILES = glob.glob(os.path.join(DOCUMENTS_DIR, "**", "*.pdf"), recursive=True)

# ── ChromaDB ──────────────────────────────────────────────────────────────────
CHROMA_COLLECTION = "rakshak_legal_docs"

# ── Embeddings ────────────────────────────────────────────────────────────────
# Runs locally — no API key needed
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# ── Text splitting ────────────────────────────────────────────────────────────
# Used only as a fallback for pages without detectable section headers
CHUNK_SIZE    = 1500
CHUNK_OVERLAP = 200

# ── Retrieval ─────────────────────────────────────────────────────────────────
TOP_K               = 10   # Initial candidates fetched from ChromaDB
TOP_K_AFTER_RERANK  = 3    # Final chunks kept after CrossEncoder reranking

# CrossEncoder reranker — local model, no API key required
# Part of the sentence-transformers package already in requirements.txt
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"

# ── Ollama Parameters ─────────────────────────────────────────────────────────
OLLAMA_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_TEMPERATURE = 0.1
OLLAMA_TOP_P = 0.9
OLLAMA_NUM_PREDICT = 2048
CONTEXT_CHAR_LIMIT = 3000
OLLAMA_STOP = [
    "Thinking:", "Thought:", "Reasoning:",
    "<think>", "</think>", "/nothink", "/think",
    "Assistant:", "User:", "Context:", "Question:",
]

# ── Gemini ────────────────────────────────────────────────────────────────────
GEMINI_API_KEY   = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL     = "gemini-2.0-flash"
GEMINI_MAX_TOKENS = 1024
GEMINI_TEMPERATURE = 0.1   # low temperature → factual, grounded answers

STOPWORDS = {
    "what", "when", "where", "why", "how", "which", "who", "whom", "whose",
    "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "must", "shall", "can",
    "need", "dare", "ought", "used",
    "the", "a", "an", "and", "or", "but", "if", "because", "as", "until", "while",
    "of", "at", "by", "for", "with", "about", "against", "between", "into", "through",
    "during", "before", "after", "above", "below", "to", "from", "up", "down", "in",
    "out", "on", "off", "over", "under", "again", "further", "then", "once",
}
