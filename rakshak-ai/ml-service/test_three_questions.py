import sys
sys.path.insert(0, "rag")
from rag_chain import answer_question
import json

test_questions = [
    "What is robbery?",
    "What is murder?",
    "What is assault?"
]

for question in test_questions:
    print("\n" + "=" * 80)
    print(f"TESTING: {question}")
    print("=" * 80)
    result = answer_question(question)
    print("\nFinal Result:")
    print(json.dumps(result, indent=2))