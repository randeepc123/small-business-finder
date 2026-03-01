import requests
import json
import time

url = "http://127.0.0.1:5001/search"
params = {
    "query": "i am sick",
    "lat": 37.7749,
    "lng": -122.4194,
    "radius": 5000
}
try:
    resp = requests.get(url, params=params, timeout=30)
    print("Status:", resp.status_code)
    print("Response:", json.dumps(resp.json(), indent=2))
except Exception as e:
    print("Failed request:", e)
