import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYWJpemVyNzg2IiwiYSI6ImNtMXBib3QzNDAyaXMyanM2NHozZ2UzMG4ifQ.ORflOjRbApQD8WOMkE3j-Q';

const SearchBar = ({ onSearch, initialPosition }) => {
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const suggestionTimeoutRef = useRef(null);

  useEffect(() => {
    if (city.length > 2) {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }

      suggestionTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(city);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [city]);

  const fetchSuggestions = async (query) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&types=place`
      );
      const data = await response.json();
      setSuggestions(data.features.map((feature) => feature.place_name));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const cityOnly = suggestion.split(',')[0].trim();
    setCity(cityOnly);
    setSuggestions([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(city);
  };

  return (
    <motion.div
      className="w-96 bg-black p-4 rounded-lg shadow-md"
      drag
      dragMomentum={false}
      initial={initialPosition}
    >
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border p-2 rounded w-full mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-700 text-white"
          placeholder="Enter city name"
        />
        <button
          type="submit"
          className="bg-gray-700 text-white p-2 rounded w-full font-semibold hover:bg-gray-600"
        >
          Find Empty Plots
        </button>
      </form>
      {suggestions.length > 0 && (
        <ul className="mt-2 bg-gray-800 rounded">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="p-2 hover:bg-gray-700 cursor-pointer"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

export default SearchBar;