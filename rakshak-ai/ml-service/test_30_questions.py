import os
import sys
import json
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "rag"))

from rag_chain import answer_question

BENCHMARK_QUESTIONS = [
    {"id": 1, "question": "What is Section 101?", "expected_sec": "101"},
    {"id": 2, "question": "What is Section 102?", "expected_sec": "102"},
    {"id": 3, "question": "What is Section 103?", "expected_sec": "103"},
    {"id": 4, "question": "What is Section 109?", "expected_sec": "109"},
    {"id": 5, "question": "What is Section 131?", "expected_sec": "131"},
    {"id": 6, "question": "What is Section 303?", "expected_sec": "303"},
    {"id": 7, "question": "What is Section 309?", "expected_sec": "309"},
    {"id": 8, "question": "What is Section 310?", "expected_sec": "310"},
    {"id": 9, "question": "What is Section 311?", "expected_sec": "311"},
    {"id": 10, "question": "What is Section 318?", "expected_sec": "318"},
    {"id": 11, "question": "What is Section 351?", "expected_sec": "351"},
    {"id": 12, "question": "What is Section 172?", "expected_sec": "172"},
    {"id": 13, "question": "What is Section 173?", "expected_sec": "173"},
    {"id": 14, "question": "What is Section 176?", "expected_sec": "176"},
    {"id": 15, "question": "What is Section 63?", "expected_sec": "63"},
    {"id": 16, "question": "What is Article 14?", "expected_sec": "14"},
    {"id": 17, "question": "What is Article 19?", "expected_sec": "19"},
    {"id": 18, "question": "What is Article 21?", "expected_sec": "21"},
    {"id": 19, "question": "What is murder?", "expected_sec": "101"},
    {"id": 20, "question": "What is punishment of murder?", "expected_sec": "103"},
    {"id": 21, "question": "What is robbery?", "expected_sec": "309"},
    {"id": 22, "question": "What is punishment of robbery?", "expected_sec": "311"},
    {"id": 23, "question": "What is theft?", "expected_sec": "303"},
    {"id": 24, "question": "What is dacoity?", "expected_sec": "310"},
    {"id": 25, "question": "What is assault?", "expected_sec": "131"},
    {"id": 26, "question": "What is cheating?", "expected_sec": "318"},
    {"id": 27, "question": "What is extortion?", "expected_sec": "308"},
    {"id": 28, "question": "What is culpable homicide?", "expected_sec": "100"},
    {"id": 29, "question": "What is attempt to murder?", "expected_sec": "109"},
    {"id": 30, "question": "What is information in cognizable cases?", "expected_sec": "173"},
]

def run_30_question_benchmark():
    print("=" * 80)
    print("  RAKSHAK AI — 30-QUESTION LEGAL ACCURACY BENCHMARK SUITE")
    print("=" * 80)

    passed_count = 0
    total_count = len(BENCHMARK_QUESTIONS)
    results = []

    for item in BENCHMARK_QUESTIONS:
        qid = item["id"]
        q = item["question"]
        expected = item["expected_sec"]
        print(f"\n[{qid:02d}/30] QUERY: '{q}' (Expected Section: {expected})")

        t0 = time.time()
        res = answer_question(q)
        elapsed = round(time.time() - t0, 2)

        ans = res.get("answer", "")
        sources = res.get("sources", [])

        primary_sec = str(sources[0].get("section", "N/A")) if sources else "N/A"
        is_correct = (primary_sec == expected)

        if is_correct:
            passed_count += 1
            status = "✅ PASSED"
        else:
            status = f"❌ FAILED (Retrieved Section {primary_sec} instead of {expected})"

        print(f"  Primary Section Retrieved : Section {primary_sec}")
        print(f"  Response Time             : {elapsed}s")
        print(f"  Status                    : {status}")

        results.append({
            "id": qid,
            "question": q,
            "expected_section": expected,
            "retrieved_section": primary_sec,
            "passed": is_correct,
            "response_time": elapsed,
            "answer_snippet": ans[:150],
        })

    accuracy = round((passed_count / total_count) * 100, 2)

    print("\n" + "=" * 80)
    print(f"  FINAL BENCHMARK SCORE: {passed_count} / {total_count} PASSED ({accuracy}%)")
    if accuracy >= 95.0:
        print("  🎉 TARGET ACCURACY (>95%) ACHIEVED!")
    else:
        print("  ⚠️ ACCURACY BELOW 95% TARGET — FURTHER TUNING REQUIRED")
    print("=" * 80)

    with open("benchmark_results.json", "w") as f:
        json.dump({
            "accuracy_percentage": accuracy,
            "passed_count": passed_count,
            "total_count": total_count,
            "results": results
        }, f, indent=2)

if __name__ == "__main__":
    run_30_question_benchmark()
