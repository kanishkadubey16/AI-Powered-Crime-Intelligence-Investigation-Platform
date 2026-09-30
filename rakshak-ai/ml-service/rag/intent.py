import re

LEGAL_KEYWORDS = [
    r"\bbns\b", r"\bbnss\b", r"\bbsa\b", r"\bipc\b", r"\bcrpc\b",
    r"\bcrime\b", r"\boffence\b", r"\boffense\b", r"\bmurder\b", r"\brobbery\b",
    r"\btheft\b", r"\bdacoity\b", r"\bassault\b", r"\bcheating\b", r"\bextortion\b",
    r"\brape\b", r"\bkidnapping\b", r"\babduction\b", r"\bhomicide\b", r"\bbail\b",
    r"\bfir\b", r"\binvestigation\b", r"\bevidence\b", r"\bpolice\b", r"\bcourt\b",
    r"\bconstitution\b", r"\brights\b", r"\blegal\b", r"\blaw\b", r"\bcybercrime\b",
    r"\bdigital\s+evidence\b", r"\bforensic\s+evidence\b", r"\bforensic\b",
    r"\bjustice\b", r"\bwarrant\b", r"\barrest\b", r"\bcustody\b", r"\bcharge\s*sheet\b",
    r"\bcognizable\b", r"\bnon-cognizable\b", r"\bact\b", r"\bsanhita\b", r"\badhiniyam\b", r"\bsuraksha\b",
    r"\bforger\w*\b", r"\bforged\b", r"\bfalse\s+document\b", r"\bcounterfeit\b",
    r"\bmischief\b", r"\bcriminal\s+force\b", r"\bcriminal\s+intimidation\b",
    r"\bwrongful\s+restraint\b", r"\bwrongful\s+confinement\b",
    r"\bsignature\b", r"\bvaluable\s+security\b", r"\bproperty\s+mark\b",
    r"\bpersonation\b", r"\bdeception\b", r"\bdishonest\b", r"\bfraud\b",
]

CASUAL_PATTERNS = [
    r"^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b",
    r"^how\s+are\s+you",
    r"^what('s|\s+is)\s+up",
    r"^who\s+are\s+you",
    r"^what\s+can\s+you\s+do",
    r"^thank\s*(you|s)",
]

GENERAL_KNOWLEDGE_PATTERNS = [
    r"\b(artificial\s+intelligence|ai|machine\s+learning|python|programming|coding|software|computer)\b",
    r"\b(cricket|world\s+cup|football|sports|game|movie|music|capital\s+of|weather)\b",
    r"\bwho\s+(invented|created|discovered|won|wrote)\b",
]

SCENARIO_PATTERNS = [
    r"\b(a\s+person|someone|an\s+individual|if\s+a\s+person|when\s+someone|a\s+child|a\s+boy|a\s+girl|a\s+man|a\s+woman|the\s+accused|any\s+person|one\s+person|another\s+person)\b",
    r"\b(what\s+offence|what\s+crime|what\s+charge|which\s+section)\s+(applies|is\s+this|is\s+committed|applies\?)\b",
    r"\b(points?\s+a\s+gun|threatens?|threatened|slaps?|slapped|steals?|stole|stolen|takes?|took|kills?|killed|murders?|murdered|kidnaps?|kidnapped|abducts?|abducted|forges?|forged|cheats?|cheated|assaults?|assaulted|injures?|injured|hits?|hit|punches?|punched|stabs?|stabbed|rapes?|raped|defrauds?|defrauded|blackmails?|blackmailed)\b",
    r"\b(is\s+caught|is\s+arrested|found\s+guilty|commits?\s+(a|an)?\s*(crime|offence)|is\s+found|at\s+the\s+scene|from\s+school|from\s+home|without\s+consent)\b",
]

def classify_intent(question: str) -> str:
    """
    Classify query into specific intents:
    - DEFINITION
    - PUNISHMENT
    - SECTION_LOOKUP
    - SCENARIO
    - PROCEDURE
    - GENERAL_LEGAL
    - GENERAL
    """
    if not question or not question.strip():
        return "GENERAL"

    q_clean = question.strip().lower()

    # 1. Check for casual greetings / chat
    for pat in CASUAL_PATTERNS:
        if re.search(pat, q_clean):
            return "GENERAL"

    # 2. Check for Section Lookup
    if re.search(r"\b(?:section|sec\.?|article|art\.?)\s*(\d{1,4}[a-z]?)\b", q_clean):
        return "SECTION_LOOKUP"

    # 3. Check for Punishment
    if re.search(r"\b(punishment|penalty|sentence|imprisonment|fine|jail)\b", q_clean):
        return "PUNISHMENT"

    # 3b. Comparison between concepts / sections
    if re.search(r"\b(difference|compare|comparison|versus|vs\.?|distinguish)\b", q_clean):
        return "COMPARISON"

    # 4. Check for Scenario / Case study
    if any(re.search(pat, q_clean) for pat in SCENARIO_PATTERNS) and not re.search(r"^(what\s+is|explain|define)\s+(murder|robbery|assault|extortion|kidnapping|theft)\b", q_clean):
        return "SCENARIO"

    # 5. Check for Procedure
    if re.search(r"\b(how\s+is|how\s+to|procedure|steps|process|register|file)\b", q_clean) and \
       re.search(r"\b(fir|arrest|bail|investigation|complaint|warrant)\b", q_clean):
        return "PROCEDURE"

    # 6. Check for Definition
    if re.search(r"^(what\s+is|explain|define|describe|meaning\s+of)\b", q_clean) and \
       any(re.search(pat, q_clean) for pat in LEGAL_KEYWORDS):
        return "DEFINITION"
        
    if re.search(r"\b(murder|robbery|assault|kidnapping|theft|dacoity|extortion)\b", q_clean) and not re.search(r"^(who|when|where)", q_clean):
        return "DEFINITION"

    # 7. Check for general legal keywords
    for pat in LEGAL_KEYWORDS:
        if re.search(pat, q_clean):
            return "GENERAL_LEGAL"

    # 8. Check for obvious non-legal general knowledge questions
    for pat in GENERAL_KNOWLEDGE_PATTERNS:
        if re.search(pat, q_clean):
            return "GENERAL"

    # 9. Fallback heuristics: If question asks "what is X" or "how to X" where X has no legal terms
    if re.search(r"^(what|who|where|when|why|how)\b", q_clean):
        return "GENERAL"

    return "GENERAL_LEGAL"
