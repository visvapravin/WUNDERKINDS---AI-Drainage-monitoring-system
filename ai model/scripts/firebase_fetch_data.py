
import firebase_admin
from firebase_admin import credentials, db
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
FIREBASE_CRED = os.getenv('FIREBASE_CRED_PATH')
FIREBASE_DB_URL = os.getenv('FIREBASE_DB_URL')
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CRED)
    firebase_admin.initialize_app(cred, {
        'databaseURL': FIREBASE_DB_URL
    })

def fetch_data():
    ref = db.reference('devices')
    data = ref.get()
    return data

if __name__ == "__main__":
    data = fetch_data()
    print("Fetched Data:", data)
