import joblib
import pandas as pd
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')

def load_artifacts():
    model            = joblib.load(os.path.join(MODEL_DIR, 'risk_model.pkl'))
    location_encoder = joblib.load(os.path.join(MODEL_DIR, 'location_encoder.pkl'))
    return model, location_encoder

def predict_risk(location, rainfall, temperature):
    model, location_enc = load_artifacts()

    # Handle unseen location gracefully
    if location not in location_enc.classes_:
        location_encoded = -1  # unknown → neutral
    else:
        location_encoded = int(location_enc.transform([location])[0])

    input_data = pd.DataFrame({
        'location_encoded': [location_encoded],
        'rainfall':         [float(rainfall)],
        'temperature':      [float(temperature)]
    })

    risk_score = model.predict(input_data)[0]
    return float(risk_score)

if __name__ == '__main__':
    risk = predict_risk('New York', 5.2, 15.3)
    print(f'Risk score: {risk}')