import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'pk.eyJ1IjoiYWJpemVyNzg2IiwiYSI6ImNtMXBib3QzNDAyaXMyanM2NHozZ2UzMG4ifQ.ORflOjRbApQD8WOMkE3j-Q';

const Earth = ({ plotData, onMarkerClick, historicalLocation }) => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [historicalMarker, setHistoricalMarker] = useState(null);

  useEffect(() => {
    const initializeMap = () => {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v11',
        projection: 'globe',
        center: [0, 0],
        zoom: 0,
        maxZoom: 18,
      });

      setMap(map);
    };

    if (!map) initializeMap();

    return () => {
      if (map) map.remove();
    };
  }, [map]);

  // Update markers when plotData changes
  useEffect(() => {
    if (map) {
      // Clear existing markers
      markers.forEach(marker => marker.remove());
      setMarkers([]);

      if (plotData.length > 0) {
        const newMarkers = plotData.map((plot, index) => {
          let markerColor = '#0000FF'; // Default color (blue for available)

          if (plot.status === 'infrastructure') {
            markerColor = '#0000FF'; // Blue for infrastructure
          } else if (plot.status === 'environmental') {
            markerColor = '#00FF00'; // Green for environmental
          } else if (plot.status === 'available') {
            markerColor = '#FF0000'; // Red for available
          }

          const marker = new mapboxgl.Marker({ color: markerColor })
            .setLngLat([plot.lon, plot.lat])
            .addTo(map);

          marker.getElement().addEventListener('click', () => {
            onMarkerClick(index);
          });

          // Fly to the marker location
          map.flyTo({
            center: [plot.lon, plot.lat],
            zoom: 12,
            duration: 3000, // Duration of animation in milliseconds
          });

          return marker;
        });

        setMarkers(newMarkers);
      }
    }
  }, [map, plotData, onMarkerClick]);

  // Update historical location marker
  useEffect(() => {
    if (map && historicalLocation) {
      // Remove existing historical marker if any
      if (historicalMarker) {
        historicalMarker.remove();
      }

      // Create a new marker for the historical location
      const marker = new mapboxgl.Marker({ color: '#FF0000' }) // Red color to distinguish it
        .setLngLat([historicalLocation.lon, historicalLocation.lat])
        .addTo(map);

      setHistoricalMarker(marker);

      // Fly to the new location
      map.flyTo({
        center: [historicalLocation.lon, historicalLocation.lat],
        zoom: 1.4,
        duration: 3000, // Duration of animation in milliseconds
      });
    }
  }, [map, historicalLocation]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: '10px', overflow: 'hidden' }} />;
};

export default Earth;
