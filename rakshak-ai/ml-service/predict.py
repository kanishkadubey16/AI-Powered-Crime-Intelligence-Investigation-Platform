import pickle
import numpy as np
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "model.pkl")

_artifacts = None

def load_model():
    global _artifacts
    if _artifacts is None:
        with open(MODEL_PATH, "rb") as f:
            _artifacts = pickle.load(f)
    return _artifacts

def predict_investigation_time(crime_type, severity, witness_count, evidence_count, officer_workload, previous_similar_cases):
    artifacts = load_model()
    model = artifacts["model"]
    le_crime = artifacts["le_crime"]
    le_severity = artifacts["le_severity"]

    # Handle unseen labels gracefully
    if crime_type not in le_crime.classes_:
        crime_type = "other"
    if severity not in le_severity.classes_:
        severity = "medium"

    crime_enc = le_crime.transform([crime_type])[0]
    severity_enc = le_severity.transform([severity])[0]

    features = np.array([[crime_enc, severity_enc, witness_count, evidence_count, officer_workload, previous_similar_cases]])
    predicted_days = int(model.predict(features)[0])

    # Confidence based on feature completeness
    filled = sum([witness_count > 0, evidence_count > 0, previous_similar_cases > 0])
    confidence = round(0.6 + (filled / 3) * 0.35, 2)

    return {
        "predicted_days": predicted_days,
        "confidence": confidence,
        "crime_type": crime_type,
        "severity": severity,
    }
