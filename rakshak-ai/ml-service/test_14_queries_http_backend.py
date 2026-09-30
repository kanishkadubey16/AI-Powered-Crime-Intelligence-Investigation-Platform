#!/usr/bin/env python3
import sys, os, json, time, re, urllib.request, urllib.error

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8001")
JWT = os.environ.get("BACKEND_JWT", "").strip()
assert JWT, "Set BACKEND_JWT env var"

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
    "What is cheating? Give a short definition.",
]

def post(url, payload, timeout=240):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={
        "Content-Type":"application/json",
        "Accept":"application/json",
        "Authorization": JWT,
    }, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, resp.headers, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, e.headers, body
    except Exception as e:
        return 0, {}, str(e)

# First probe backend health
try:
    with urllib.request.urlopen(BACKEND_URL + "/health", timeout=5) as r:
        print(f"Backend /health: HTTP {r.status}")
except Exception as e:
    print(f"Backend /health FAIL: {e}")

http_ok = 0
success_ok = 0
results = []
print(f"\n{'='*90}\nBackend HTTP Test Suite — {BACKEND_URL}\nQueries: {len(QUERIES)}\n{'='*90}")
for i, q in enumerate(QUERIES, 1):
    t0 = time.time()
    status, headers, body = post(f"{BACKEND_URL}/api/ai/legal-query", {"question": q})
    dt = time.time() - t0
    try:
        payload = json.loads(body)
    except Exception:
        payload = {"raw": body[:500]}
    success = payload.get("success", False) if isinstance(payload, dict) else False
    answer = payload.get("answer", "") if isinstance(payload, dict) else ""
    http_pass = (status == 200)
    success_pass = (success is True)
    answer_pass = isinstance(answer, str) and len(answer) > 20
    overall = http_pass and success_pass and answer_pass
    if overall: http_ok += 1
    if http_pass and success_pass: success_ok += 1
    tag = "PASS" if overall else "FAIL"
    print(f"[{tag}] #{i:>2} HTTP={status:<3} success={success!s:<5} t={dt:5.1f}s  | {q[:60]}")
    if not overall:
        issues = []
        if not http_pass: issues.append(f"HTTP {status}")
        if not success_pass: issues.append(f"success={success}")
        if not answer_pass: issues.append("answer too short")
        if isinstance(payload, dict):
            if payload.get("error"): issues.append(f"err: {payload.get('error')}")
            if payload.get("message"): issues.append(f"msg: {str(payload.get('message'))[:80]}")
            if payload.get("traceId"): issues.append(f"traceId: {payload.get('traceId')}")
        print(f"       Issues: {issues}")
    results.append({"idx":i,"query":q,"http":status,"success":success,"answer_len":len(answer) if isinstance(answer,str) else 0,
                    "time_sec":round(dt,1),"status":tag})

print(f"\n{'='*90}\nRESULTS: HTTP 200 + success=true + answer non-empty: {http_ok}/{len(QUERIES)}\n{'='*90}")
for r in results:
    print(f"  [{r['status']:>4}] #{r['idx']:>2} ({r['time_sec']}s) HTTP={r['http']:<3} answer={r['answer_len']:>5} chars  {r['query'][:65]}")
sys.exit(0 if http_ok == len(QUERIES) else 1)
