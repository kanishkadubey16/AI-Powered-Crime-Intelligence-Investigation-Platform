#!/usr/bin/env python3
import sys
sys.path.insert(0, 'rag')
from vectordb import get_vector_store
store = get_vector_store()
for sec in ['335','320','131','140','103','311']:
    res = store.get(where={'section_number': sec})
    n = len(res['documents']) if res else 0
    srcs = set()
    if res:
        for m in res['metadatas']: srcs.add(m.get('source'))
    print(f'Section {sec}: {n} chunks, sources={srcs}')
    if n>0:
        print('  Titles:', [m.get('section_title','') for m in res['metadatas'][:3]])
print()
print('--- Retriever debug: What is forgery? (DEFINITION intent) ---')
from retriever import retrieve_relevant_chunks
chunks = retrieve_relevant_chunks('What is forgery?', intent='DEFINITION')
print(f'Total chunks returned: {len(chunks)}')
for i,c in enumerate(chunks):
    m=c.metadata
    print(f'  [{i+1}] Sec={m.get("section_number")} Src={m.get("source")} Title={m.get("section_title","N/A")[:60]}')
print()
print('--- Retriever debug: A person slaps another person. (SCENARIO intent) ---')
chunks2 = retrieve_relevant_chunks('A person slaps another person.', intent='SCENARIO')
print(f'Total chunks returned: {len(chunks2)}')
for i,c in enumerate(chunks2):
    m=c.metadata
    print(f'  [{i+1}] Sec={m.get("section_number")} Src={m.get("source")} Title={m.get("section_title","N/A")[:60]}')
