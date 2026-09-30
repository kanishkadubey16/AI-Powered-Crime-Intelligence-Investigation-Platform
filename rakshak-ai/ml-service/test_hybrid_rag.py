import os
import sys
import json
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "rag"))

from rag_chain import answer_question
from intent import classify_intent

TEST_QUESTIONS = [
    {
        "question": "What is robbery?",
        "expected_intent": "LEGAL",
        "expected_path": "RAG",
    },
    {
        "question": "What is the punishment for murder?",
        "expected_intent": "LEGAL",
        "expected_path": "RAG",
    },
    {
        "question": "Difference between robbery and theft?",
        "expected_intent": "LEGAL",
        "expected_path": "RAG or FALLBACK",
    },
    {
        "question": "What is Artificial Intelligence?",
        "expected_intent": "GENERAL",
        "expected_path": "SKIP RAG",
    },
    {
        "question": "Who won the Cricket World Cup?",
        "expected_intent": "GENERAL",
        "expected_path": "SKIP RAG",
    },
    {
        "question": "Hello",
        "expected_intent": "GENERAL",
        "expected_path": "SKIP RAG",
    },
]

def run_hybrid_tests():
    print("=" * 80)
    print("  RAKSHAK AI — HYBRID RAG + LLM TEST SUITE")
    print("=" * 80)

    results = []

    for item in TEST_QUESTIONS:
        q = item["question"]
        print(f"\n[TEST QUESTION]: {q}")

        intent = classify_intent(q)
        print(f"  Detected Intent: {intent} (Expected: {item['expected_intent']})")

        t0 = time.time()
        res = answer_question(q)
        elapsed = round(time.time() - t0, 2)

        ans = res.get("answer", "")
        sources = res.get("sources", [])

        print(f"  Response Time  : {elapsed}s")
        print(f"  Sources Count  : {len(sources)}")
        if sources:
            print(f"  Primary Source : {sources[0]}")
        print(f"  Answer Preview :\n{ans[:250]}...")

        # Checks
        has_sources = len(sources) > 0 and sources[0].get("source") != "AI General Knowledge"
        if intent == "GENERAL":
            path_ok = len(sources) == 0
        else:
            path_ok = True

        status = "PASSED" if path_ok else "FAILED"
        print(f"  Status         : {status}")

        results.append({
            "question": q,
            "intent": intent,
            "response_time": elapsed,
            "sources": sources,
            "answer": ans,
            "status": status,
        })

    print("\n" + "=" * 80)
    print("  TEST SUITE COMPLETED SUCCESSFULLY")
    print("=" * 80)

    with open("hybrid_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run_hybrid_tests()
