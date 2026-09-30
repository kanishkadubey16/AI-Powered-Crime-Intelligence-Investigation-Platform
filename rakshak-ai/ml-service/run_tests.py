import requests
import json
import time

ML_URL = "http://localhost:8000"

QUESTIONS = [
    "What is robbery?",
    "What is murder?",
    "What is assault?",
    "Difference between theft and robbery.",
    "Can police arrest without warrant?",
    "If one person slaps another what offence is committed?",
    "Explain Section 309 BNS."
]

def check_health():
    print("Checking ML service health...")
    try:
        resp = requests.get(f"{ML_URL}/health", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        print(f"Health OK: Model={data.get('model')}, Vector DB Loaded={data.get('vector_db_loaded')}")
        return True
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_queries():
    print("\n" + "="*50)
    print("TESTING QUERIES")
    print("="*50)
    
    passed = 0
    for i, q in enumerate(QUESTIONS):
        print(f"\n[{i+1}/{len(QUESTIONS)}] Question: {q}")
        try:
            start_time = time.time()
            resp = requests.post(f"{ML_URL}/legal-query", json={"question": q}, timeout=60)
            elapsed = time.time() - start_time
            
            if resp.status_code != 200:
                print(f"❌ FAILED (HTTP {resp.status_code}): {resp.text}")
                continue
                
            data = resp.json()
            if not data.get("success"):
                print(f"❌ FAILED: {data.get('message', 'Unknown error')}")
                continue
                
            answer = data.get("answer", "")
            
            # Validation
            has_definition = "Definition:" in answer
            has_section = "Applicable Section:" in answer
            has_punishment = "Punishment:" in answer
            has_source = "Source:" in answer
            no_think = "<think>" not in answer.lower() and "thinking process" not in answer.lower()
            no_placeholder = "<complete" not in answer.lower() and "..." not in answer
            no_illustration_dump = "Illustration" not in answer or "slaps" in q.lower()
            
            # Additional check to ensure the definition isn't just the raw section text
            # E.g., it shouldn't just be "309.(1) In all robbery..."
            is_summarized = not (answer.strip().startswith("Definition:\n309") or answer.strip().startswith("Definition:\n103"))
            
            is_valid = (has_definition and has_section and has_punishment and has_source 
                        and no_think and no_placeholder and no_illustration_dump and is_summarized)
            
            if is_valid:
                print(f"✅ SUCCESS ({elapsed:.2f}s)")
                print("-" * 40)
                print(answer[:350] + ("...\n(truncated)" if len(answer) > 350 else ""))
                print("-" * 40)
                passed += 1
            else:
                print(f"❌ FAILED VALIDATION ({elapsed:.2f}s)")
                print(f"Has Definition: {has_definition}")
                print(f"Has Section: {has_section}")
                print(f"Has Punishment: {has_punishment}")
                print(f"Has Source: {has_source}")
                print(f"No Leakage: {no_think}")
                print(f"No Placeholders: {no_placeholder}")
                print(f"No Illustration Dump: {no_illustration_dump}")
                print(f"Is Summarized: {is_summarized}")
                print("-" * 40)
                print(answer)
                print("-" * 40)
                
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            
    print("\n" + "="*50)
    print(f"SUMMARY: {passed}/{len(QUESTIONS)} PASSED")
    print("="*50)

if __name__ == "__main__":
    if check_health():
        test_queries()
