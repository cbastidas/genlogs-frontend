import React, { useState } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { GoogleMap, useLoadScript, DirectionsRenderer } from "@react-google-maps/api";
import axios from "axios";
import "./App.css";

const libraries = ["places"];

// ── Autocomplete input component ──────────────────────────────────────────
function PlacesInput({ label, onSelect }) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({ debounce: 300 });

  const handleSelect = async (description) => {
    setValue(description, false);
    clearSuggestions();
    const results = await getGeocode({ address: description });
    const { lat, lng } = await getLatLng(results[0]);
    onSelect({ description, lat, lng });
  };

  return (
    <div className="input-wrapper">
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Enter a city..."
      />
      {status === "OK" && (
        <ul className="suggestions">
          {data.map(({ place_id, description }) => (
            <li key={place_id} onClick={() => handleSelect(description)}>
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [fromCity, setFromCity] = useState(null);
  const [toCity, setToCity] = useState(null);
  const [directions, setDirections] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!fromCity || !toCity) return;
    setLoading(true);
    setError(null);
    setCarriers([]);
    setDirections([]);

    try {
      // Fetch up to 3 routes from Google Directions API
      const directionsService = new window.google.maps.DirectionsService();
      const results = await Promise.all(
        [
          window.google.maps.TravelMode.DRIVING,
        ].map(() =>
          directionsService.route({
            origin: { lat: fromCity.lat, lng: fromCity.lng },
            destination: { lat: toCity.lat, lng: toCity.lng },
            travelMode: window.google.maps.TravelMode.DRIVING,
            provideRouteAlternatives: true,
          })
        )
      );
      // Take up to 3 alternative routes
      const routes = results[0].routes.slice(0, 3).map((_, i) => ({
        ...results[0],
        routes: [results[0].routes[i]],
      }));
      setDirections(routes);

      // Fetch carriers from our FastAPI backend
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/carriers`,
        {
          from_city: fromCity.description,
          to_city: toCity.description,
        }
      );
      setCarriers(response.data.carriers);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return <div className="loading">Loading maps...</div>;

  return (
    <div className="app">
      <header className="header">
        <h1>Genlogs</h1>
        <p>Find carriers moving trucks between US cities</p>
      </header>

      <div className="search-panel">
        <PlacesInput label="From" onSelect={setFromCity} />
        <PlacesInput label="To" onSelect={setToCity} />
        <button
          className="search-btn"
          onClick={handleSearch}
          disabled={!fromCity || !toCity || loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <div className="content">
        {/* Map */}
        <div className="map-container">
          <GoogleMap
            zoom={5}
            center={{ lat: 39.5, lng: -98.35 }}
            mapContainerClassName="map"
          >
            {directions.map((dir, i) => (
              <DirectionsRenderer
                key={i}
                directions={dir}
                options={{
                  polylineOptions: {
                    strokeColor: ["#2563EB", "#16A34A", "#DC2626"][i],
                    strokeWeight: 4,
                  },
                  suppressMarkers: i > 0,
                }}
              />
            ))}
          </GoogleMap>
        </div>

        {/* Carriers list */}
        {carriers.length > 0 && (
          <div className="carriers-panel">
            <h2>Top Carriers</h2>
            <p className="route-label">
              {fromCity?.description} → {toCity?.description}
            </p>
            <ul className="carriers-list">
              {carriers.map((carrier, i) => (
                <li key={i} className="carrier-card">
                  <span className="carrier-rank">#{i + 1}</span>
                  <div className="carrier-info">
                    <span className="carrier-name">{carrier.name}</span>
                    <span className="carrier-trucks">
                      {carrier.trucks_per_day} trucks/day
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}