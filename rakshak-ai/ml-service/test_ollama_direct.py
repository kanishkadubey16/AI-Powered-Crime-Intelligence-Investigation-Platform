
import os
import requests
import json

OLLAMA_MODEL = "qwen3.5:0.8b"
OLLAMA_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

# Test a simple prompt
simple_prompt = """Answer the question: What is murder?

Answer:
"""

request_body = {
    "model": OLLAMA_MODEL,
    "prompt": simple_prompt,
    "stream": False,
    "options": {
        "temperature": 0.2,
        "top_p": 0.9,
        "num_predict": 400
    }
}

response = requests.post(
    f"{OLLAMA_URL}/api/generate",
    json=request_body,
    timeout=20
)

print("=== Raw Response ===")
print(json.dumps(response.json(), indent=2, ensure_ascii=False))
