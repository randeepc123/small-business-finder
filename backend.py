from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

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
    places_url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "keyword":  query,
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
        businesses.append({
            "name":          place.get("name"),
            "address":       place.get("vicinity"),
            "rating":        place.get("rating"),
            "review_count":  place.get("user_ratings_total"),
            "price_level":   place.get("price_level"),
            "open_now":      place.get("opening_hours", {}).get("open_now"),
            "place_id":      place.get("place_id"),
            "lat":           loc.get("lat"),
            "lng":           loc.get("lng"),
            "photo_ref":     (
                place["photos"][0]["photo_reference"]
                if place.get("photos") else None
            ),
            "maps_url": (
                f"https://www.google.com/maps/place/?q=place_id:{place.get('place_id')}"
            ),
        })

    return jsonify({
        "query":        query,
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
            "price_level,reviews,url"
        ),
        "key": GOOGLE_API_KEY,
    }

    try:
        resp = requests.get(details_url, params=params, timeout=10)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Google Places request failed: {str(e)}"}), 502

    result = resp.json().get("result", {})
    return jsonify(result)


# ── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)