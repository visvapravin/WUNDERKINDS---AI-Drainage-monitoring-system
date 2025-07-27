import time
import subprocess
import logging
import os
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')
# Path to your retraining script
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RETRAIN_SCRIPT = os.path.join(BASE_DIR, "scripts", "retrain_xgboost_from_feedback.py")
SECONDS_IN_A_WEEK = 7 * 24 * 60 * 60

def run_weekly():
    while True:
        logging.info("Starting weekly retraining...")
        try:
            subprocess.run(["python", RETRAIN_SCRIPT], check=True)
            logging.info("Retraining completed successfully.")
        except subprocess.CalledProcessError as e:
            logging.error(f"Retraining failed: {e}")
        logging.info(f"Waiting for 1 week ({SECONDS_IN_A_WEEK} seconds)...")
        time.sleep(SECONDS_IN_A_WEEK)

if __name__ == "__main__":
    run_weekly()
