import sys
sys.path.insert(0, '.')
import traceback

from rag_chain import answer_question

test_queries = [
    "What is robbery?",
    "What is Section 309?",
    "What is forgery?",
    "What is cheating?",
    "What is kidnapping?",
]

for q in test_queries:
    print()
    print("=" * 80)
    print(f"QUERY: {q}")
    print("=" * 80)
    try:
        result = answer_question(q)
        print(f"SUCCESS:")
        print(f"  Keys: {list(result.keys())}")
        if 'answer' in result:
            print(f"  Answer length: {len(result['answer'])} chars")
            print(f"  Answer (first 800 chars):\n{result['answer'][:800]}")
        print(f"  Sources: {result.get('sources', [])}")
    except Exception as e:
        print(f"ERROR: {e}")
        print("FULL TRACEBACK:")
        traceback.print_exc()
    print()
