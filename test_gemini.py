import requests

GEMINI_API_KEY = "AIzaSyDP_uh7oU3P0kak2TwQa6jdz55L7rAUUpk"

def call_gemini(prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    resp = requests.post(url, json=payload)
    if resp.status_code == 200:
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    else:
        print("Error from Gemini:", resp.text)
        return ""

print("Test 1:", call_gemini("User is searching for small businesses. Query: 'I am sick'. Provide a single best, optimal short keyword (under 3 words) to pass to Google Places API 'keyword' parameter. Output only the keyword, no quotes."))
