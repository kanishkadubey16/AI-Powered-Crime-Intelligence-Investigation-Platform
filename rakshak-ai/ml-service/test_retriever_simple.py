
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "rag"))
from retriever import retrieve_relevant_chunks

print("Testing retriever for question: 'What is robbery?'")
chunks = retrieve_relevant_chunks("What is robbery?")
print(f"Retrieved {len(chunks)} chunks")
for i, chunk in enumerate(chunks):
    print(f"\n--- Chunk {i+1} ---")
    print(f"Source: {chunk.metadata.get('source', 'Unknown')}")
    print(f"Page: {chunk.metadata.get('page', 'N/A')}")
    print(f"Content (first 200 chars): {chunk.page_content[:200]}...")
