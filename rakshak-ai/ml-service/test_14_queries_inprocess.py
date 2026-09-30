#!/usr/bin/env python3
"""
In-process test of all 14 mandated queries against RAG chain directly.
No Flask / Node services required. Iterates fast.
"""
import sys, os, json, time, traceback, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "rag"))
from rag_chain import answer_question

QUERIES = [
    ("What is murder?",                                {"intent_hint": "DEFINITION", "must_have_sec": ["101","103"], "must_have_src": ["BNS"]}),
    ("What is robbery?",                               {"intent_hint": "DEFINITION", "must_have_sec": ["309","311"], "must_have_src": ["BNS"]}),
    ("What is cheating?",                              {"intent_hint": "DEFINITION", "must_have_sec": ["318","320"], "must_have_src": ["BNS"]}),
    ("What is forgery?",                               {"intent_hint": "DEFINITION", "must_have_sec": ["335","336"], "must_have_src": ["BNS"]}),
    ("What is assault?",                               {"intent_hint": "DEFINITION", "must_have_sec": ["130","131"], "must_have_src": ["BNS"]}),
    ("What is kidnapping?",                            {"intent_hint": "DEFINITION", "must_have_sec": ["137","140"], "must_have_src": ["BNS"]}),
    ("What is Section 103 of BNS?",                    {"intent_hint": "SECTION_LOOKUP", "must_have_sec": ["103"], "must_have_src": ["BNS"], "exact_sec_only": True}),
    ("Explain Section 308.",                           {"intent_hint": "SECTION_LOOKUP", "must_have_sec": ["308"], "must_have_src": ["BNS"]}),
    ("What is the punishment for robbery?",            {"intent_hint": "PUNISHMENT", "must_have_sec": ["311"], "must_have_src": ["BNS"]}),
    ("What is the punishment for murder?",             {"intent_hint": "PUNISHMENT", "must_have_sec": ["103"], "must_have_src": ["BNS"]}),
    ("A person slaps another person.",                 {"intent_hint": "SCENARIO", "must_have_sec": ["130","131"], "must_have_src": ["BNS"], "must_have_label": ["Likely Offence","Reason"]}),
    ("A child is kidnapped from school.",              {"intent_hint": "SCENARIO", "must_have_sec": ["137","140"], "must_have_src": ["BNS"], "must_have_label": ["Likely Offence","Reason"]}),
    ("Someone forges a signature.",                    {"intent_hint": "SCENARIO", "must_have_sec": ["335","336"], "must_have_src": ["BNS"], "must_have_label": ["Likely Offence","Reason"]}),
]

passed = 0
failed = 0
results = []
for i, (q, spec) in enumerate(QUERIES, 1):
    t0 = time.time()
    print("\n" + "#"*90)
    print(f"### QUERY {i}/{len(QUERIES)}: {q}")
    print("#"*90)
    try:
        ans = answer_question(q)
        raw = ans.get("answer","")
        dt = time.time() - t0
        print(f"[TIME] {dt:.1f}s")
        print("--- ANSWER ---")
        print(raw[:1500])
        if len(raw) > 1500: print(f"... ({len(raw)} chars total)")
        # checks
        checks_ok = True
        check_msgs = []
        for sec in spec.get("must_have_sec",[]):
            pat = r"Section\s+" + re.escape(sec)
            if not re.search(pat, raw, re.I):
                checks_ok = False
                check_msgs.append(f"MISSING Section {sec} mention")
        for src in spec.get("must_have_src",[]):
            if src.lower() not in raw.lower():
                checks_ok = False
                check_msgs.append(f"MISSING Source {src} mention")
        for lbl in spec.get("must_have_label",[]):
            if lbl.lower() not in raw.lower():
                checks_ok = False
                check_msgs.append(f"MISSING label '{lbl}'")
        # forbid hallucination / prompt leakage
        bad_tokens = ["Gazette of India", "Thinking", "Reasoning:", "Context:", "Prompt:", "Here is the context"]
        for bt in bad_tokens:
            if bt in raw:
                checks_ok = False
                check_msgs.append(f"FORBIDDEN token present: '{bt}'")
        status = "PASS" if checks_ok else "WARN"
        if status == "PASS": passed += 1
        else: failed += 1
        results.append({"idx":i,"query":q,"status":status,"time_sec":round(dt,1),"checks":check_msgs,
                        "intent":ans.get("intent"),"chunks_count":len(ans.get("retrieved_chunks",[]))})
        print(f"[RESULT] {status}: {check_msgs if check_msgs else 'all checks OK'}")
    except Exception as e:
        failed += 1
        dt = time.time() - t0
        tb = traceback.format_exc()
        print(f"[EXCEPTION] {type(e).__name__}: {e}")
        print(tb[-2000:])
        results.append({"idx":i,"query":q,"status":"CRASH","time_sec":round(dt,1),"error":str(e),"traceback":tb.splitlines()[-5:]})

print("\n" + "="*90)
print(f"SUMMARY: passed={passed} failed={failed} total={len(QUERIES)}")
print("="*90)
for r in results:
    print(f"  [{r['status']}] #{r['idx']} ({r['time_sec']}s) {r['query'][:60]}")
    if r['status']!="PASS":
        for k in ("checks","error","traceback"):
            if r.get(k): print(f"        {k}: {r[k]}")

with open(os.path.join(os.path.dirname(__file__), "inprocess_test_results.json"),"w") as f:
    json.dump({"passed":passed,"failed":failed,"results":results}, f, indent=2)
print("\nDetailed JSON written to inprocess_test_results.json")
sys.exit(0 if failed==0 else 1)
