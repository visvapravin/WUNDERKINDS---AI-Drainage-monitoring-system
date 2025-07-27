
import numpy as np
import xgboost as xgb
import joblib
import os
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

def load_model_and_scaler():
    model = xgb.Booster()
    model.load_model(os.path.join(MODELS_DIR, "xgb_model_advanced.json"))
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
    return model, scaler

def predict(data):
    features = [
        'speed', 'waterLevel', 'gas', 'isRaining', 'intensity',
        'hour', 'weekday', 'month', 'day', 'is_weekend', 'hour_sin', 'hour_cos'
    ]
    input_data = [data.get(f, 0) for f in features]
    model, scaler = load_model_and_scaler()
    input_scaled = scaler.transform([input_data])
    dmatrix = xgb.DMatrix(input_scaled)
    prediction_proba = model.predict(dmatrix)
    prediction = np.argmax(prediction_proba, axis=1)
    try:
        le = joblib.load(os.path.join(MODELS_DIR, "label_encoder.pkl"))
        prediction = le.inverse_transform(prediction)
        return prediction[0]
    except:
        return str(prediction[0])

if __name__ == "__main__":
    sample_data = {'speed': 0, 'waterLevel': 0, 'gas': 0, 'isRaining': 0, 'intensity': 0, 'hour': 0, 'weekday': 0, 'month': 0, 'day': 0, 'is_weekend': 0, 'hour_sin': 0, 'hour_cos': 0}
    result = predict(sample_data)
    print("Prediction Result:", result)
