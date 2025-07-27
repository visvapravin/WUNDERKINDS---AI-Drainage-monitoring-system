
# Drainage Data AI Server Project

This repository contains a complete, production-ready AI server pipeline for smart drainage monitoring. It includes:
- Synthetic data generation
- GPU-accelerated XGBoost model training with SMOTE balancing
- Automated prediction and retraining using Firebase
- Full orchestration and automation for continuous learning

---

## Table of Contents
- [Project Overview](#project-overview)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Firebase Setup](#firebase-setup)
- [Data Generation](#data-generation)
- [Model Training & Evaluation](#model-training--evaluation)
- [Running the AI Server Pipeline](#running-the-ai-server-pipeline)
- [Outputs & Artifacts](#outputs--artifacts)
- [Automation & Retraining](#automation--retraining)
- [Troubleshooting](#troubleshooting)
- [References](#references)

---

## Project Overview
This project simulates a smart drainage monitoring system and provides a fully automated AI server pipeline:
- Generates a large synthetic dataset (`drainage_data.csv`) with 3 million rows of timestamped sensor readings.
- Trains an XGBoost model (with GPU acceleration) to classify the drainage status.
- Handles class imbalance using SMOTE oversampling.
- Integrates with Firebase for real-time device data, prediction, and feedback.
- Automates prediction updates and weekly retraining using user feedback.
- Provides explainability with SHAP.

## Directory Structure
```
├── dataset/
│   └── drainage_data.csv                # Generated dataset (3 million rows)
├── models/
│   ├── xgb_model_advanced.json          # Trained XGBoost model
│   ├── scaler.pkl                       # Feature scaler
│   └── label_encoder.pkl                # Label encoder
├── scripts/
│   ├── firebase_fetch_data.py           # Fetches device data from Firebase
│   ├── firebase_update_data.py          # Updates predictions in Firebase
│   ├── predict_drainage.py              # Predicts drainage status for a device
│   ├── retrain_xgboost_from_feedback.py # Retrains model weekly from feedback
│   ├── scheduler.py                     # Runs fetch-predict-update every 3 min
│   ├── train_xgboost_drainage_model.py  # Model training, evaluation, explainability
│   └── weekly_retrain_scheduler.py      # Automates weekly retraining
├── notebooks/                           # (Optional) Jupyter notebooks
├── ai_server_coordinator.py             # Main orchestrator: runs all automation
├── wunderkinds-101105-firebase-adminsdk-fbsvc-e52b6c733c.json # Firebase credentials
└── README.md                            # This file
```


## Prerequisites
- **Python 3.12** (recommended)
- **NVIDIA GPU** with CUDA 12.x (for GPU acceleration)
- **CUDA Toolkit** installed and CUDA_PATH set (for CuPy/XGBoost GPU)

### Required Python Packages
Install these in your Python 3.12 environment:
- pandas
- numpy
- matplotlib
- xgboost
- scikit-learn
- joblib
- shap
- cupy-cuda12x (for CUDA 12.x)
- imbalanced-learn
- firebase-admin

#### Install all at once:
```bash
pip install pandas numpy matplotlib xgboost scikit-learn joblib shap cupy-cuda12x imbalanced-learn firebase-admin
```

> **Note:**
> - For `cupy-cuda12x`, ensure the `x` matches your CUDA version (e.g., `cupy-cuda120` for CUDA 12.0).
> - If you have multiple Python versions, use the full path to your Python 3.12 executable for pip installs and running scripts.


## Setup Instructions
1. **Clone or download this repository.**
2. **Install prerequisites** as above.
3. **(Optional but recommended)**: Create and activate a virtual environment for Python 3.12.
4. **Ensure your NVIDIA GPU and CUDA drivers are installed and working.**
5. **Download your Firebase Admin SDK JSON credentials** and place them in the project root (see below).


## Firebase Setup
### How to Download the Firebase Admin SDK Certificate (Service Account JSON)
1. Go to the [Firebase Console](https://console.firebase.google.com/) and select your project (or create a new one).
2. In the left sidebar, click the ⚙️ **Settings** icon next to "Project Overview" and select **Project settings**.
3. Go to the **Service accounts** tab.
4. Click the **Generate new private key** button. Confirm the download.
5. This will download a JSON file (e.g., `wunderkinds-101105-firebase-adminsdk-xxxx.json`).
6. Place this JSON file in your project root directory.
7. Update the credential path in all scripts if your filename is different.
8. In the Firebase Realtime Database, create a `devices` node. Each device should be a child with sensor data fields (see code for details).
9. **Feedback for retraining:**
   - For each device, add a `feedback` object with a `status` field (e.g., `"Overflow"`, `"Normal"`, etc.).
   - Example:
     ```json
     "devices": {
       "esp32_rainydevice001": {
         ...,
         "feedback": {
           "status": "Overflow",
           "feedbackTimestamp": "2025-07-27T10:15:37.867Z",
           "score": 0
         }
       }
     }
     ```
   - The model will use `feedback.status` as the true label for retraining.


## Data Generation
Run the following script to generate the synthetic dataset:
```bash
python generate_3m_drainage_dataset.py
```
- This will create `dataset/drainage_data.csv` with 3 million rows and the following columns:
  - `timestamp`, `speed`, `waterLevel`, `gas`, `isRaining`, `intensity`, `status`
- The data simulates realistic sensor readings, rain events, and status assignment logic.


## Model Training & Evaluation
Train and evaluate the XGBoost model with GPU acceleration and SMOTE balancing:
```bash
python scripts/train_xgboost_drainage_model.py
```
- **Feature engineering**: Extracts time features, encodes labels, and scales features.
- **Class imbalance**: SMOTE is applied to the training set.
- **Model**: XGBoost (multi-class, GPU-accelerated).
- **Explainability**: SHAP summary plot is generated.
- **Artifacts**: Model, scaler, label encoder, and test data are saved in `models/`.


## Running the AI Server Pipeline
The entire AI server pipeline is orchestrated by `ai_server_coordinator.py`. This script will:
- Start the prediction scheduler (runs every 3 minutes, fetches device data from Firebase, predicts, and updates Firebase)
- Start the weekly retraining scheduler (retrain model using user feedback from Firebase)

To start the full pipeline:
```bash
python ai_server_coordinator.py
```

**What happens:**
- All device data in Firebase is fetched and predicted every 3 minutes.
- Predictions are written back to Firebase for each device.
- User feedback (if provided in Firebase) is used for weekly retraining.
- The model, scaler, and label encoder are updated automatically after retraining.
- The system continues to learn and improve as more feedback is collected.

## Outputs & Artifacts
- `models/xgb_model_advanced.json` : Trained XGBoost model
- `models/scaler.pkl` : Feature scaler
- `models/label_encoder.pkl` : Label encoder
- `test_data.npz` : Test set (features and labels)
- `shap_summary.png` : SHAP feature importance plot



## Automation & Retraining
- **Prediction**: Device data in Firebase is fetched and predicted in real time (every second by default), and predictions are updated in Firebase.
- **Retraining**: Every week, the model is retrained using the latest feedback from users. The retraining script uses the value of `feedback.status` for each device as the true label.
- **Coordinator**: The `ai_server_coordinator.py` script manages all automation and can be run as a background service.

- **ModuleNotFoundError**: Ensure all packages are installed in the same Python environment you use to run the scripts.
- **CuPy/CUDA errors**: Make sure your CUDA version matches the installed `cupy-cuda12x` package and that your GPU drivers are up to date.
- **Memory issues**: The dataset and model are large; ensure your system has sufficient RAM and GPU memory.
- **Firebase errors**: Double-check your credentials file path and database URL in all scripts.
- **Class imbalance warnings**: SMOTE is used to balance classes; check logs for class distribution after resampling.
- **UserWarning: X does not have valid feature names**: This is safe to ignore; it occurs when using NumPy arrays with scikit-learn transformers.
+ **ModuleNotFoundError**: Ensure all packages are installed in the same Python environment you use to run the scripts.
+ **CuPy/CUDA errors**: Make sure your CUDA version matches the installed `cupy-cuda12x` package and that your GPU drivers are up to date.
+ **Memory issues**: The dataset and model are large; ensure your system has sufficient RAM and GPU memory.
+ **Firebase errors**: Double-check your credentials file path and database URL in all scripts.
+ **Class imbalance warnings**: SMOTE is used to balance classes; check logs for class distribution after resampling.
+ **UserWarning: X does not have valid feature names**: This is safe to ignore; it occurs when using NumPy arrays with scikit-learn transformers.
+ **Feedback not used for retraining**: Ensure each device has a `feedback` object with a `status` field (string label) for the retraining script to use it as the true label.
- **ModuleNotFoundError**: Ensure all packages are installed in the same Python environment you use to run the scripts.
- **CuPy/CUDA errors**: Make sure your CUDA version matches the installed `cupy-cuda12x` package and that your GPU drivers are up to date.
- **Memory issues**: The dataset and model are large; ensure your system has sufficient RAM and GPU memory.
- **Firebase errors**: Double-check your credentials file path and database URL in all scripts.
- **Class imbalance warnings**: SMOTE is used to balance classes; check logs for class distribution after resampling.
- **UserWarning: X does not have valid feature names**: This is safe to ignore; it occurs when using NumPy arrays with scikit-learn transformers.


## References
- [imbalanced-learn documentation (SMOTE)](https://imbalanced-learn.org/)
- [XGBoost documentation](https://xgboost.readthedocs.io/)
- [CuPy documentation](https://docs.cupy.dev/)
- [SHAP documentation](https://shap.readthedocs.io/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

For questions or contributions, please open an issue or pull request on GitHub.
