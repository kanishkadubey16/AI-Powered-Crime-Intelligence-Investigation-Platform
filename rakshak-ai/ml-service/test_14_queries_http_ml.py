#!/usr/bin/env python3
"""
HTTP-level test of all 14 mandated queries against Flask ML service :8000.
Each query must return HTTP 200, success=true, answer non-empty.
Also spot-checks section numbers for correctness.
"""
import sys, os, json, time, re, urllib.request, urllib.error

ML_URL = os.environ.get("ML_URL", "http://localhost:8000")

QUERIES = [
    ("What is murder?",                                {"must_sec": ["101","103"], "must_src": "BNS"}),
    ("What is robbery?",                               {"must_sec": ["309","311"], "must_src": "BNS"}),
    ("What is cheating?",                              {"must_sec": ["318","320"], "must_src": "BNS"}),
    ("What is forgery?",                               {"must_sec": ["335","336"], "must_src": "BNS"}),
    ("What is assault?",                               {"must_sec": ["130","131"], "must_src": "BNS"}),
    ("What is kidnapping?",                            {"must_sec": ["137","140"], "must_src": "BNS"}),
    ("What is Section 103 of BNS?",                    {"must_sec": ["103"],       "must_src": "BNS", "exact": True}),
    ("Explain Section 308.",                           {"must_sec": ["308"],       "must_src": "BNS"}),
    ("What is the punishment for robbery?",            {"must_sec": ["311"],       "must_src": "BNS"}),
    ("What is the punishment for murder?",             {"must_sec": ["103"],       "must_src": "BNS"}),
    ("A person slaps another person.",                 {"must_sec": ["130","131"], "must_src": "BNS", "scenario": True}),
    ("A child is kidnapped from school.",              {"must_sec": ["137","140"], "must_src": "BNS", "scenario": True}),
    ("Someone forges a signature.",                    {"must_sec": ["335","336"], "must_src": "BNS", "scenario": True}),
    ("What is cheating? Give a short definition.",     {"must_sec": ["318"],       "must_src": "BNS", "short": True}),
]

def post(url, payload, timeout=180):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type":"application/json","Accept":"application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, resp.headers, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, e.headers, body
    except Exception as e:
        return 0, {}, str(e)

results = []
http_ok = 0
section_ok = 0
print("="*100)
print(f"ML HTTP Test Suite — {ML_URL}")
print(f"Queries: {len(QUERIES)}")
print("="*100)
for i, (q, spec) in enumerate(QUERIES, 1):
    t0 = time.time()
    status, headers, body = post(f"{ML_URL}/legal-query", {"question": q})
    dt = time.time() - t0
    try:
        payload = json.loads(body)
    except Exception:
        payload = {"raw": body[:500]}
    success = payload.get("success", False)
    answer = payload.get("answer", "") if isinstance(payload, dict) else ""
    answer_lower = answer.lower()
    # checks
    http_pass = (status == 200)
    success_pass = (success is True)
    answer_pass = isinstance(answer, str) and len(answer) > 30
    forbidden = []
    for tok in ("Gazette of India", "thinking process", "Reasoning:", "<think>", "The RAG service encountered"):
        if tok.lower() in answer_lower:
            forbidden.append(tok)
    sec_missing = []
    for sec in spec.get("must_sec", []):
        if not re.search(rf"Section\s+{re.escape(sec)}", answer, re.I):
            sec_missing.append(sec)
    src_present = (spec["must_src"].lower() in answer_lower)
    if spec.get("scenario"):
        scenario_labels_ok = ("likely offence:" in answer_lower) and ("reason:" in answer_lower)
    else:
        scenario_labels_ok = True
    overall_checks_pass = (
        http_pass and success_pass and answer_pass and not forbidden
        and not sec_missing and src_present and scenario_labels_ok
    )
    if overall_checks_pass: section_ok += 1
    if http_pass and success_pass: http_ok += 1
    status_txt = "PASS" if overall_checks_pass else "FAIL"
    print(f"[{status_txt}] #{i:>2} HTTP={status:<3} success={success!s:<5} t={dt:5.1f}s  | {q[:62]}")
    if not overall_checks_pass:
        issues = []
        if not http_pass: issues.append(f"HTTP {status}")
        if not success_pass: issues.append(f"success={success}")
        if not answer_pass: issues.append("answer empty")
        if forbidden: issues.append(f"forbidden tokens: {forbidden}")
        if sec_missing: issues.append(f"missing sections: {sec_missing}")
        if not src_present: issues.append(f"missing source mention: {spec['must_src']}")
        if spec.get("scenario") and not scenario_labels_ok: issues.append("missing Likely Offence / Reason labels")
        print(f"        Issues: {issues}")
        if isinstance(payload, dict) and payload.get("error"):
            print(f"        ML error: {payload.get('error')} | msg={payload.get('message','')[:120]}")
            if payload.get("traceback_id"): print(f"        traceback_id={payload.get('traceback_id')}")
    results.append({"idx":i,"query":q,"status":status_txt,"http":status,"success":success,"time_sec":round(dt,1),
                    "issues": [] if overall_checks_pass else issues,
                    "answer_len": len(answer) if isinstance(answer, str) else 0})

print()
print("="*100)
tot = len(QUERIES)
print(f"RESULTS: HTTP 200 + success=true: {http_ok}/{tot}   |   Full correctness: {section_ok}/{tot}")
print("="*100)
for r in results:
    print(f"  [{r['status']:>4}] #{r['idx']:>2} ({r['time_sec']}s) HTTP={r['http']:<3} answer={r['answer_len']:>5} chars  {r['query'][:65]}")
    if r["status"] != "PASS":
        for iss in r["issues"]:
            print(f"           · {iss}")

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "http_ml_test_results.json"), "w") as f:
    json.dump({"queries_tested": tot, "http_200_success": http_ok, "fully_correct": section_ok, "results": results}, f, indent=2)
print("\nResults JSON saved to http_ml_test_results.json")
sys.exit(0 if (http_ok == tot and section_ok == tot) else 1)
