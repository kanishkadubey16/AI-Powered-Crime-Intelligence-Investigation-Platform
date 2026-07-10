# =============================================================================
# app.py — Flask REST API entry point for Rakshak AI ML microservice
#
# Purpose:
#   Exposes three HTTP endpoints consumed by the Node.js backend
#   (services/mlService.js):
#
#   GET  /health
#       Returns service status and whether the model is loaded.
#       Used by the Node.js backend to check if the ML service is alive
#       before sending prediction requests.
#
#   GET  /model-status
#       Returns model metadata (MAE, R², training timestamp, feature list)
#       loaded from models/model.pkl.
#       Returns 503 if train.py has not been run yet.
#
#   POST /predict-time
#       Accepts a JSON body with crime investigation features and returns
#       the predicted number of investigation days plus a confidence score.
#
#       Request body (all fields required):
#           {
#             "crime_type"             : "Murder",
#             "severity"               : 4,
#             "evidence_count"         : 7,
#             "witness_count"          : 2,
#             "officer_workload"       : 10,
#             "previous_similar_cases" : 5
#           }
#
#       Success response (200):
#           {
#             "success"        : true,
#             "predicted_days" : 87,
#             "confidence"     : 0.85,
#             "message"        : "Estimated investigation time: 87 days"
#           }
#
#       Error responses:
#           400 — missing / invalid fields (validated by utils.validate_input)
#           503 — model not trained yet (models/model.pkl missing)
#           500 — unexpected server error
#
# Architecture notes:
#   - predict_investigation_time() is imported from predict.py which caches
#     the model in memory after the first call (lazy singleton pattern).
#   - validate_input() is called before predict to return a clean 400 instead
#     of a cryptic 500 on bad payloads.
#   - CORS is enabled for all origins in development; restrict in production.
#
# Usage:
#   python app.py                  # development
#   gunicorn app:app -w 2 -b 0.0.0.0:8000   # production
# =============================================================================

import os
from flask import Flask, request, jsonify
from flask_cors import CORS

from utils import validate_input

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# Lazy import of predict function — avoids loading model at import time
# ---------------------------------------------------------------------------

def _get_predictor():
    """
    Returns the predict_investigation_time function from predict.py.
    Imported lazily so the app starts even if model.pkl does not exist yet.
    """
    # TODO: import predict_investigation_time from predict
    # TODO: return the function
    pass


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    """
    Health check endpoint.
    Returns 200 with service name and model availability flag.
    """
    # TODO: try to import predict to check if model.pkl exists
    # TODO: set model_loaded = True / False accordingly
    # TODO: return jsonify with status, service name, model_loaded, and port
    pass


@app.route("/model-status", methods=["GET"])
def model_status():
    """
    Returns metadata about the currently loaded model.
    Returns 503 if train.py has not been run yet.
    """
    # TODO: load artifacts from models/model.pkl via pickle
    # TODO: return mae, r2, trained_at, feature_cols from artifacts
    # TODO: return 503 with helpful message if FileNotFoundError
    pass


@app.route("/predict-time", methods=["POST"])
def predict_time():
    """
    Main prediction endpoint.
    Validates input, calls predict_investigation_time(), returns result.
    """
    # TODO: parse JSON body — return 400 if missing
    # TODO: call validate_input(data) from utils — return 400 if invalid
    # TODO: extract all 6 feature fields from data
    # TODO: call _get_predictor()(crime_type, severity, ...) 
    # TODO: return success response with predicted_days, confidence, message
    # TODO: catch FileNotFoundError → 503 "Model not trained yet. Run train.py first."
    # TODO: catch generic Exception → 500
    pass


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print("=" * 55)
    print("  Rakshak AI — ML Microservice")
    print(f"  Running on http://localhost:{port}")
    print("  POST /predict-time  |  GET /health  |  GET /model-status")
    print("=" * 55)
    app.run(host="0.0.0.0", port=port, debug=False)
