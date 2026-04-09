# Genlogs Frontend

React portal for Genlogs — city-to-city carrier search with Google Maps integration.

**Live app:** https://genlogs-frontend-jlfypm7cy-christian-bastidas-projects.vercel.app

---

## Tech Stack

- React 18
- Google Maps JavaScript API — embedded map
- Places API — city autocomplete
- Directions API — route alternatives
- Axios — HTTP requests to backend
- Deployed on Vercel

---

## Features

- City autocomplete powered by Google Places
- Embedded Google Maps showing up to 3 route alternatives between cities
- Carrier results list fetched from the FastAPI backend
- Color-coded routes (blue, green, red)

---

## Project Structure

```
src/
├── App.js        # Main component — search, map, carriers
└── App.css       # Styles
```

---

## Local Setup

```bash
git clone https://github.com/cbastidas/genlogs-frontend.git
cd genlogs-frontend

npm install
```

Create a `.env` file in the root:

```
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
REACT_APP_BACKEND_URL=https://genlogs-backend.onrender.com
```

Then run:

```bash
npm start
```

App available at http://localhost:3000

---

## Deployment

Deployed on Vercel. Every push to main triggers an automatic redeploy.

Environment variables must be set in the Vercel project settings.

---

## Related

- Backend repo: https://github.com/cbastidas/genlogs-backend
- Backend live: https://genlogs-backend.onrender.com