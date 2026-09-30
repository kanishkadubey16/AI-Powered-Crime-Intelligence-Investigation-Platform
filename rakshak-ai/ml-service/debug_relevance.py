import sys
import re
sys.path.insert(0, "rag")
from retriever import retrieve_relevant_chunks
from rag_chain import STOPWORDS

question = "What is kidnapping?"
chunks = retrieve_relevant_chunks(question)

# Check relevance code
words = re.findall(r'\b\w+\b', question.lower())
key_terms = set([word for word in words if len(word) > 2 and word not in STOPWORDS])
print(f"Question: {question}")
print(f"Key terms: {key_terms}")

relevant_chunks = []
for chunk in chunks:
    chunk_text = chunk.page_content.lower()
    matches = sum(1 for term in key_terms if term in chunk_text)
    print(f"\nChunk: Source {chunk.metadata.get('source')}, Page {chunk.metadata.get('page')}")
    print(f"Chunk text contains key terms? {matches} matches")
    print(f"Key terms in chunk? {[term for term in key_terms if term in chunk_text]}")
    if matches >=1:
        relevant_chunks.append(chunk)
print(f"\nRelevant chunks found: {len(relevant_chunks)}")
