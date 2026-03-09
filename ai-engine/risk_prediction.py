import joblib
import pandas as pd

# Load trained model
model = joblib.load('models/risk_model.pkl')

def predict_risk(location, occupation, rainfall, temperature):
    # Encode inputs (simplified - in production use saved encoders)
    location_encoded = hash(location) % 100
    occupation_encoded = hash(occupation) % 100

    # Create input dataframe
    input_data = pd.DataFrame({
        'location_encoded': [location_encoded],
        'occupation_encoded': [occupation_encoded],
        'rainfall': [rainfall],
        'temperature': [temperature]
    })

    # Make prediction
    risk_score = model.predict(input_data)[0]
    return risk_score

if __name__ == "__main__":
    # Example prediction
    risk = predict_risk('New York', 'delivery', 5.2, 15.3)
    print(f"Risk score: {risk}")