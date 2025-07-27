
import firebase_admin
from firebase_admin import credentials, db
import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
from sklearn.preprocessing import StandardScaler, LabelEncoder
from imblearn.over_sampling import SMOTE
import logging
import os
from dotenv import load_dotenv
# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')
# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, '.env'))
FIREBASE_CRED = os.getenv('FIREBASE_CRED_PATH')
FIREBASE_DB_URL = os.getenv('FIREBASE_DB_URL')
MODELS_DIR = os.path.join(BASE_DIR, "models")
# Initialize Firebase only if not already initialized
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CRED)
    firebase_admin.initialize_app(cred, {
        'databaseURL': FIREBASE_DB_URL
    })

def fetch_feedback_data():
    ref = db.reference('devices')
    devices = ref.get()
    records = []
    for device_id, device_data in devices.items():
        feedback = device_data.get('feedback')
        # Use feedback['status'] as the true label for retraining if present
        if isinstance(feedback, dict) and 'status' in feedback:
            record = dict(device_data)
            record['feedback_status'] = feedback['status']
            records.append(record)
    return pd.DataFrame(records)

def retrain_and_save():
    df = fetch_feedback_data()
    if df.empty:
        print("No feedback data available for retraining.")
        return
    features = [
        'speed', 'waterLevel', 'gas', 'isRaining', 'intensity',
        'hour', 'weekday', 'month', 'day', 'is_weekend', 'hour_sin', 'hour_cos'
    ]
    df.fillna(0, inplace=True)
    X = df[features]
    y = df['feedback_status']
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    smote = SMOTE(random_state=42)
    X_train, y_train = smote.fit_resample(X_scaled, y_encoded)
    dtrain = xgb.DMatrix(X_train, label=y_train)
    params = {
        'tree_method': 'hist',
        'device': 'cuda',
        'objective': 'multi:softprob',
        'eval_metric': 'mlogloss',
        'num_class': len(le.classes_)
    }
    model = xgb.train(params, dtrain, num_boost_round=100)
    model.save_model(os.path.join(MODELS_DIR, "xgb_model_advanced.json"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
    joblib.dump(le, os.path.join(MODELS_DIR, "label_encoder.pkl"))
    print("Model retrained and saved.")

if __name__ == "__main__":
    retrain_and_save()
