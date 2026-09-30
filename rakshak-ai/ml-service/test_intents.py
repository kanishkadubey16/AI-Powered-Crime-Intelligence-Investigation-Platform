import requests
import json

queries = [
    "What is murder?",
    "What is robbery?",
    "What is extortion?",
    "What is kidnapping?",
    "What is assault?",
    "What is the punishment for murder?",
    "What is the punishment for robbery?",
    "What is the punishment for assault?",
    "What is Section 101 BNS?",
    "What is Section 309 BNS?",
    "Explain murder in simple language.",
    "A person points a gun at another person and steals money. What offence applies?",
    "What is cybercrime?",
    "What is digital evidence?"
]

for query in queries:
    print(f"\n==========================================")
    print(f"QUERY: {query}")
    print(f"==========================================")
    try:
        response = requests.post(
            "http://localhost:8000/legal-query",
            json={"question": query},
            timeout=180
        )
        print("Status Code:", response.status_code)
        data = response.json()
        print(json.dumps(data, indent=2))
    except Exception as e:
        print("Error:", e)
        if 'response' in locals():
            print("Raw:", response.text)
