import subprocess
import threading
import time
import logging
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(message)s')

# Organized script paths
SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), 'scripts')
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

PREDICT_SCRIPT = os.path.join(SCRIPTS_DIR, "scheduler.py")
RETRAIN_SCRIPT = os.path.join(SCRIPTS_DIR, "weekly_retrain_scheduler.py")

processes = []

def run_script(script_path):
    logging.info(f"Starting {os.path.basename(script_path)}...")
    proc = subprocess.Popen(["python", script_path], cwd=os.path.dirname(script_path))
    processes.append(proc)
    proc.wait()
    logging.info(f"{os.path.basename(script_path)} stopped.")

def main():
    # Start prediction scheduler in a thread
    predict_thread = threading.Thread(target=run_script, args=(PREDICT_SCRIPT,), daemon=True)
    predict_thread.start()

    # Start weekly retrain scheduler in a thread
    retrain_thread = threading.Thread(target=run_script, args=(RETRAIN_SCRIPT,), daemon=True)
    retrain_thread.start()

    logging.info("AI Server Coordinator is running. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        logging.info("Shutting down all processes...")
        for proc in processes:
            proc.terminate()
        logging.info("All processes terminated.")

if __name__ == "__main__":
    main()
