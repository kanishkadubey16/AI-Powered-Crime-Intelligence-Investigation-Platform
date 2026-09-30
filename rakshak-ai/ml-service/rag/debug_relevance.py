import sys
sys.path.insert(0, '.')
from retriever import retrieve_relevant_chunks

question = "What is murder?"
chunks = retrieve_relevant_chunks(question)

print(f"Question: {question}")
print(f"Retrieved {len(chunks)} chunks")
key_terms = set([w.lower() for w in question.split() if len(w) > 3])
print(f"Key terms: {key_terms}")

for i, chunk in enumerate(chunks):
    chunk_text = chunk.page_content.lower()
    matches = sum(1 for t in key_terms if t in chunk_text)
    print(f"\nChunk {i+1} (Source: {chunk.metadata.get('source')}, Page {chunk.metadata.get('page')}): matches = {matches}")
    print(chunk.page_content[:500])