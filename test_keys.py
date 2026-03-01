import requests

GEMINI_API_KEY = "AIzaSyDP_uh7oU3P0kak2TwQa6jdz55L7rAUUpk"

def get_keywords_from_gemini(user_query):
    prompt = f"""
You help people find local small businesses and interesting places to visit.

The user said: '{user_query}'

Your job: Figure out what type of LOCAL PLACE or SMALL BUSINESS best satisfies their need or mood.
Think about the USER'S INTENT and EMOTION, not just the literal words.

Examples:
- "I am sick" → "urgent care clinic"
- "I'm bored" → "museum" (best first choice for something interesting and unique locally)
- "I want to have fun" → "entertainment venue"
- "I need to eat" → "local restaurant"
- "I'm stressed" → "spa"
- "My car is broken" → "auto repair shop"
- "I want to learn something" → "museum"
- "I'm hungry" → "local restaurant"
- "I want coffee" → "coffee shop"

Rules:
1. Focus on the USER'S UNDERLYING NEED, not the literal words.
2. Output ONLY a single SHORT keyword phrase (2-4 words max).
3. No quotes, no explanation, no punctuation — just the keyword.
"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            result = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            return result
        else:
            print("Gemini error:", resp.status_code, resp.text[:200])
    except Exception as e:
        print("Exception:", e)
    return user_query

queries = ["i am sick", "im bored", "i need to fix my car", "im hungry", "im stressed"]
for q in queries:
    result = get_keywords_from_gemini(q)
    print(f"'{q}' -> '{result}'")
