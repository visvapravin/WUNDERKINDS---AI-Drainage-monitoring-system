
import time
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.firebase_fetch_data import fetch_data
from scripts.predict_drainage import predict
from scripts.firebase_update_data import update_data


def run_realtime_prediction():
    print("Starting real-time prediction loop...")
    while True:
        data = fetch_data()
        for device_id, device_data in data.items():
            prediction = predict(device_data)
            update_data(device_id, prediction)
        # Sleep briefly to avoid CPU overload (adjust as needed)
        time.sleep(1)

if __name__ == "__main__":
    run_realtime_prediction()
