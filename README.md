# Small Business Finder — Docker Setup

## If not installed, install docker

### Mac installation

[Link to the installer](https://docs.docker.com/desktop/setup/install/mac-install/) 

### Windows installation

[Link to the installer](https://docs.docker.com/desktop/setup/install/windows-install/)



## Run with one command

```bash
docker compose up --build
```

Then open **http://localhost:5173** in your browser.

The backend API runs on **http://localhost:5001**.

---

## What's running

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React app served by nginx |
| Backend | http://localhost:5001 | Flask API with Gemini AI |

---

## API Keys

Keys are already embedded in the image as defaults.
To use your own keys, create a `.env` file in this folder:

```
GOOGLE_API_KEY=AIzaSy...
GEMINI_API_KEY=AIzaSy...
```

Then run ```docker compose up --build``` again.

---

## Stop

```bash
docker compose down
```

## Rebuild after code changes

```bash
docker compose up --build
```
