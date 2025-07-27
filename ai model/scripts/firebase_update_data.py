
import firebase_admin
from firebase_admin import credentials, db
import numpy as np
import joblib
import xgboost as xgb
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
FIREBASE_CRED = os.getenv('FIREBASE_CRED_PATH')
FIREBASE_DB_URL = os.getenv('FIREBASE_DB_URL')
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CRED)
    firebase_admin.initialize_app(cred, {
        'databaseURL': FIREBASE_DB_URL
    })

def update_data(device_id, prediction):
    ref = db.reference(f'devices/{device_id}')
    ref.update({"prediction": prediction})

def update_all_devices(predict_function):
    ref = db.reference('devices')
    devices = ref.get()
    if not devices:
        print("No devices found.")
        return
    for device_id, device_data in devices.items():
        prediction = predict_function(device_data)
        ref.child(device_id).update({"prediction": prediction})

def load_model_and_scaler():
    model = xgb.Booster()
    model.load_model(os.path.join(MODELS_DIR, "xgb_model_advanced.json"))
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
    return model, scaler

def real_predict(device_data):
    features = [
        'speed', 'waterLevel', 'gas', 'isRaining', 'intensity',
        'hour', 'weekday', 'month', 'day', 'is_weekend', 'hour_sin', 'hour_cos'
    ]
    input_data = [device_data.get(f, 0) for f in features]
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
    update_all_devices(real_predict)
    print("Data Updated Successfully for All Devices")
