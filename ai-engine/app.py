"""
ai-engine/app.py
----------------
Flask microservice that exposes the Python ML models as HTTP endpoints.
The Node.js backend calls these instead of using hardcoded JS rules.

Run with:
    pip install flask joblib scikit-learn pandas
    python app.py

Then in your Node backend, call:
    POST http://localhost:5002/predict-risk
    POST http://localhost:5002/detect-fraud
"""

from flask import Flask, request, jsonify
from risk_prediction import predict_risk
import os

app = Flask(__name__)

# ── Risk prediction ──────────────────────────────────────────────────────────

@app.route('/predict-risk', methods=['POST'])
def risk_endpoint():
    data = request.get_json()

    required = ['location', 'rainfall', 'temperature']
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({ 'error': f'Missing fields: {", ".join(missing)}' }), 400

    try:
        score = predict_risk(
            data['location'],
            data['rainfall'],
            data['temperature']
        )
        return jsonify({ 'risk_score': score })
    except Exception as e:
        return jsonify({ 'error': str(e) }), 500


# ── Fraud detection (rule-based fallback — swap with ML model when ready) ───

@app.route('/detect-fraud', methods=['POST'])
def fraud_endpoint():
    data = request.get_json()

    required = ['amount', 'policyCoverage', 'claimCount30Days']
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({ 'error': f'Missing fields: {", ".join(missing)}' }), 400

    risk_score = 0
    reasons = []

    if data['claimCount30Days'] > 3:
        risk_score += 20
        reasons.append(f"High frequency: {data['claimCount30Days']} claims in 30 days")

    if data['amount'] > data['policyCoverage'] * 0.8:
        risk_score += 30
        reasons.append(f"Large amount: {data['amount']} > 80% of coverage")

    return jsonify({
        'isFraudulent': risk_score > 50,
        'riskScore': risk_score,
        'reasons': reasons
    })


# ── Health check ─────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({ 'status': 'ok' })


if __name__ == '__main__':
    port = int(os.environ.get('AI_ENGINE_PORT', 5002))
    print(f'AI engine running on port {port}')
    app.run(port=port, debug=os.environ.get('NODE_ENV') != 'production') 