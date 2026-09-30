#!/usr/bin/env python3
"""
Quick retrieval spot-check — verifies section matching WITHOUT calling Ollama.
Prints the top-3 reranked chunks for each test query.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "rag"))

from retriever import retrieve_relevant_chunks

QUERIES = [
    ("What is murder?",   "BNS.pdf", "103"),
    ("What is robbery?",  "BNS.pdf", "309"),
    ("What is assault?",  "BNS.pdf", "131"),
    ("What is theft?",    "BNS.pdf", "303"),
    ("What is dacoity?",  "BNS.pdf", "310"),
    ("What is crime?",    "BNS.pdf", None),   # no single section — just check it doesn't return robbery
]

print("=" * 60)
print("  Retrieval Spot-Check")
print("=" * 60)

all_pass = True
for question, expected_src, expected_sec in QUERIES:
    print(f"\nQ: {question!r}")
    chunks = retrieve_relevant_chunks(question)
    top_sections = []
    for c in chunks:
        sec  = c.metadata.get("section_number", "—")
        src  = c.metadata.get("source", "?")
        title = c.metadata.get("section_title", "")[:50]
        print(f"  → sec={sec}  src={src}  title={title!r}")
        top_sections.append((src, sec))

    if expected_sec:
        hit = any(src == expected_src and sec == expected_sec
                  for src, sec in top_sections)
        status = "✅ PASS" if hit else f"❌ FAIL (expected Section {expected_sec})"
        if not hit:
            all_pass = False
    else:
        # For "crime" — just ensure we're not returning robbery sec 309
        hit = not any(sec == "309" for _, sec in top_sections)
        status = "✅ PASS (no false robbery match)" if hit else "⚠️  returned robbery sec 309"
    print(f"  {status}")

print("\n" + "=" * 60)
print("  Overall:", "✅ ALL PASS" if all_pass else "❌ SOME FAILURES")
print("=" * 60)
