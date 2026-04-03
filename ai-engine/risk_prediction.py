import hashlib
import os

import joblib
import pandas as pd

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')


def _safe_load(filename):
    path = os.path.join(MODEL_DIR, filename)
    if not os.path.exists(path):
        return None

    try:
        return joblib.load(path)
    except Exception:
        return None


def _clamp(value, minimum=0.05, maximum=0.98):
    return max(minimum, min(maximum, float(value)))


def _encode_location(location):
    normalized = str(location or '').strip().lower()
    if not normalized:
        return 0

    digest = hashlib.sha256(normalized.encode('utf-8')).hexdigest()
    return int(digest[:6], 16) % 1000


def _heuristic_risk(location, rainfall, temperature):
    normalized = str(location or '').strip().lower()
    rainfall = float(rainfall)
    temperature = float(temperature)

    metro_boost = 0.08 if any(city in normalized for city in ['mumbai', 'delhi', 'bengaluru', 'kolkata', 'chennai']) else 0.03
    weather_boost = min(rainfall / 30, 0.45) + max(temperature - 34, 0) / 35
    return _clamp(0.14 + metro_boost + weather_boost)


def load_artifacts():
    model = _safe_load('risk_model.pkl')
    location_encoder = _safe_load('location_encoder.pkl')
    return model, location_encoder


def predict_risk(location, rainfall, temperature):
    model, location_enc = load_artifacts()

    if model is None:
        return _heuristic_risk(location, rainfall, temperature)

    if location_enc is not None and hasattr(location_enc, 'classes_'):
        if location not in location_enc.classes_:
            location_encoded = -1
        else:
            location_encoded = int(location_enc.transform([location])[0])
    else:
        location_encoded = _encode_location(location)

    input_data = pd.DataFrame({
        'location_encoded': [location_encoded],
        'rainfall': [float(rainfall)],
        'temperature': [float(temperature)]
    })

    try:
        risk_score = model.predict(input_data)[0]
        return _clamp(risk_score)
    except Exception:
        return _heuristic_risk(location, rainfall, temperature)


if __name__ == '__main__':
    risk = predict_risk('New York', 5.2, 15.3)
    print(f'Risk score: {risk}')
