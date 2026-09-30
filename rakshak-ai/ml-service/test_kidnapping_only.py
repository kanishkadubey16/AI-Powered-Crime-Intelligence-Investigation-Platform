import sys
sys.path.insert(0, "rag")
from rag_chain import answer_question
import json

print("Testing kidnapping question:")
result = answer_question("What is kidnapping?")
print("="*80)
print("Final result:", json.dumps(result, indent=2))
