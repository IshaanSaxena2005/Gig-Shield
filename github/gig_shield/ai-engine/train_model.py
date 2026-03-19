import os
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_PATH  = os.path.join(BASE_DIR, 'data', 'weather_history.csv')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

def load_data():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Training data not found at: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} rows from {DATA_PATH}")
    print(f"Columns found: {list(df.columns)}")
    return df

def train_model():
    df = load_data()

    # CSV only has 'location' as a categorical column — no 'occupation'
    location_encoder = LabelEncoder()
    df['location_encoded'] = location_encoder.fit_transform(df['location'])

    # Features that actually exist in the CSV
    features = ['location_encoded', 'rainfall', 'temperature']
    X = df[features]
    y = df['claim_probability']

    # Only 7 rows — skip train/test split to avoid empty test set
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    preds = model.predict(X)
    print(f"MAE: {mean_absolute_error(y, preds):.4f}")
    print(f"R²:  {r2_score(y, preds):.4f}")

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(model,            os.path.join(MODELS_DIR, 'risk_model.pkl'))
    joblib.dump(location_encoder, os.path.join(MODELS_DIR, 'location_encoder.pkl'))

    print("Saved: risk_model.pkl, location_encoder.pkl")
    print(f"Known locations: {list(location_encoder.classes_)}")

if __name__ == '__main__':
    train_model()