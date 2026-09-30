import sys
sys.path.insert(0, "rag")
from rag_chain import answer_question
import json

print("Testing question: What is murder?")
result = answer_question("What is murder?")
print("\nTest Result:")
print(json.dumps(result, indent=2))
print()

print("Testing question: What is quantum computing?")
result2 = answer_question("What is quantum computing?")
print("\nTest Result:")
print(json.dumps(result2, indent=2))