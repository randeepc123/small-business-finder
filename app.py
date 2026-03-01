from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import requests
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyBaFcA1aMshX-NaWsyT7T1CCpQqLiBWxZw")


# The user provided a specific API key for Gemini
GEMINI_API_KEY = "AIzaSyDP_uh7oU3P0kak2TwQa6jdz55L7rAUUpk"


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

    # ── 1. Use Gemini to extract the best search keyword ────────────────────
    prompt_keyword = (
        "You help people find local small businesses and interesting places to visit.\n\n"
        f"The user said: '{query}'\n\n"
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
        '- "i want to celebrate" -> "restaurant"\n'
        '- "i want to read" -> "bookstore"\n'
        '- "i want to meet people" -> "cafe"\n'
        '- "im feeling down" -> "therapist"\n'
        '- "i want to try something new" -> "art studio"\n\n'
        "Rules:\n"
        "1. Focus on the USER'S UNDERLYING NEED, not the literal words.\n"
        "2. Output ONLY a single SHORT keyword phrase (2-4 words max).\n"
        "3. No quotes, no explanation, no punctuation - just the keyword.\n"
    )

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{
                "parts": [{"text": prompt_keyword}]
            }]
        }
        res = requests.post(url, json=payload, timeout=10)
        res.raise_for_status()
        
        # Parse standard Gemini API JSON response
        resp_json = res.json()
        search_keyword = resp_json["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"Gemini keyword extraction failed: {e}")
        search_keyword = query # Fallback to original

    print(f"User Query: '{query}' -> AI Keyword: '{search_keyword}'")

    # ── Call Google Places Nearby Search ────────────────────────────────────
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
    businesses = []
    for place in raw_results:
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
            "doctor": "Doctor", "health": "Health Clinic", "hospital": "Hospital",
            "amusement_center": "Arcade/Amusement", "bowling_alley": "Bowling Alley"
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

        businesses.append({
            "id":            place.get("place_id"),  # used by frontend for selection/keying
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
        })

    # ── 3. Use Gemini to curate and score the final results ────────────────
    # Send the raw business data to Gemini to get the best small business recommendations
    if businesses and not show_all:
        # Create a simplified list for the AI to read
        business_names_list = []
        for i, b in enumerate(businesses):
            business_names_list.append(f"[{i}] {b['name']} ({b['category']}, {b['rating']} stars, {b['review_count']} reviews)")
        
        business_text = "\n".join(business_names_list)
        
        prompt_curate = f"""
The user is looking for small businesses with this conversational need: "{query}"

Here is a list of businesses returned by Google Maps:
{business_text}

Your task:
1. Identify and REMOVE any massive national or state-wide chains, big box stores, or large corporate franchises. ONLY include true small businesses (mom and pop shops, startups, local chains).
2. From the remaining true small businesses, select the top 1 to 5 places that best solve the user's specific need: "{query}".
3. For each selected place, write a short, punchy 1-sentence explanation of why it's a good choice for them.

Output strictly in JSON format as follows:
{{
  "recommended_indices": [0, 2, 5],
  "reasons": {{
    "0": "Reason why index 0 is great...",
    "2": "Reason why index 2 is great...",
    "5": "Reason why index 5 is great..."
  }}
}}
"""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{
                    "parts": [{"text": prompt_curate}]
                }]
            }
            res = requests.post(url, json=payload, timeout=10)
            res.raise_for_status()
            
            resp_json = res.json()
            resp_text = resp_json["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Clean up markdown code blocks if the AI returned them
            if resp_text.startswith("```json"):
                resp_text = resp_text[7:]
                if resp_text.endswith("```"):
                    resp_text = resp_text[:-3]
            elif resp_text.startswith("```"):
                resp_text = resp_text[3:]
                if resp_text.endswith("```"):
                    resp_text = resp_text[:-3]
            
            resp_text = resp_text.strip()
                
            curated_data = json.loads(resp_text)
            
            # Re-build the businesses list with only the recommended items
            final_businesses = []
            for idx in curated_data.get("recommended_indices", []):
                idx = int(idx)
                if 0 <= idx < len(businesses):
                    b = businesses[idx]
                    b["ai_reason"] = curated_data.get("reasons", {}).get(str(idx), "Recommended for your need.")
                    final_businesses.append(b)
            
            businesses = final_businesses
        except Exception as e:
            with open("gemini_debug.log", "a", encoding="utf-8") as f:
                f.write(f"\n\n--- GEMINI ERROR: {e} ---\n")
                if 'res' in locals() and hasattr(res, "text"):
                    f.write(f"Raw Res:\n{res.text}\n")
                f.write(f"Cleaned Res:\n{resp_text if 'resp_text' in locals() else 'None'}\n")
            
            print(f"Gemini curation failed or JSON was invalid: {e}")
            # If AI filtering fails, fallback to the naive filter results, but limit to top 5
            businesses = businesses[:5]

    return jsonify({
        "query":        query,
        "ai_keyword":   search_keyword,
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
