from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import requests
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_API_KEY = "AIzaSyDP_uh7oU3P0kak2TwQa6jdz55L7rAUUpk"

def get_keywords_from_gemini(user_query: str) -> str:
    prompt = (
        "You help people find local small businesses and interesting places to visit.\n\n"
        f"The user said: '{user_query}'\n\n"
        "Your job: Figure out what type of LOCAL PLACE or SMALL BUSINESS best satisfies their need or mood.\n"
        "Think about the USER'S INTENT and EMOTION, not just the literal words.\n\n"
        "Examples:\n"
        '- "i am sick" -> "urgent care clinic"\n'
        '- "im bored" -> "museum"\n'
        '- "i want to have fun" -> "entertainment venue"\n'
        '- "i need to eat" -> "local restaurant"\n'
        '- "im stressed" -> "spa"\n'
        '- "my car is broken" -> "auto repair shop"\n'
        '- "i want to learn something" -> "museum"\n'
        '- "im hungry" -> "local restaurant"\n'
        '- "i want coffee" -> "coffee shop"\n'
        '- "i need a haircut" -> "hair salon"\n'
        '- "i want to work out" -> "gym"\n'
        '- "i need groceries" -> "grocery store"\n'
        '- "i want to buy clothes" -> "clothing boutique"\n'
        '- "i need a dentist" -> "dentist"\n'
        '- "i want fresh air" -> "park"\n'
        '- "i want to celebrate" -> "restaurant"\n\n'
        "Rules:\n"
        "1. Focus on the USER'S UNDERLYING NEED, not the literal words.\n"
        "2. Output ONLY a single SHORT keyword phrase (2-4 words max).\n"
        "3. No quotes, no explanation, no punctuation - just the keyword.\n"
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        resp = requests.post(url, json=payload, timeout=10)
        if resp.status_code == 200:
            return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print("Gemini Keyword error:", e, flush=True)
    return user_query

def filter_small_businesses_gemini(user_query: str, places: list) -> dict:
    if not places: return {}
    places_info = []
    for p in places:
        name = p.get('name', '')
        place_id = p.get('id', '')
        cat = p.get('category', '')
        places_info.append(f"ID:{place_id} | Name:{name} | Category:{cat}")
    
    places_text = "\n".join(places_info)
    prompt = f"""
The user searched for: '{user_query}'
Based on their need, here are the nearby places found:
{places_text}

Task:
1. Thoroughly evaluate each place against the user's semantic intent. (e.g., if they are sick, they need medical attention, NOT a place with "sick" in the name).
2. Filter out ANY big chain, state/nationwide companies, or large corporate franchises.
3. Select ONLY the highly relevant, helpful local small businesses that genuinely solve the user's implicit problem based on their query.
4. Provide a brief (1 sentence) specific AI reason for WHY this business is recommended based on their query and how it solves their problem.

Return a JSON array of objects, where each object has "place_id" and "ai_reason". Output valid JSON only, no markdown blocks.
"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        resp = requests.post(url, json=payload, timeout=15)
        if resp.status_code == 200:
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            # robust json extraction
            match = re.search(r'\[.*\]', text, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                return {item.get("place_id"): item.get("ai_reason", "") for item in parsed if isinstance(item, dict)}
            else:
                return {}
    except Exception as e:
        print("Gemini error:", e, flush=True)
    return None

# ── Chain blocklist ──────────────────────────────────────────────────────────
CHAIN_BLOCKLIST = [
    "starbucks", "mcdonald", "walmart", "target", "cvs", "walgreens",
    "subway", "dunkin", "7-eleven", "home depot", "lowe's", "costco",
    "whole foods", "trader joe", "best buy", "autozone", "dollar tree",
    "dollar general", "burger king", "wendy's", "taco bell", "pizza hut",
    "domino's", "kfc", "chick-fil-a", "panera", "chipotle", "olive garden",
]

# ── Helper: determine if a business is likely small/independent ──────────────
def is_small_business(place: dict) -> bool:
    name = place.get("name", "").lower()
    rating_count = place.get("user_ratings_total", 0)
    price_level = place.get("price_level", 1)  # 0–4; missing defaults to 1

    is_chain = any(chain in name for chain in CHAIN_BLOCKLIST)
    has_massive_reviews = rating_count > 3000   # chains accumulate huge counts
    is_expensive = price_level >= 3             # $$$ and $$$$ lean corporate

    return not is_chain and not has_massive_reviews and not is_expensive


# ── Route: health check ──────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


# ── Route: search nearby businesses ─────────────────────────────────────────
@app.route("/search", methods=["GET"])
def search():
    """
    Query params:
        query   (str)   – product or service to search for (required)
        lat     (float) – user latitude  (required)
        lng     (float) – user longitude (required)
        radius  (int)   – search radius in metres, default 5000 (max 50000)
        all     (bool)  – if "true", skip small-business filter (default false)
    """
    query  = request.args.get("query", "").strip()
    lat    = request.args.get("lat")
    lng    = request.args.get("lng")
    radius = request.args.get("radius", 5000)
    show_all = request.args.get("all", "false").lower() == "true"

    # ── Validation ───────────────────────────────────────────────────────────
    if not query:
        return jsonify({"error": "Missing required parameter: query"}), 400
    if not lat or not lng:
        return jsonify({"error": "Missing required parameters: lat and lng"}), 400

    try:
        lat    = float(lat)
        lng    = float(lng)
        radius = min(int(radius), 50000)   # cap at Google's max
    except ValueError:
        return jsonify({"error": "lat, lng, and radius must be numbers"}), 400

    if not GOOGLE_API_KEY:
        return jsonify({"error": "Google API key not configured on server"}), 500

    # ── Call Google Places Nearby Search ────────────────────────────────────
    # Step 1: Use Gemini to convert natural language query to Places keyword
    search_keyword = get_keywords_from_gemini(query)
    print(f"Original Query: '{query}' -> Gemini Keyword: '{search_keyword}'", flush=True)
    
    places_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "keyword":  search_keyword,
        "location": f"{lat},{lng}",
        "radius":   radius,
        "type":     "establishment",
        "key":      GOOGLE_API_KEY,
    }

    try:
        resp = requests.get(places_url, params=params, timeout=10)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Google Places request failed: {str(e)}"}), 502

    data = resp.json()

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        return jsonify({
            "error": f"Google Places API error: {data.get('status')}",
            "details": data.get("error_message", "")
        }), 502

    raw_results = data.get("results", [])

    # ── Filter + shape results ───────────────────────────────────────────────
    initial_businesses = []
    for place in raw_results:
        # Step 2: Basic programmatic filter to weed out obvious chains if show_all is false
        if not show_all and not is_small_business(place):
            continue

        loc = place.get("geometry", {}).get("location", {})

        # Extract human-readable category from Google's types list
        # Map common Google types to friendly display names
        type_map = {
            "cafe": "Coffee Shop", "restaurant": "Restaurant", "bar": "Bar",
            "bakery": "Bakery", "book_store": "Bookshop", "clothing_store": "Clothing",
            "shoe_store": "Shoe Store", "jewelry_store": "Jewelry",
            "hardware_store": "Hardware Store", "home_goods_store": "Home Goods",
            "florist": "Florist", "grocery_or_supermarket": "Grocery",
            "hair_care": "Hair Salon", "beauty_salon": "Beauty Salon",
            "spa": "Spa", "gym": "Gym", "bicycle_store": "Bike Shop",
            "pet_store": "Pet Store", "pharmacy": "Pharmacy",
            "electronics_store": "Electronics", "furniture_store": "Furniture",
            "art_gallery": "Art Gallery", "museum": "Museum",
            "laundry": "Laundry", "locksmith": "Locksmith",
            "painter": "Painter", "plumber": "Plumber",
            "electrician": "Electrician", "car_repair": "Auto Repair",
            "doctor": "Doctor", "hospital": "Hospital", "health": "Health/Medical",
        }
        types = place.get("types", [])
        category = next(
            (type_map[t] for t in types if t in type_map),
            types[0].replace("_", " ").title() if types else "Local Business"
        )

        # Build photo URL directly so frontend can use it as an <img src>
        photo_ref = (
            place["photos"][0]["photo_reference"]
            if place.get("photos") else None
        )
        photo_url = (
            f"http://localhost:5001/photo?ref={photo_ref}&width=600"
            if photo_ref else None
        )

        initial_businesses.append({
            "id":            place.get("place_id"),
            "name":          place.get("name"),
            "address":       place.get("vicinity"),
            "category":      category,
            "rating":        place.get("rating"),
            "review_count":  place.get("user_ratings_total"),
            "price_level":   place.get("price_level"),
            "open_now":      place.get("opening_hours", {}).get("open_now"),
            "place_id":      place.get("place_id"),
            "lat":           loc.get("lat"),
            "lng":           loc.get("lng"),
            "photo_ref":     photo_ref,
            "photo_url":     photo_url,
            "maps_url":      f"https://www.google.com/maps/place/?q=place_id:{place.get('place_id')}",
            "ai_reason":     "" # Default mapping
        })

    # Step 3: Run AI secondary filtering
    businesses = initial_businesses
    if not show_all and initial_businesses:
        gemini_decisions = filter_small_businesses_gemini(query, initial_businesses)
        if gemini_decisions is not None:
            # Re-filter businesses based on Gemini returned place_ids
            businesses = []
            for b in initial_businesses:
                if b["id"] in gemini_decisions:
                    b["ai_reason"] = gemini_decisions[b["id"]]
                    businesses.append(b)

    return jsonify({
        "query":        query,
        "search_keyword": search_keyword,
        "location":     {"lat": lat, "lng": lng},
        "radius_m":     radius,
        "total_found":  len(businesses),
        "businesses":   businesses,
    })


# ── Route: get a business photo ──────────────────────────────────────────────
@app.route("/photo", methods=["GET"])
def photo():
    """
    Proxy for Google Place Photos so your API key stays server-side.
    Query params:
        ref     (str) – photo_reference from a search result
        width   (int) – desired width in px, default 400
    """
    ref   = request.args.get("ref")
    width = request.args.get("width", 400)

    if not ref:
        return jsonify({"error": "Missing parameter: ref"}), 400

    photo_url = "https://maps.googleapis.com/maps/api/place/photo"
    params = {
        "photoreference": ref,
        "maxwidth":       width,
        "key":            GOOGLE_API_KEY,
    }

    google_resp = requests.get(photo_url, params=params, timeout=10, stream=True)
    return (
        google_resp.content,
        google_resp.status_code,
        {"Content-Type": google_resp.headers.get("Content-Type", "image/jpeg")},
    )


# ── Route: get place details ─────────────────────────────────────────────────
@app.route("/details", methods=["GET"])
def details():
    """
    Returns extended details for a single business.
    Query params:
        place_id (str) – Google place_id from a search result
    """
    place_id = request.args.get("place_id")
    if not place_id:
        return jsonify({"error": "Missing parameter: place_id"}), 400

    details_url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": (
            "name,formatted_address,formatted_phone_number,"
            "website,opening_hours,rating,user_ratings_total,"
            "price_level,reviews,url,editorial_summary,photos"
        ),
        "key": GOOGLE_API_KEY,
    }

    try:
        resp = requests.get(details_url, params=params, timeout=10)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Google Places request failed: {str(e)}"}), 502

    result = resp.json().get("result", {})

    # Extract description from editorial_summary if available
    description = result.get("editorial_summary", {}).get("overview", None)

    # Build photo URL from first photo if available
    photos = result.get("photos", [])
    photo_url = None
    if photos:
        ref = photos[0].get("photo_reference")
        if ref:
            photo_url = f"http://localhost:5001/photo?ref={ref}&width=600"

    return jsonify({
        **result,
        "description": description,
        "photo_url":   photo_url,
    })


# ── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5001)
