import sys
import os
import time
import tracemalloc
import json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "rag"))
from rag_chain import answer_question, OLLAMA_MODEL, is_model_installed

def main():
    test_questions = [
        "What is murder?",
        "What is robbery?",
        "What is assault?",
        "What is theft?",
        "What is dacoity?",
        "What is crime?"
    ]
    
    # Track stats
    results = []
    total_time = 0.0
    peak_ram = 0
    
    print("=" * 80)
    print("STARTING RAKSHAK AI LEGAL RAG TEST SUITE")
    print("=" * 80)
    
    # Check model
    fallback_models = [OLLAMA_MODEL, "llama3.2:3b", "qwen2.5:3b", "gemma3:4b"]
    selected_model = None
    for model in fallback_models:
        if is_model_installed(model):
            selected_model = model
            break
    print(f"\n📦 Selected model: {selected_model}\n")
    
    for question in test_questions:
        print("\n" + "=" * 80)
        print(f"TEST QUESTION: {question}")
        print("=" * 80)
        
        # Start tracking
        tracemalloc.start()
        start_time = time.time()
        
        # Run the question
        result = answer_question(question)
        
        # End tracking
        end_time = time.time()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        # Calculate stats
        response_time = end_time - start_time
        total_time += response_time
        peak_ram = max(peak_ram, peak)
        
        # Verify requirements
        answer_text = result.get("answer", "").lower()
        checks = {
            "Response time <15s": response_time < 15,
            "No 'Thinking...'": "thinking" not in answer_text and "wait" not in answer_text,
            "No prompt leakage": "you are rakshak" not in answer_text and "answer only" not in answer_text,
            "Has Definition": "definition:" in answer_text or "definition" in answer_text,
            "Has Applicable Section": "applicable section:" in answer_text or "section" in answer_text
        }
        
        # Store result
        results.append({
            "question": question,
            "response_time": round(response_time, 2),
            "peak_ram_kb": round(peak / 1024, 2),
            "checks": checks,
            "answer": result.get("answer", ""),
            "sources": result.get("sources", [])
        })
        
        # Print check results
        print("\n📊 CHECKS:")
        for check, passed in checks.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"  {status}: {check}")
        
        print(f"\n⏱️  Response time: {response_time:.2f}s")
        print(f"💾 Peak RAM: {peak / 1024 / 1024:.2f}MB")
        print(f"\n📝 ANSWER:\n{result.get('answer', 'N/A')}")
    
    # Calculate average stats
    avg_time = total_time / len(test_questions) if test_questions else 0
    peak_ram_mb = peak_ram / 1024 / 1024
    
    # Generate report
    print("\n" + "=" * 80)
    print("FINAL REPORT")
    print("=" * 80)
    print(f"\n📦 Current model: {selected_model}")
    print(f"⏱️  Average response time: {avg_time:.2f}s")
    print(f"💾 Peak RAM usage: {peak_ram_mb:.2f}MB")
    print("\n📂 Modified files:")
    modified_files = [
        "rakshak-ai/ml-service/rag/splitter.py",
        "rakshak-ai/ml-service/rag/retriever.py",
        "rakshak-ai/ml-service/rag/vectordb.py",
        "rakshak-ai/ml-service/rag/prompt.py",
        "rakshak-ai/ml-service/rag/rag_chain.py",
        "rakshak-ai/ml-service/rag/rebuild_index.py"
    ]
    for f in modified_files:
        print(f"  - {f}")
    
    # Save detailed results to JSON
    with open("test_results.json", "w", encoding="utf-8") as f:
        json.dump({
            "selected_model": selected_model,
            "average_response_time": round(avg_time, 2),
            "peak_ram_mb": round(peak_ram_mb, 2),
            "results": results
        }, f, indent=2, ensure_ascii=False)
    print("\n✅ Detailed results saved to test_results.json")

if __name__ == "__main__":
    main()

