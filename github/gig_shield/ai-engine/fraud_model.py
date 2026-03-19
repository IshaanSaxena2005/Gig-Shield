import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# Train fraud detection model
def train_fraud_model():
    # Load claim data
    claims_df = pd.read_csv('data/claims_history.csv')

    # Features for fraud detection
    features = ['claim_amount', 'claim_frequency', 'location_risk', 'weather_correlation']
    X = claims_df[features]

    # Train isolation forest for anomaly detection
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(X)

    # Save model
    joblib.dump(model, 'models/fraud_model.pkl')
    print("Fraud detection model trained and saved")

def detect_fraud(claim_data):
    model = joblib.load('models/fraud_model.pkl')

    # Prepare input
    input_data = pd.DataFrame([claim_data])

    # Predict (1 for normal, -1 for anomaly)
    prediction = model.predict(input_data)[0]

    return prediction == -1  # True if fraudulent

if __name__ == "__main__":
    train_fraud_model()