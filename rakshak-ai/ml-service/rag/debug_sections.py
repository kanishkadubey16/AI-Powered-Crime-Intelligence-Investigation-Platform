import sys
sys.path.insert(0, '.')

from vectordb import get_vector_store
import re

store = get_vector_store()
all_data = store.get(include=['documents', 'metadatas'])

print('=== Searching for FORGERY definition section ===')
for i, (doc, meta) in enumerate(zip(all_data['documents'], all_data['metadatas'])):
    if meta.get('source') == 'BNS.pdf':
        doc_lower = doc.lower()
        sec = meta.get('section_number', '')
        if 'forgery' in doc_lower and (sec in ['336','337','338','339','340','341','342','343','344','345','346','347','348','349','350'] or 'false document' in doc_lower[:1500]):
            title = meta.get('section_title')
            print(f'  Section {sec}: {title}')
            print(f'  Preview: {doc[:400]}')
            print('---')

print()
print('=== Searching for KIDNAPPING definition section ===')
for i, (doc, meta) in enumerate(zip(all_data['documents'], all_data['metadatas'])):
    if meta.get('source') == 'BNS.pdf':
        doc_lower = doc.lower()
        sec = meta.get('section_number', '')
        if sec in ['136','137','138','139','140','141','142','143','144','145','146','147','148','149','150']:
            title = meta.get('section_title')
            print(f'  Section {sec}: {title}')
            print(f'  Preview: {doc[:500]}')
            print('---')

print()
print('=== Searching for CHEATING definition section ===')
for i, (doc, meta) in enumerate(zip(all_data['documents'], all_data['metadatas'])):
    if meta.get('source') == 'BNS.pdf':
        doc_lower = doc.lower()
        sec = meta.get('section_number', '')
        if sec in ['317','318','319','320','321','322','323','324','325']:
            title = meta.get('section_title')
            print(f'  Section {sec}: {title}')
            print(f'  Preview: {doc[:600]}')
            print('---')

print()
print('=== Searching for ASSAULT/CRIMINAL FORCE sections ===')
for i, (doc, meta) in enumerate(zip(all_data['documents'], all_data['metadatas'])):
    if meta.get('source') == 'BNS.pdf':
        doc_lower = doc.lower()
        sec = meta.get('section_number', '')
        if sec in ['130','131','132','133','134','135']:
            title = meta.get('section_title')
            print(f'  Section {sec}: {title}')
            print(f'  Preview: {doc[:600]}')
            print('---')
