# Small Business Finder

Small Business Finder is a full-stack web application that helps users discover local small businesses in their area based on a search query.

Large chain businesses often dominate search results. This project focuses on highlighting smaller, independent businesses using the Google Places API and custom filtering logic.

---

## Problem

It can be difficult for small businesses to gain visibility online. Search platforms often prioritize large chains with high traffic and advertising budgets.

---

## Solution

This application:
- Allows users to search by service or product (e.g., "coffee", "bookstore")
- Uses location data to find nearby businesses
- Filters results to prioritize smaller, local businesses
- Displays business details such as name, rating, address, and photos
- Incorporates AI to process user prompts and refine search results based on contextual needs and intent.

---

## Tech Stack

Frontend:
- React
- JavaScript

Backend:
- Python
- Flask

API:
- Google Places API

---

## How It Works

1. The user enters a search term.
2. The frontend sends a request to the Flask backend.
3. The backend queries the Google Places API.
4. Results are filtered to reduce large chain businesses.
5. The filtered results are returned to the frontend and displayed to the user.

---
