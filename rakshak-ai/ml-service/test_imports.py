
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "rag"))
print("Testing imports...")
import retriever
print("✓ retriever imported")
import rag_chain
print("✓ rag_chain imported")
print("✓ All imports okay")
