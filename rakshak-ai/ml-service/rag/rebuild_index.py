#!/usr/bin/env python3
"""
rebuild_index.py — Wipe and rebuild the Rakshak AI ChromaDB index.

Run this whenever the chunking strategy changes:

    cd rakshak-ai/ml-service/rag
    python rebuild_index.py

Steps:
  1. Delete existing chroma_db/
  2. Load all PDFs
  3. Chunk with section-aware splitter
  4. Re-embed and save to ChromaDB
  5. Print sample chunks to verify correctness
"""

import sys
import os

# Make sure local rag/ modules are importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vectordb import reset_vector_store, create_or_update_vector_store, get_total_chunks
from loader import load_all_pdfs
from splitter import split_documents


def _divider(char="=", width=60):
    print(char * width)


def main():
    _divider()
    print("  Rakshak AI — Index Rebuild")
    _divider()

    # ── Step 1: Wipe old index ────────────────────────────────────────────────
    print("\n[1/4] Wiping old ChromaDB index...")
    reset_vector_store()

    # ── Step 2: Load PDFs ─────────────────────────────────────────────────────
    print("\n[2/4] Loading PDFs...")
    docs = load_all_pdfs()
    if not docs:
        print("  ERROR: No PDF files found. Check documents/ directory.")
        sys.exit(1)
    print(f"  Loaded {len(docs)} pages across {len(set(d.metadata.get('source','') for d in docs))} file(s).")

    # ── Step 3: Section-aware chunking ────────────────────────────────────────
    print("\n[3/4] Chunking with section-aware splitter...")
    chunks = split_documents(docs)
    print(f"  Created {len(chunks)} chunks.")

    # Show distribution per source
    from collections import Counter
    dist = Counter(c.metadata.get("source", "unknown") for c in chunks)
    for src, count in sorted(dist.items()):
        print(f"    {src}: {count} chunks")

    # ── Step 4: Re-embed and save ─────────────────────────────────────────────
    print("\n[4/4] Embedding and saving to ChromaDB...")
    print("  (This may take a few minutes for large documents...)")
    create_or_update_vector_store(chunks)
    total = get_total_chunks()
    print(f"  Done. Total chunks in store: {total}")

    # ── Verification: sample chunks ───────────────────────────────────────────
    _divider("-")
    print("\n  Sample chunks (first 10):\n")
    for i, chunk in enumerate(chunks[:10]):
        meta = chunk.metadata
        preview = " ".join(chunk.page_content.split())[:150]
        print(
            f"  [{i+1:>2}] sec={meta.get('section_number','—'):<5}"
            f"  src={meta.get('source','?'):<10}"
            f"  page={meta.get('page','?'):<4}"
            f"  title={meta.get('section_title','')[:40]!r}"
        )
        print(f"       preview: {preview}…")
        print()

    # Key sections to spot-check
    print("\n  Spot-check: searching for key sections...\n")
    important = {
        "BNS.pdf":  ["100", "101", "103", "109", "131", "303", "309", "310"],
        "BNSS.pdf": ["172", "173", "176", "179"],
        "BSA.pdf":  ["57", "63", "65"],
    }
    found_map = {}
    for chunk in chunks:
        src = chunk.metadata.get("source", "")
        sec = chunk.metadata.get("section_number", "")
        if src in important and sec in important[src]:
            found_map.setdefault(src, set()).add(sec)

    for src, expected in important.items():
        found = found_map.get(src, set())
        for sec in expected:
            status = "✅" if sec in found else "❌ MISSING"
            print(f"    {status}  {src}  Section {sec}")

    _divider()
    print("\n  Rebuild complete. Run test_all_questions.py to verify retrieval.\n")


if __name__ == "__main__":
    main()
