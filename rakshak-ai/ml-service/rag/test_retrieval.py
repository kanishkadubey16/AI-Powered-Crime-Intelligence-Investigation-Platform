
from retriever import retrieve_relevant_chunks

test_questions = [
    "What is murder?",
    "What is robbery?",
    "What is theft?",
    "What is kidnapping?"
]

print("=" * 80)
print("Testing RAG Retrieval")
print("=" * 80)

for question in test_questions:
    print("\n" + "=" * 80)
    print(f"QUESTION: {question}")
    print("=" * 80)
    
    chunks = retrieve_relevant_chunks(question)
    
    print(f"\nRetrieved {len(chunks)} chunks:")
    for i, chunk in enumerate(chunks):
        print(f"\n--- CHUNK {i+1} ---")
        print(f"Source: {chunk.metadata.get('source', 'Unknown')}, Page: {chunk.metadata.get('page', 'Unknown')}")
        print("Content:\n", chunk.page_content)
        print("-" * 40)
