import sys
sys.path.insert(0, "rag")
from rag_chain import answer_question
import json

print("Testing question: What is robbery?")
result = answer_question("What is robbery?")
print("\nTest Result:")
print(json.dumps(result, indent=2))