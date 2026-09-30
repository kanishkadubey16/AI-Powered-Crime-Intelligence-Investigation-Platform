import os
import sys
import json
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "rag"))

from rag_chain import answer_question

TEST_CASES = [
    {"question": "What is Section 101?", "expected_sec": "101"},
    {"question": "What is Section 102?", "expected_sec": "102"},
    {"question": "What is Section 103?", "expected_sec": "103"},
    {"question": "What is murder?", "expected_sec": "101"},
    {"question": "What is punishment of murder?", "expected_sec": "103"},
    {"question": "What is robbery?", "expected_sec": "309"},
    {"question": "What is punishment of robbery?", "expected_sec": "311"},
    {"question": "What is assault?", "expected_sec": "131"},
]

def run_accuracy_tests():
    print("=" * 80)
    print("  RAKSHAK AI — SECTION ACCURACY & RETRIEVAL TEST SUITE")
    print("=" * 80)

    passed_count = 0
    total_count = len(TEST_CASES)

    for case in TEST_CASES:
        q = case["question"]
        expected = case["expected_sec"]
        print(f"\n[TEST QUERY]: '{q}' (Expected Section: {expected})")

        t0 = time.time()
        res = answer_question(q)
        elapsed = round(time.time() - t0, 2)

        ans = res.get("answer", "")
        sources = res.get("sources", [])

        primary_sec = sources[0].get("section", "N/A") if sources else "N/A"
        is_correct = str(primary_sec) == str(expected)

        if is_correct:
            passed_count += 1
            status = "✅ PASSED"
        else:
            status = f"❌ FAILED (Retrieved Section {primary_sec} instead of {expected})"

        print(f"  Primary Section Retrieved : Section {primary_sec}")
        print(f"  Response Time             : {elapsed}s")
        print(f"  Status                    : {status}")
        print(f"  Answer Preview:\n{ans[:200]}...")

    print("\n" + "=" * 80)
    print(f"  FINAL VERIFICATION SCORE: {passed_count} / {total_count} PASSED")
    print("=" * 80)

if __name__ == "__main__":
    run_accuracy_tests()
