"""
risk_prediction.py
------------------
Predicts a risk score (0.0 – 1.0) for a given location + weather snapshot.
Uses a trained sklearn model when available. Falls back to a rule-based
heuristic if the model files are missing — so the service never crashes.
"""

import os
import pandas as pd

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

# ── Known high-risk cities in India (used by fallback heuristic) ──────────────
CITY_BASE_RISK = {
    'chennai':    0.75,
    'mumbai':     0.72,
    'delhi':      0.65,
    'kolkata':    0.68,
    'hyderabad':  0.55,
    'bengaluru':  0.50,
    'bangalore':  0.50,
    'pune':       0.45,
    'ahmedabad':  0.52,
    'jaipur':     0.48,
}

def _rule_based_risk(location: str, rainfall: float, temperature: float) -> float:
    """
    Fallback heuristic used when ML model files are not present.
    Produces a risk score from 0.0 (low) to 1.0 (extreme).
    """
    city_key = location.lower().split(',')[0].strip()
    base = CITY_BASE_RISK.get(city_key, 0.50)

    # Rainfall contribution (50mm = moderate risk, 100mm = high)
    rain_factor = min(rainfall / 100.0, 1.0) * 0.3

    # Heat contribution (42°C threshold = high risk)
    heat_factor = max(0, (temperature - 35) / 15.0) * 0.2

    score = base + rain_factor + heat_factor
    return round(min(score, 1.0), 3)


def _load_model_artifacts():
    """Load sklearn model and encoder if available. Returns (model, encoder) or (None, None)."""
    import joblib
    model_path   = os.path.join(MODEL_DIR, 'risk_model.pkl')
    encoder_path = os.path.join(MODEL_DIR, 'location_encoder.pkl')

    if not os.path.exists(model_path):
        return None, None

    model = joblib.load(model_path)

    # FIX: load encoder only if file exists — was crashing when missing
    encoder = None
    if os.path.exists(encoder_path):
        encoder = joblib.load(encoder_path)

    return model, encoder


def predict_risk(location: str, rainfall: float, temperature: float) -> float:
    """
    Predict risk score for a location + weather snapshot.
    Uses ML model when available, falls back to rule-based heuristic.

    Args:
        location:    City name (e.g. "Chennai", "Mumbai,IN")
        rainfall:    Rainfall in mm (3-hour accumulation)
        temperature: Temperature in °C

    Returns:
        float: Risk score 0.0 – 1.0
    """
    try:
        model, encoder = _load_model_artifacts()

        if model is None:
            # FIX: graceful fallback — no crash, just use heuristic
            print(f'[risk_prediction] Model not found, using rule-based fallback for "{location}"')
            return _rule_based_risk(location, rainfall, temperature)

        # Encode location
        if encoder is not None and location in encoder.classes_:
            location_encoded = int(encoder.transform([location])[0])
        else:
            location_encoded = -1   # unknown city → neutral encoding

        input_df = pd.DataFrame({
            'location_encoded': [location_encoded],
            'rainfall':         [float(rainfall)],
            'temperature':      [float(temperature)]
        })

        score = model.predict(input_df)[0]
        return round(float(score), 3)

    except Exception as e:
        print(f'[risk_prediction] Prediction error for "{location}": {e}. Using fallback.')
        return _rule_based_risk(location, rainfall, temperature)


if __name__ == '__main__':
    # Quick smoke test
    test_cases = [
        ('Chennai', 72.0, 34.0),
        ('Mumbai', 85.0, 29.0),
        ('Delhi', 5.0, 44.0),
        ('Bengaluru', 20.0, 28.0),
        ('UnknownCity', 0.0, 25.0),
    ]
    print('Risk score tests:')
    for city, rain, temp in test_cases:
        score = predict_risk(city, rain, temp)
        print(f'  {city:15s} rain={rain:5.1f}mm  temp={temp:4.1f}°C  →  score={score:.3f}')
