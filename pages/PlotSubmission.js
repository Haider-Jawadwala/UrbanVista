import React, { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import { debounce } from 'lodash';
import { FaMapMarkerAlt, FaUser, FaEnvelope, FaMobile, FaFileUpload, FaPlus, FaMinus } from 'react-icons/fa';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYWJpemVyNzg2IiwiYSI6ImNtMXBib3QzNDAyaXMyanM2NHozZ2UzMG4ifQ.ORflOjRbApQD8WOMkE3j-Q';
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

const PlotSubmissionPage = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [lng, setLng] = useState(null);
  const [lat, setLat] = useState(null);
  const [zoom, setZoom] = useState(14);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [City, setCity] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
        },
        error => {
          console.error("Error getting user location:", error);
          // Set default coordinates if geolocation fails
          setLat(42.35);
          setLng(-70.9);
        }
      );
    } else {
      console.log("Geolocation is not available in this browser.");
      // Set default coordinates if geolocation is not supported
      setLat(42.35);
      setLng(-70.9);
    }
  }, []);

  const initializeMap = useCallback(() => {
    if (map.current || !lat || !lng) return; // initialize map only once and when coordinates are available

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [lng, lat],
      zoom: zoom,
      attributionControl: false,
      preserveDrawingBuffer: true,
      antialias: true,
      fadeDuration: 0,
      renderWorldCopies: false
    });

    map.current.on('load', () => {
      map.current.resize();
      marker.current = new mapboxgl.Marker({ color: '#FF0000', draggable: false })
        .setLngLat([lng, lat])
        .addTo(map.current);

      map.current.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        updateMarkerPosition(lng, lat);
      });
    });

    map.current.on('zoom', () => {
      if (map.current) {
        setZoom(map.current.getZoom().toFixed(2));
      }
    });
  }, [lng, lat, zoom]);

  const updateMarkerPosition = useCallback((newLng, newLat) => {
    if (marker.current) {
      marker.current.setLngLat([newLng, newLat]);
      setLng(newLng.toFixed(6));
      setLat(newLat.toFixed(6));
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (map.current) {
      map.current.zoomTo(map.current.getZoom() + 1);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (map.current) {
      map.current.zoomTo(map.current.getZoom() - 1);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;
    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initializeMap]);

  useEffect(() => {
    if (!mapContainer.current) return;
    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initializeMap]);

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (query.length > 2) {
        try {
          const response = await axios.get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place,address`
          );
          setSuggestions(response.data.features.map(feature => ({
            place_name: feature.place_name,
            center: feature.center
          })));
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      } else {
        setSuggestions([]);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleSuggestionClick = useCallback((suggestion) => {
    setSearchQuery(suggestion.place_name);
    setSuggestions([]);
    if (map.current) {
      // Move the map to the new center without changing zoom
      map.current.setCenter(suggestion.center);
      
      // Update marker position
      updateMarkerPosition(suggestion.center[0], suggestion.center[1]);
    }
  }, [updateMarkerPosition]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('latitude', marker.current.getLngLat().lat);
    formData.append('longitude', marker.current.getLngLat().lng);
    formData.append('owner_name', ownerName);
    formData.append('owner_email', ownerEmail);
    formData.append('owner_mobile', ownerMobile);
    formData.append('city', City);
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('http://localhost:8000/api/submit-plot', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Plot submitted successfully:', response.data);
      setOwnerName('');
      setOwnerEmail('');
      setOwnerMobile('');
      setCity('');
      setFiles([]);
    } catch (error) {
      console.error('Error submitting plot:', error);
    }
  };

  return (
    <div className="plot-submission-page flex h-screen bg-black text-white">
      <div className="w-1/2 p-8 overflow-y-auto mt-12">
        <h2 className="text-2xl font-bold mb-6">Submit Plot Information</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <FaMapMarkerAlt className="absolute top-3 left-3 text-gray-400" />
              <input
                type="text"
                value={lat}
                readOnly
                placeholder="Latitude"
                className="w-full p-2 pl-10 border border-gray-600 rounded bg-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <FaMapMarkerAlt className="absolute top-3 left-3 text-gray-400" />
              <input
                type="text"
                value={lng}
                readOnly
                placeholder="Longitude"
                className="w-full p-2 pl-10 border border-gray-600 rounded bg-gray-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="relative">
            <FaMapMarkerAlt className="absolute top-3 left-3 text-gray-400" />
            <input
              type="text"
              value={City}
              onChange={(e) => setCity(e.target.value)}
              required
              placeholder="City"
              className="w-full p-2 pl-10 border border-gray-600 rounded bg-gray-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <FaUser className="absolute top-3 left-3 text-gray-400" />
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
              placeholder="Owner Name"
              className="w-full p-2 pl-10 border border-gray-600 rounded bg-gray-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <FaEnvelope className="absolute top-3 left-3 text-gray-400" />
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
              placeholder="Owner Email"
              className="w-full p-2 pl-10 border border-gray-600 rounded bg-gray-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <FaMobile className="absolute top-3 left-3 text-gray-400" />
            <input
              type="tel"
              value={ownerMobile}
              onChange={(e) => setOwnerMobile(e.target.value)}
              required
              placeholder="Owner Mobile"
              className="w-full p-2 pl-10 border border-gray-600 rounded bg-gray-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <FaFileUpload className="absolute top-3 left-3 text-gray-400" />
            <input
              type="file"
              multiple
              onChange={(e) => setFiles([...e.target.files])}
              accept="image/*,video/*"
              className="w-full p-2 pl-10 border border-gray-600 rounded bg-gray-800 focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Submit Plot
          </button>
        </form>
      </div>
      <div className="w-1/2 relative mt-12 p-4">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full rounded-lg" />
        <div className="absolute top-8 left-8 right-8 z-10">
          <div className="relative">
            <FaMapMarkerAlt className="absolute top-3 left-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a location"
              className="w-full p-2 pl-10 border border-gray-600 rounded shadow-sm bg-gray-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          {suggestions.length > 0 && (
            <ul className="mt-2 bg-gray-800 border border-gray-600 rounded shadow-sm max-h-40 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="p-2 hover:bg-gray-700 cursor-pointer"
                >
                  {suggestion.place_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="absolute top-20 right-8 z-10 flex flex-col">
          <button
            onClick={handleZoomIn}
            className="bg-white text-black p-2 mb-2 rounded-full shadow-md hover:bg-gray-200 focus:outline-none"
          >
            <FaPlus />
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-white text-black p-2 rounded-full shadow-md hover:bg-gray-200 focus:outline-none"
          >
            <FaMinus />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlotSubmissionPage;
