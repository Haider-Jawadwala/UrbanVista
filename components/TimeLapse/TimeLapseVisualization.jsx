import React, { useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYWJpemVyNzg2IiwiYSI6ImNtMXBib3QzNDAyaXMyanM2NHozZ2UzMG4ifQ.ORflOjRbApQD8WOMkE3j-Q';

const TimeLapseVisualization = ({ plotData, isVisible, bounds }) => {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchImages = useCallback(async () => {
    if (!plotData || !plotData.lat || !plotData.lon || !plotData.boundaries) return;

    setIsLoading(true);
    setError(null);
    try {
      const { north, south, east, west } = plotData.boundaries;
      const centerLat = (north + south) / 2;
      const centerLon = (east + west) / 2;

      const variations = [
        { zoom: 14, lat: centerLat, lon: centerLon, label: 'Overview', addBoundary: true },
        { zoom: 16, lat: north, lon: east, label: 'Northeast' },
        { zoom: 16, lat: south, lon: east, label: 'Southeast' },
        { zoom: 16, lat: north, lon: west, label: 'Northwest' },
        { zoom: 16, lat: south, lon: west, label: 'Southwest' },
        { zoom: 16, lat: centerLat, lon: centerLon, label: 'Close-up', addBoundary: true },
      ];

      const imagePromises = variations.map(async (variation) => {
        let url = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/`;
        
        if (variation.addBoundary) {
          const geoJson = encodeURIComponent(JSON.stringify({
            type: 'Feature',
            properties: { 'stroke': '#ff0000', 'stroke-width': 2 },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [west, north],
                [east, north],
                [east, south],
                [west, south],
                [west, north]
              ]]
            }
          }));
          url += `geojson(${geoJson})/`;
        }
        
        url += `${variation.lon},${variation.lat},${variation.zoom},0/300x300@2x?access_token=${MAPBOX_ACCESS_TOKEN}&attribution=false&logo=false`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        return { label: variation.label, url: URL.createObjectURL(blob) };
      });

      const fetchedImages = await Promise.all(imagePromises);
      setImages(fetchedImages);
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to load images. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [plotData]);

  useEffect(() => {
    if (plotData && plotData.lat && plotData.lon && plotData.boundaries) {
      fetchImages();
    }
    return () => {
      images.forEach(image => URL.revokeObjectURL(image.url));
    };
  }, [plotData, fetchImages]);

  useEffect(() => {
    let interval;
    if (images.length > 0 && !isLoading) {
      interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [images, isLoading]);

  if (!isVisible) return null;

  return (
    <Draggable bounds={bounds}>
      <div className="absolute z-50 bg-black p-4 rounded-lg shadow-lg w-96 cursor-move">
        <h3 className="text-white text-lg font-semibold mb-2">Area Visualization</h3>
        <div className="relative w-[340px] h-[180px]">
          {isLoading ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-white">Loading images...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-red-500">{error}</p>
            </div>
          ) : images.length > 0 ? (
            <>
              <img
                src={images[currentIndex].url}
                alt={`Satellite image: ${images[currentIndex].label}`}
                className="w-full h-full object-cover rounded"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                {images[currentIndex].label}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-white">No images available</p>
            </div>
          )}
        </div>
        {plotData && (
          <div className="mt-4 text-white">
            <h4 className="font-semibold mb-2">Plot Details:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p>Lat: {plotData.lat}</p>
                
                {plotData.size && <p>Area: {Math.round(plotData.size)} sq meters</p>}
              </div>
              <div>
              <p>Lon: {plotData.lon}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default TimeLapseVisualization;