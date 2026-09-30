from loader import load_all_pdfs
from splitter import split_documents
from vectordb import (
    create_or_update_vector_store,
    get_indexed_sources,
    get_total_chunks,
)


def ingest() -> None:
    print("=" * 55)
    print("  Rakshak AI — RAG Ingestion Pipeline")
    print("=" * 55)

    # Get existing sources
    try:
        existing_sources = get_indexed_sources()
        existing_count = get_total_chunks()
        if existing_sources:
            print(f"\n  Existing collection: {existing_count} chunks across {len(existing_sources)} file(s)")
            print(f"  Already indexed: {', '.join(sorted(existing_sources))}")
    except FileNotFoundError:
        existing_sources = set()
        existing_count = 0

    # Step 1: Load new PDFs
    print("\n[1/3] Loading PDFs...")
    docs = load_all_pdfs(skip_sources=existing_sources)

    if not docs:
        print("\n  Nothing new to index. Vector database is up to date.")
        print("=" * 55)
        return

    print(f"\n  Number of documents (pages) loaded: {len(docs)}")

    # Step 2: Split into chunks
    print("\n[2/3] Splitting into chunks...")
    chunks = split_documents(docs)
    print(f"  Number of chunks created: {len(chunks)}")

    # Step 3: Add to vector store
    print("\n[3/3] Generating embeddings and updating ChromaDB...")
    create_or_update_vector_store(chunks)
    print("  Embedding completed")

    final_count = get_total_chunks()
    print(f"\n  Vector database saved successfully")
    print(f"  Total chunks in store: {final_count}")
    print("=" * 55)


if __name__ == "__main__":
    ingest()

