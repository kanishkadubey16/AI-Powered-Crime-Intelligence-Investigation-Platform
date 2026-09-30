"""
splitter.py — Strict section-wise legal document chunker for Rakshak AI.

Each chunk corresponds to exactly ONE legal section (e.g. Section 101 of BNS).
Section 101 Title, Definition, Explanations, Illustrations, and Punishment (if within section)
remain in ONE single chunk. Never mix two sections in one chunk and never fragment
a section using character-based splitters.
"""

import re
from collections import defaultdict
from langchain_core.documents import Document

# ── Section title mapping for key sections across BNS, BNSS, BSA, COI ────────
KEY_SECTION_TITLES = {
    "BNS.pdf": {
        "2": "Definitions (Offence, Crime, etc.)",
        "100": "Culpable Homicide",
        "101": "Murder (Definition, Exceptions, and Explanations)",
        "102": "Culpable homicide by causing death of person other than person whose death was intended",
        "103": "Punishment for murder",
        "109": "Attempt to murder",
        "130": "Assault or criminal force to deter public servant from discharge of his duty",
        "131": "Assault or criminal force",
        "132": "Punishment for assault or criminal force otherwise than on grave and sudden provocation",
        "133": "Assault or criminal force on woman with intent to outrage her modesty",
        "137": "Kidnapping from India and from lawful guardianship",
        "138": "Abduction",
        "140": "Punishment for kidnapping or abducting in order to murder or for ransom etc.",
        "303": "Theft (Definition, Explanations, and Illustrations)",
        "305": "Theft in dwelling house, etc.",
        "308": "Extortion (Definition and Illustrations)",
        "309": "Robbery (Definition of Theft/Extortion as Robbery)",
        "310": "Dacoity (Definition and Illustrations)",
        "311": "Punishment for robbery",
        "312": "Attempt to commit robbery",
        "318": "Cheating (Definition and Explanation)",
        "319": "Cheating by personation",
        "320": "Punishment for cheating",
        "324": "Mischief (Definition, Explanations, and Illustrations)",
        "335": "Making a false document",
        "336": "Forgery (Definition, Explanations, Punishment)",
        "351": "Criminal intimidation and Assault",
    },
    "BNSS.pdf": {
        "172": "Information in cognizable cases",
        "173": "Information to police officer and power to investigate",
        "176": "Procedure for investigation",
        "179": "Police officer's power to require attendance of witnesses",
    },
    "BSA.pdf": {
        "57": "Facts which need not be proved",
        "63": "Admissibility of electronic records",
        "65": "Cases in which secondary evidence relating to documents may be given",
    },
    "coi.pdf": {
        "1": "Name and territory of the Union",
        "5": "Citizenship at the commencement of the Constitution",
        "14": "Equality before law",
        "19": "Protection of certain rights regarding freedom of speech, etc.",
        "21": "Protection of life and personal liberty",
    }
}

# Regex to detect section headers in BNS, BNSS, BSA, COI text
# Matches line start or newline followed by section number like "101.", "101.(1)", "Section 101"
_SECTION_HEADER_RE = re.compile(
    r"(?:^|\n)\s*(?:Section|Article)?\s*(\d{1,4})\s*\.\s*",
    re.MULTILINE
)

_TOC_LINE_RE = re.compile(r"\.{3,}|\u2026")


def _is_toc_text(text: str) -> bool:
    """Return True if text fragment is Table of Contents."""
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return True
    toc_count = sum(1 for l in lines if _TOC_LINE_RE.search(l))
    return (toc_count / len(lines)) > 0.35


def _extract_title_from_text(header_line: str, sec_num: str, source_filename: str) -> str:
    """Extract or look up clean title for section."""
    known = KEY_SECTION_TITLES.get(source_filename, {}).get(sec_num)
    if known:
        return known
    
    cleaned = re.sub(rf"^\s*(?:Section|Article)?\s*{sec_num}\.?\s*(\(\d+\))?\s*", "", header_line).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if len(cleaned) > 5 and not cleaned.lower().startswith(("whoever", "except", "when", "if")):
        return cleaned[:100].strip()
    return f"Section {sec_num}"


def split_documents(documents: list) -> list:
    """
    Section-wise splitting of legal PDF pages.

    Args:
        documents: List of Document objects (one per PDF page).

    Returns:
        List of Document objects where each object is exactly ONE legal section.
    """
    chunks: list[Document] = []
    pages_by_source: dict[str, list] = defaultdict(list)

    for doc in documents:
        src = doc.metadata.get("source", "unknown")
        pages_by_source[src].append(doc)

    for source, pages in pages_by_source.items():
        # Combine pages per PDF file to preserve cross-page sections
        full_text_parts = []
        page_offsets: list[tuple[int, int]] = []
        offset = 0

        for page_doc in pages:
            page_num = page_doc.metadata.get("page", 1)
            text = page_doc.page_content or ""
            page_offsets.append((offset, page_num))
            full_text_parts.append(text)
            offset += len(text) + 1

        full_text = "\n".join(full_text_parts)

        def _get_page_num(char_pos: int) -> int:
            pg = page_offsets[0][1]
            for start_off, p_num in page_offsets:
                if char_pos >= start_off:
                    pg = p_num
                else:
                    break
            return pg

        # Detect all section boundaries
        boundaries: list[tuple[int, str]] = []
        for m in _SECTION_HEADER_RE.finditer(full_text):
            sec_num = m.group(1)
            boundaries.append((m.start(), sec_num))

        if not boundaries:
            # Fallback for preamble or unformatted docs
            for page_doc in pages:
                if page_doc.page_content and not _is_toc_text(page_doc.page_content):
                    chunks.append(Document(
                        page_content=page_doc.page_content.strip(),
                        metadata={
                            "source": source,
                            "page": page_doc.metadata.get("page", 1),
                            "section_number": "",
                            "section_title": "",
                        }
                    ))
            continue

        # Create one chunk per section
        for i, (start, sec_num) in enumerate(boundaries):
            end = boundaries[i + 1][0] if i + 1 < len(boundaries) else len(full_text)
            section_raw_text = full_text[start:end].strip()

            if len(section_raw_text) < 30 or _is_toc_text(section_raw_text[:300]):
                continue

            first_line = section_raw_text.splitlines()[0] if section_raw_text.splitlines() else ""
            title = _extract_title_from_text(first_line, sec_num, source)
            page_num = _get_page_num(start)

            # Prepend Section Header to chunk text so title & section number are embedded in vector
            header_prefix = f"Section {sec_num}. {title}\n"
            if not section_raw_text.startswith(f"Section {sec_num}"):
                enriched_text = f"{header_prefix}{section_raw_text}"
            else:
                enriched_text = section_raw_text

            act_name = source.replace(".pdf", "").upper()
            chunks.append(Document(
                page_content=enriched_text,
                metadata={
                    "act": act_name,
                    "section": str(sec_num),
                    "section_number": str(sec_num),
                    "title": title,
                    "section_title": title,
                    "chapter": "",
                    "page": page_num,
                    "source": source,
                }
            ))

    return chunks

