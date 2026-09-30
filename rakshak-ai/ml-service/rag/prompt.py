from langchain_core.prompts import PromptTemplate


def format_context_with_sources(docs):
    """Format retrieved legal sections into context string with section metadata."""
    context_parts = []
    for doc in docs:
        source = doc.metadata.get("source", "Unknown Document")
        page = doc.metadata.get("page", "N/A")
        sec_num = doc.metadata.get("section_number", "")
        sec_title = doc.metadata.get("section_title", "")
        
        header = f"--- Document: {source} | Page: {page}"
        if sec_num:
            header += f" | Section {sec_num}"
        if sec_title:
            header += f": {sec_title}"
        header += " ---"
        
        context_parts.append(f"{header}\n{doc.page_content.strip()}")
    return "\n\n".join(context_parts)


SIMPLE_PROMPT_TEMPLATE = """You are Rakshak AI, an expert AI Legal Assistant for Indian Police Officers.

Your task is to answer legal questions by extracting information from the provided legal context and rewriting it in simple, plain English.

STRICT INSTRUCTIONS:
1. Definition: Rewrite the legal definition in plain English while preserving the legal meaning. NEVER copy the Act verbatim (e.g. do not say "Whoever commits murder..."). DO NOT copy the punishment paragraph as the definition.
2. Applicable Section: Output ONLY the Section number and Act name (e.g. "Section 101, Bharatiya Nyaya Sanhita (BNS), 2023"). Do not write sentences here.
3. If no definition exists for the queried term in the context, clearly state: "The uploaded legal documents do not contain a direct definition of '[term]'."
4. Do NOT output any "Thinking", "Reasoning", or internal thoughts. Return only the final output.

Retrieved Legal Context:
{context}

User Question: {question}

Respond exactly in this structured format:

Definition:
<Your plain English rewritten definition here>

Applicable Section:
<Primary section and Act name here>
"""

SIMPLE_PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template=SIMPLE_PROMPT_TEMPLATE,
)

