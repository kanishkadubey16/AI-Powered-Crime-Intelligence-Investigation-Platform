import sys
sys.path.insert(0, "rag")
from retriever import retrieve_relevant_chunks

question = "What is kidnapping?"
chunks = retrieve_relevant_chunks(question)
print(f"Retrieved {len(chunks)} chunks for '{question}':")
for i, chunk in enumerate(chunks):
    print(f"\n--- Chunk {i+1} ---")
    print(f"Source: {chunk.metadata.get('source', 'Unknown')}, Page: {chunk.metadata.get('page', 'N/A')}")
    print(f"Content:\n{chunk.page_content}")
