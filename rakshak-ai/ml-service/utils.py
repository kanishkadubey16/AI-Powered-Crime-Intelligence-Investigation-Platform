# =============================================================================
# utils.py — Shared utility functions for the Rakshak AI ML microservice
#
# Purpose:
#   Provides reusable helpers consumed by both train.py and predict.py:
#     - CRIME_TYPES / SEVERITY_RANGE constants so every file agrees on the
#       same vocabulary and numeric bounds
#     - encode_features()   : converts raw input dict → numpy feature vector
#     - validate_input()    : checks that incoming API payload has valid values
#       and clamps numerics to expected ranges
#     - compute_confidence(): estimates prediction confidence from feature
#       completeness (more evidence/witnesses → higher confidence)
#     - get_model_path()    : returns the absolute path to model.pkl regardless
#       of the working directory the process was launched from
#
# Used by:
#   train.py   — imports CRIME_TYPES, SEVERITY_RANGE, get_model_path
#   predict.py — imports encode_features, validate_input, compute_confidence,
#                get_model_path
#   app.py     — imports validate_input for request-level validation
# =============================================================================

import os
import numpy as np

# ---------------------------------------------------------------------------
# Constants — single source of truth for all valid categorical values
# ---------------------------------------------------------------------------

CRIME_TYPES = [
    "Theft",
    "Robbery",
    "Murder",
    "Cyber Crime",
    "Fraud",
    "Kidnapping",
    "Assault",
    "Drug Trafficking",
    "Domestic Violence",
]

# Severity is stored as an integer 1–5 in the dataset
SEVERITY_MIN = 1
SEVERITY_MAX = 5

# Numeric feature bounds (used for clamping and validation)
FEATURE_BOUNDS = {
    "Severity":              (SEVERITY_MIN, SEVERITY_MAX),
    "EvidenceCount":         (0, 30),
    "WitnessCount":          (0, 15),
    "OfficerWorkload":       (1, 25),
    "PreviousSimilarCases":  (0, 50),
}

# Ordered list of feature columns the model was trained on
# Order MUST match the column order used in train.py
FEATURE_COLUMNS = [
    "CrimeType_enc",
    "Severity",
    "EvidenceCount",
    "WitnessCount",
    "OfficerWorkload",
    "PreviousSimilarCases",
]


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def get_model_path() -> str:
    """
    Returns the absolute path to models/model.pkl.
    Works correctly regardless of which directory the process was started from.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "models", "model.pkl")


def get_dataset_path() -> str:
    """
    Returns the absolute path to datasets/dataset.csv.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "datasets", "dataset.csv")


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

def validate_input(data: dict) -> tuple[bool, str]:
    """
    Validates a raw API request payload.

    Parameters
    ----------
    data : dict
        Keys expected: crime_type, severity, evidence_count,
                       witness_count, officer_workload, previous_similar_cases

    Returns
    -------
    (is_valid: bool, error_message: str)
        error_message is empty string when is_valid is True.
    """
    crime_type = data.get("crime_type", "")
    if crime_type not in CRIME_TYPES:
        return False, (
            f"Invalid crime_type '{crime_type}'. "
            f"Must be one of: {', '.join(CRIME_TYPES)}"
        )

    severity = data.get("severity")
    try:
        severity = int(severity)
        if not (SEVERITY_MIN <= severity <= SEVERITY_MAX):
            raise ValueError
    except (TypeError, ValueError):
        return False, f"severity must be an integer between {SEVERITY_MIN} and {SEVERITY_MAX}."

    numeric_fields = {
        "evidence_count":        FEATURE_BOUNDS["EvidenceCount"],
        "witness_count":         FEATURE_BOUNDS["WitnessCount"],
        "officer_workload":      FEATURE_BOUNDS["OfficerWorkload"],
        "previous_similar_cases": FEATURE_BOUNDS["PreviousSimilarCases"],
    }
    for field, (lo, hi) in numeric_fields.items():
        val = data.get(field)
        try:
            val = int(val)
            if not (lo <= val <= hi):
                return False, f"{field} must be between {lo} and {hi}."
        except (TypeError, ValueError):
            return False, f"{field} must be a valid integer."

    return True, ""


# ---------------------------------------------------------------------------
# Feature encoding
# ---------------------------------------------------------------------------

def encode_features(crime_type: str, severity: int, evidence_count: int,
                    witness_count: int, officer_workload: int,
                    previous_similar_cases: int,
                    label_encoder) -> np.ndarray:
    """
    Converts raw input values into the numpy feature vector expected by the
    trained RandomForest model.

    Parameters
    ----------
    crime_type            : str  — one of CRIME_TYPES
    severity              : int  — 1 to 5
    evidence_count        : int  — 0 to 30
    witness_count         : int  — 0 to 15
    officer_workload      : int  — 1 to 25
    previous_similar_cases: int  — 0 to 50
    label_encoder         : sklearn LabelEncoder fitted on CrimeType column

    Returns
    -------
    np.ndarray of shape (1, 6) ready to pass to model.predict()
    """
    # Handle unseen crime type gracefully — fall back to most common class
    if crime_type not in label_encoder.classes_:
        crime_type = "Theft"

    crime_enc = label_encoder.transform([crime_type])[0]

    # Clamp all numerics to their valid ranges
    severity              = int(np.clip(severity,               SEVERITY_MIN,                        SEVERITY_MAX))
    evidence_count        = int(np.clip(evidence_count,         *FEATURE_BOUNDS["EvidenceCount"]))
    witness_count         = int(np.clip(witness_count,          *FEATURE_BOUNDS["WitnessCount"]))
    officer_workload      = int(np.clip(officer_workload,       *FEATURE_BOUNDS["OfficerWorkload"]))
    previous_similar_cases = int(np.clip(previous_similar_cases, *FEATURE_BOUNDS["PreviousSimilarCases"]))

    return np.array([[
        crime_enc,
        severity,
        evidence_count,
        witness_count,
        officer_workload,
        previous_similar_cases,
    ]], dtype=float)


# ---------------------------------------------------------------------------
# Confidence scoring
# ---------------------------------------------------------------------------

def compute_confidence(evidence_count: int, witness_count: int,
                       previous_similar_cases: int) -> float:
    """
    Estimates prediction confidence on a 0.0–1.0 scale.

    Logic:
      - Base confidence: 0.55 (model alone, no supporting data)
      - +0.15 if evidence_count  > 0  (physical evidence available)
      - +0.15 if witness_count   > 0  (witness testimony available)
      - +0.15 if previous_similar_cases > 0 (historical pattern available)

    Returns
    -------
    float rounded to 2 decimal places, clamped to [0.0, 1.0]
    """
    score = 0.55
    if evidence_count        > 0: score += 0.15
    if witness_count         > 0: score += 0.15
    if previous_similar_cases > 0: score += 0.15
    return round(min(score, 1.0), 2)
