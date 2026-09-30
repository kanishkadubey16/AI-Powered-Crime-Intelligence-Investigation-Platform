import sys
sys.path.insert(0, "rag")
from rag.rag_chain import answer_question

print("Testing RAG with question: 'What is theft?'")
result = answer_question("What is theft?")
print("\nTest Result:")
import json
print(json.dumps(result, indent=2))
