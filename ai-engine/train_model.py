import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

# Load and preprocess data
def load_data():
    df = pd.read_csv('data/weather_history.csv')
    return df

# Train risk prediction model
def train_model():
    df = load_data()

    # Encode categorical variables
    le = LabelEncoder()
    df['location_encoded'] = le.fit_transform(df['location'])
    df['occupation_encoded'] = le.fit_transform(df['occupation'])

    # Features and target
    features = ['location_encoded', 'occupation_encoded', 'rainfall', 'temperature']
    X = df[features]
    y = df['claim_probability']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    # Save model
    joblib.dump(model, 'models/risk_model.pkl')
    print("Model trained and saved")

if __name__ == "__main__":
    train_model()