import pandas as pd
import numpy as np
import cupy as cp
import matplotlib.pyplot as plt
import xgboost as xgb
from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import shap
import logging
from collections import Counter
from imblearn.over_sampling import SMOTE
import os
# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')
# Load data
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "drainage_data.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
try:
    df = pd.read_csv(DATASET_PATH)
    logging.info(f"Data loaded with shape: {df.shape}")
except Exception as e:
    logging.error(f"Failed to load dataset: {e}")
    raise
# Feature Engineering
try:
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    df['weekday'] = df['timestamp'].dt.weekday
    df['month'] = df['timestamp'].dt.month
    df['day'] = df['timestamp'].dt.day
    df['is_weekend'] = df['weekday'].isin([5, 6]).astype(int)
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    logging.info("Feature engineering completed.")
except Exception as e:
    logging.error(f"Feature engineering error: {e}")
    raise
# Handle missing values
df.fillna(df.median(numeric_only=True), inplace=True)
logging.info("Missing values filled.")
# Features and Target
features = [
    'speed', 'waterLevel', 'gas', 'isRaining', 'intensity',
    'hour', 'weekday', 'month', 'day', 'is_weekend', 'hour_sin', 'hour_cos'
]
X = df[features]
y = df['status']
# Encode labels
le = LabelEncoder()
y_encoded = le.fit_transform(y)
logging.info(f"Classes: {le.classes_}")
logging.info(f"Class distribution: {Counter(y_encoded)}")
# Feature Scaling
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)
logging.info(f"Scaled features. Shape: {X_scaled.shape}")
# Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y_encoded, test_size=0.2, stratify=y_encoded, random_state=42
)
logging.info(f"Train: {X_train.shape}, Test: {X_test.shape}")
# Apply SMOTE to training data only
smote = SMOTE(random_state=42)
X_train, y_train = smote.fit_resample(X_train, y_train)
logging.info(f"After SMOTE: Train shape: {X_train.shape}, Class distribution: {Counter(y_train)}")
# Train XGBoost model
params = {
    'tree_method': 'hist',
    'device': 'cuda',
    'objective': 'multi:softprob',
    'eval_metric': 'mlogloss',
    'num_class': len(le.classes_)
}
dtrain = xgb.DMatrix(X_train, label=y_train)
model = xgb.train(params, dtrain, num_boost_round=100)
# Save model and artifacts
model.save_model(os.path.join(MODELS_DIR, "xgb_model_advanced.json"))
joblib.dump(scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
joblib.dump(le, os.path.join(MODELS_DIR, "label_encoder.pkl"))
logging.info("Model and artifacts saved.")
# SHAP summary plot
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_train)
shap.summary_plot(shap_values, X_train, feature_names=features, show=False)
plt.savefig(os.path.join(BASE_DIR, "shap_summary.png"))
logging.info("SHAP summary plot saved.")
