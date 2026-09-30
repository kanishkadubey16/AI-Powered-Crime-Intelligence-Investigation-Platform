#!/usr/bin/env python3
"""HTTP integration tests for Rakshak legal RAG — all queries must return HTTP 200."""

import json
import re
import sys
import requests

BASE = "http://localhost:8000"
QUERIES = [
    "What is murder?",
    "What is robbery?",
    "What is cheating?",
    "What is forgery?",
    "What is assault?",
    "What is kidnapping?",
    "What is Section 103 of BNS?",
    "Explain Section 308.",
    "What is the punishment for robbery?",
    "What is the punishment for murder?",
    "A person slaps another person.",
    "A child is kidnapped from school.",
    "Someone forges a signature.",
    "What is Section 309?",
    "What is cheating? Give a short definition.",
]

FORBIDDEN = re.compile(
    r"(thinking process|reasoning:|<think>|you are rakshak|respond with:)",
    re.IGNORECASE,
)

EXPECTATIONS = {
    "What is Section 103 of BNS?": {"must_include": ["103"], "must_not_include": ["101", "102"]},
    "What is Section 309?": {"must_include": ["309"], "must_not_include": ["313"]},
    "What is the punishment for robbery?": {"must_include": ["311", "punishment"]},
    "What is the punishment for murder?": {"must_include": ["103", "punishment"]},
    "A child is kidnapped from school.": {"must_include": ["137", "kidnap"]},
}


def main():
    results = []
    failed = 0
    for q in QUERIES:
        row = {"question": q, "http_status": None, "success": False, "checks": []}
        try:
            r = requests.post(f"{BASE}/legal-query", json={"question": q}, timeout=180)
            row["http_status"] = r.status_code
            if r.status_code != 200:
                row["error"] = r.text[:500]
                failed += 1
                results.append(row)
                continue
            data = r.json()
            row["success"] = bool(data.get("success"))
            ans = data.get("answer", "")
            row["answer_len"] = len(ans)
            if not row["success"]:
                row["error"] = data
                failed += 1
                results.append(row)
                continue
            if FORBIDDEN.search(ans):
                row["checks"].append("FAIL: prompt/reasoning leakage")
                failed += 1
            if len(ans) < 40:
                row["checks"].append("FAIL: answer too short")
                failed += 1
            exp = EXPECTATIONS.get(q)
            if exp:
                low = ans.lower()
                for token in exp.get("must_include", []):
                    if token.lower() not in low:
                        row["checks"].append(f"FAIL: missing '{token}'")
                        failed += 1
                for token in exp.get("must_not_include", []):
                    if token.lower() in low:
                        row["checks"].append(f"FAIL: unwanted '{token}'")
                        failed += 1
            if not row["checks"]:
                row["checks"].append("PASS")
        except Exception as e:
            row["checks"].append(f"FAIL: {e}")
            failed += 1
        results.append(row)

    print(json.dumps({"failed": failed, "total": len(QUERIES), "results": results}, indent=2))
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
