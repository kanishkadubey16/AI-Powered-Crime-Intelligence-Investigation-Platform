import requests
import json

queries = [
    "What is murder?",
    "What is robbery?",
    "What is Section 101?",
    "What is Section 309?",
    "What is punishment of murder?",
]

for query in queries:
    print(f"\\n--- Query: {query} ---")
    response = requests.post(
        "http://localhost:8000/legal-query",
        json={"question": query},
        timeout=180
    )
    print("Status Code:", response.status_code)
    try:
        data = response.json()
        print(json.dumps(data, indent=2))
    except Exception as e:
        print("Failed to parse JSON:", e)
        print("Raw Response:", response.text)
