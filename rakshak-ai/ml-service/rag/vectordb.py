import os
from langchain_chroma import Chroma
from config import CHROMA_DIR, CHROMA_COLLECTION
from embeddings import get_embeddings

# Cache vector store to load only once
_VECTOR_STORE = None


def get_vector_store() -> Chroma:
    """
    Load existing ChromaDB vector store (persisted on disk, cached).
    Raises FileNotFoundError if store doesn't exist yet.
    """
    global _VECTOR_STORE
    if _VECTOR_STORE is None:
        if not os.path.exists(CHROMA_DIR) or len(os.listdir(CHROMA_DIR)) == 0:
            raise FileNotFoundError(
                f"Vector store not found at '{CHROMA_DIR}'. Run ingest.py to create it."
            )
        _VECTOR_STORE = Chroma(
            collection_name=CHROMA_COLLECTION,
            embedding_function=get_embeddings(),
            persist_directory=CHROMA_DIR,
        )
    return _VECTOR_STORE


def create_or_update_vector_store(documents: list) -> Chroma:
    """
    Create or update ChromaDB vector store with new documents.
    Always creates a fresh store when the directory does not exist.
    """
    global _VECTOR_STORE
    os.makedirs(CHROMA_DIR, exist_ok=True)

    store_exists = (
        os.path.exists(CHROMA_DIR)
        and len(os.listdir(CHROMA_DIR)) > 0
        and _VECTOR_STORE is not None
    )

    if store_exists:
        # Add to existing in-memory store
        _VECTOR_STORE.add_documents(documents)
        return _VECTOR_STORE

    # Create brand-new store — use positional embeddings arg to avoid kwarg clash
    embeddings = get_embeddings()
    _VECTOR_STORE = Chroma.from_documents(
        documents=documents,
        embedding=embeddings,
        collection_name=CHROMA_COLLECTION,
        persist_directory=CHROMA_DIR,
    )
    return _VECTOR_STORE


def get_indexed_sources(store: Chroma = None) -> set:
    """Return set of source filenames already present in the vector store."""
    if store is None:
        try:
            store = get_vector_store()
        except FileNotFoundError:
            return set()

    try:
        result = store.get(include=["metadatas"])
        return {m.get("source") for m in result["metadatas"] if m.get("source")}
    except Exception:
        return set()


def get_total_chunks(store: Chroma = None) -> int:
    """Return total number of chunks in the vector store."""
    if store is None:
        try:
            store = get_vector_store()
        except FileNotFoundError:
            return 0
    return store._collection.count()


def reset_vector_store() -> None:
    """
    Wipe the entire ChromaDB index from disk and clear the in-memory cache.
    Call this before re-ingesting documents with a new chunking strategy.
    """
    global _VECTOR_STORE
    import shutil

    _VECTOR_STORE = None  # clear cache first

    if os.path.exists(CHROMA_DIR):
        shutil.rmtree(CHROMA_DIR)
        print(f"[VectorDB] Deleted existing index at: {CHROMA_DIR}")
    else:
        print(f"[VectorDB] No existing index found at: {CHROMA_DIR} (nothing to delete)")


def ensure_vector_store() -> int:
    """Create the persisted index from bundled PDFs when it is absent or empty."""
    try:
        store = get_vector_store()
        if store._collection.count() > 0:
            return store._collection.count()
    except FileNotFoundError:
        pass

    from loader import load_all_pdfs
    from splitter import split_documents

    documents = load_all_pdfs()
    if not documents:
        raise RuntimeError("No legal PDF documents were available to index.")
    store = create_or_update_vector_store(split_documents(documents))
    return store._collection.count()

