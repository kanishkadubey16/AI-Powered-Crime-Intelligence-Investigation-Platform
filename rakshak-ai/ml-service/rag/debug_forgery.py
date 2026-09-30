import sys
sys.path.insert(0, '.')

from vectordb import get_vector_store

store = get_vector_store()
all_data = store.get(include=['documents', 'metadatas'])

print('=== Searching BNS Sections 335-350 for FORGERY definition ===')
for i, (doc, meta) in enumerate(zip(all_data['documents'], all_data['metadatas'])):
    if meta.get('source') == 'BNS.pdf':
        sec = meta.get('section_number', '')
        if sec in ['335','336','337','338','339','340','341','342','343','344','345','346','347','348','349','350','351','352','353','354','355','356','357','358','359','360','361']:
            title = meta.get('section_title')
            print(f'  Section {sec}: {title}')
            print(f'  Content (first 1000 chars):')
            print(doc[:1000])
            print('=' * 80)
