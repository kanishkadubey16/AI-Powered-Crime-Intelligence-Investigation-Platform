from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Load predictor lazily
predictor = None

def get_predictor():
    global predictor
    if predictor is None:
        from predict import predict_investigation_time
        predictor = predict_investigation_time
    return predictor

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Rakshak AI ML Service"})

@app.route("/predict-time", methods=["POST"])
def predict_time():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON body provided"}), 400

        crime_type = data.get("crime_type", "other")
        severity = data.get("severity", "medium")
        witness_count = int(data.get("witness_count", 0))
        evidence_count = int(data.get("evidence_count", 0))
        officer_workload = int(data.get("officer_workload", 3))
        previous_similar_cases = int(data.get("previous_similar_cases", 0))

        predict_fn = get_predictor()
        result = predict_fn(
            crime_type, severity, witness_count,
            evidence_count, officer_workload, previous_similar_cases
        )

        return jsonify({
            "success": True,
            "predicted_days": result["predicted_days"],
            "confidence": result["confidence"],
            "message": f"Estimated investigation time: {result['predicted_days']} days",
        })

    except FileNotFoundError:
        return jsonify({
            "success": False,
            "predicted_days": None,
            "confidence": None,
            "message": "Model not trained yet. Run train.py first.",
        }), 503

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 ML Service running on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
