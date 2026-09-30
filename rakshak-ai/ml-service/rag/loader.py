import os
from langchain_community.document_loaders import PyPDFLoader
from config import PDF_FILES


def load_single_pdf(path: str) -> list:
    """Load a single PDF file and return list of LangChain Document objects with metadata."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"PDF file not found: {path}")
    if os.path.getsize(path) == 0:
        raise ValueError(f"PDF file is empty: {path}")

    filename = os.path.basename(path)
    loader = PyPDFLoader(path)
    pages = loader.load()

    # Add clean metadata: source filename and page number
    for page in pages:
        page.metadata["source"] = filename
        if "page" in page.metadata:
            # PyPDFLoader uses 0-based index; convert to 1-based for user-friendliness
            page.metadata["page"] = page.metadata["page"] + 1

    return pages


def load_all_pdfs(skip_sources: set = None) -> list:
    """Load all PDFs from config.PDF_FILES. Skip sources in skip_sources."""
    if skip_sources is None:
        skip_sources = set()

    docs = []
    for path in PDF_FILES:
        filename = os.path.basename(path)
        if filename in skip_sources:
            print(f"  [SKIP] Already indexed: {filename}")
            continue
        try:
            pages = load_single_pdf(path)
            docs.extend(pages)
            print(f"  Loaded {len(pages):>4} pages  ← {filename}")
        except Exception as e:
            print(f"  [ERROR] Failed to load {filename}: {str(e)}")
    return docs


def get_indexed_sources() -> set:
    """Placeholder for checking sources already in ChromaDB (will be used by ingest.py via vectordb.py."""
    return set()

