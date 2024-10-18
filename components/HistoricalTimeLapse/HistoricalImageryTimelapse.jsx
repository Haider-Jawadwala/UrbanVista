import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import WMTS from 'ol/source/WMTS';
import WMTSTileGrid from 'ol/tilegrid/WMTS';
import { get as getProjection } from 'ol/proj';
import { getTopLeft, getWidth } from 'ol/extent';

const HistoricalImageryTimelapse = ({ lat, lon, isVisible }) => {
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(null);

  useEffect(() => {
    if (!isVisible || typeof window === 'undefined') return;

    let map;

    const initializeMap = () => {
      try {
        if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
          throw new Error('Invalid latitude or longitude');
        }

        const projection = getProjection('EPSG:3857');
        const projectionExtent = projection.getExtent();
        const size = getWidth(projectionExtent) / 256;
        const resolutions = new Array(20);
        const matrixIds = new Array(20);
        for (let z = 0; z < 20; ++z) {
          resolutions[z] = size / Math.pow(2, z);
          matrixIds[z] = z;
        }

        const baseLayer = new TileLayer({
          source: new OSM()
        });

        const satelliteLayer = new TileLayer({
          opacity: 0.7,
          source: new WMTS({
            url: 'https://gibs-{a-c}.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
            layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
            matrixSet: 'GoogleMapsCompatible_Level9',
            format: 'image/jpeg',
            projection: projection,
            tileGrid: new WMTSTileGrid({
              origin: getTopLeft(projectionExtent),
              resolutions: resolutions,
              matrixIds: matrixIds,
            }),
            style: '',
            wrapX: true,
            time: '2023-01-01'
          })
        });

        map = new Map({
          target: mapRef.current,
          layers: [baseLayer, satelliteLayer],
          view: new View({
            center: fromLonLat([lon, lat]),
            zoom: 8
          })
        });

        setLoading(false);

        // Set up timelapse
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');
        let currentDate = new Date(startDate);

        const changeDate = () => {
          const dateString = currentDate.toISOString().split('T')[0];
          setCurrentDate(dateString);

          satelliteLayer.getSource().updateParams({ TIME: dateString });

          currentDate.setDate(currentDate.getDate() + 1);
          if (currentDate > endDate) {
            currentDate = new Date(startDate);
          }
        };

        const interval = setInterval(changeDate, 1000);
        changeDate(); // Initial change

        return () => {
          clearInterval(interval);
        };

      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map: ' + err.message);
        setLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (map) {
        map.setTarget(null);
      }
    };
  }, [lat, lon, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-black p-4 rounded-lg shadow-lg w-96">
      <h3 className="text-white text-lg font-semibold mb-2">Historical Imagery Time Lapse</h3>
      
      {loading && <p className="text-white">Loading map...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      
      <div ref={mapRef} style={{ width: '100%', height: '300px' }} />
      
      {currentDate && (
        <p className="text-white text-sm mt-2">
          Showing imagery from: {currentDate}
        </p>
      )}
    </div>
  );
};

export default HistoricalImageryTimelapse;