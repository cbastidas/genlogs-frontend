import React, { useState } from "react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { GoogleMap, useLoadScript, DirectionsRenderer } from "@react-google-maps/api";
import axios from "axios";
import "./App.css";

const libraries = ["places"];

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

export default function App() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [fromCity, setFromCity] = useState(null);
  const [toCity, setToCity] = useState(null);
  const [directions, setDirections] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 39.5, lng: -98.35 });
  const [mapZoom, setMapZoom] = useState(4);
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
      // Request directions with alternative routes
      const directionsService = new window.google.maps.DirectionsService();
      const result = await directionsService.route({
        origin: { lat: fromCity.lat, lng: fromCity.lng },
        destination: { lat: toCity.lat, lng: toCity.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      });

      // Build one DirectionsResult per alternative route
      const routes = result.routes.slice(0, 3).map((_, i) => ({
        ...result,
        routes: [result.routes[i]],
      }));
      setDirections(routes);

      // Center map between the two cities
      setMapCenter({
        lat: (fromCity.lat + toCity.lat) / 2,
        lng: (fromCity.lng + toCity.lng) / 2,
      });
      setMapZoom(6);

      // Fetch carriers from FastAPI backend
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

  const routeColors = ["#2563EB", "#16A34A", "#DC2626"];

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
        <div className="map-container">
          <GoogleMap
            zoom={mapZoom}
            center={mapCenter}
            mapContainerClassName="map"
          >
            {directions.map((dir, i) => (
              <DirectionsRenderer
                key={i}
                directions={dir}
                options={{
                  polylineOptions: {
                    strokeColor: routeColors[i],
                    strokeWeight: 5,
                    strokeOpacity: 0.8,
                  },
                  suppressMarkers: i > 0,
                }}
              />
            ))}
          </GoogleMap>
        </div>

        {carriers.length > 0 && (
          <div className="carriers-panel">
            <h2>Top Carriers</h2>
            <p className="route-label">
              {fromCity?.description} → {toCity?.description}
            </p>
            {directions.length > 1 && (
              <div className="routes-legend">
                {directions.map((_, i) => (
                  <div key={i} className="legend-item">
                    <span
                      className="legend-dot"
                      style={{ background: routeColors[i] }}
                    />
                    <span>Route {i + 1}</span>
                  </div>
                ))}
              </div>
            )}
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