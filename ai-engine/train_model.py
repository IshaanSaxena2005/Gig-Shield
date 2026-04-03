"""
train_model.py
--------------
Generates a synthetic training dataset and trains a RandomForest risk model.

Real production system would use 5-year IMD historical rainfall + CPCB AQI
data. This synthetic version creates statistically plausible distributions
based on known Indian city climatology for the hackathon demo.

Run: python train_model.py
Outputs: models/risk_model.pkl, models/location_encoder.pkl
"""

import os
import random
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, 'data', 'weather_history.csv')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# City climate profiles (mean rainfall mm, mean temp °C, baseline claim probability)
CITY_PROFILES = {
    'Chennai':   { 'rain_mean': 45, 'rain_std': 35, 'temp_mean': 33, 'temp_std': 4,  'base_prob': 0.72 },
    'Mumbai':    { 'rain_mean': 55, 'rain_std': 40, 'temp_mean': 30, 'temp_std': 3,  'base_prob': 0.70 },
    'Delhi':     { 'rain_mean': 15, 'rain_std': 20, 'temp_mean': 31, 'temp_std': 9,  'base_prob': 0.65 },
    'Kolkata':   { 'rain_mean': 40, 'rain_std': 30, 'temp_mean': 31, 'temp_std': 5,  'base_prob': 0.68 },
    'Hyderabad': { 'rain_mean': 25, 'rain_std': 22, 'temp_mean': 33, 'temp_std': 6,  'base_prob': 0.55 },
    'Bengaluru': { 'rain_mean': 22, 'rain_std': 18, 'temp_mean': 27, 'temp_std': 3,  'base_prob': 0.50 },
    'Pune':      { 'rain_mean': 18, 'rain_std': 15, 'temp_mean': 28, 'temp_std': 4,  'base_prob': 0.45 },
    'Ahmedabad': { 'rain_mean': 12, 'rain_std': 15, 'temp_mean': 35, 'temp_std': 7,  'base_prob': 0.52 },
    'Jaipur':    { 'rain_mean': 10, 'rain_std': 12, 'temp_mean': 32, 'temp_std': 8,  'base_prob': 0.48 },
    'Surat':     { 'rain_mean': 20, 'rain_std': 18, 'temp_mean': 32, 'temp_std': 5,  'base_prob': 0.53 },
}

def generate_synthetic_data(n_samples=600, seed=42):
    """Generate n_samples rows of synthetic weather + claim probability data."""
    random.seed(seed)
    np.random.seed(seed)

    rows = []
    cities = list(CITY_PROFILES.keys())

    for _ in range(n_samples):
        city    = random.choice(cities)
        profile = CITY_PROFILES[city]

        # Sample weather from city distribution
        rainfall    = max(0, np.random.normal(profile['rain_mean'],  profile['rain_std']))
        temperature = max(15, np.random.normal(profile['temp_mean'], profile['temp_std']))

        # Compute claim probability as function of weather + city base
        rain_factor = min(rainfall / 100.0, 1.0) * 0.3
        heat_factor = max(0, (temperature - 38) / 12.0) * 0.2
        noise       = np.random.normal(0, 0.04)

        claim_probability = min(1.0, max(0.0,
            profile['base_prob'] + rain_factor + heat_factor + noise
        ))

        rows.append({
            'location':          city,
            'rainfall':          round(rainfall, 2),
            'temperature':       round(temperature, 2),
            'claim_probability': round(claim_probability, 4)
        })

    return pd.DataFrame(rows)


def train_model():
    os.makedirs(MODELS_DIR, exist_ok=True)

    # Generate or load data
    if os.path.exists(DATA_PATH) and len(pd.read_csv(DATA_PATH)) >= 100:
        df = pd.read_csv(DATA_PATH)
        print(f'Loaded {len(df)} rows from {DATA_PATH}')
    else:
        print('Generating synthetic training data (600 rows)...')
        df = generate_synthetic_data(n_samples=600)
        os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
        df.to_csv(DATA_PATH, index=False)
        print(f'Saved to {DATA_PATH}')

    print(f'Dataset: {len(df)} rows, cities: {df["location"].nunique()}')
    print(df['claim_probability'].describe().round(3).to_string())

    # Encode location
    location_encoder = LabelEncoder()
    df['location_encoded'] = location_encoder.fit_transform(df['location'])

    X = df[['location_encoded', 'rainfall', 'temperature']]
    y = df['claim_probability']

    # Train/test split — FIX: 600 rows means meaningful evaluation
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    print(f'\nTest set evaluation ({len(X_test)} samples):')
    print(f'  MAE: {mean_absolute_error(y_test, preds):.4f}')
    print(f'  R²:  {r2_score(y_test, preds):.4f}')

    # Save artifacts
    joblib.dump(model,            os.path.join(MODELS_DIR, 'risk_model.pkl'))
    joblib.dump(location_encoder, os.path.join(MODELS_DIR, 'location_encoder.pkl'))

    print(f'\nSaved: risk_model.pkl, location_encoder.pkl')
    print(f'Known locations: {list(location_encoder.classes_)}')

    # Quick sanity check
    print('\nSample predictions:')
    for city, rain, temp in [('Chennai', 72, 34), ('Delhi', 5, 46), ('Bengaluru', 20, 27)]:
        enc = int(location_encoder.transform([city])[0]) if city in location_encoder.classes_ else -1
        score = model.predict([[enc, rain, temp]])[0]
        print(f'  {city:12s} rain={rain}mm temp={temp}°C → risk={score:.3f}')


if __name__ == '__main__':
    train_model()
