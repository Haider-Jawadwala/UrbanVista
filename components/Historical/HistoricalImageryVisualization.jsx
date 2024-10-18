import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const HistoricalImageryVisualization = ({ plotData, isVisible }) => {
  const [combinedData, setCombinedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch global natural events data from EONET
        const eonetResponse = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events');
        if (!eonetResponse.ok) {
          throw new Error(`EONET API error: ${eonetResponse.status} ${eonetResponse.statusText}`);
        }
        const eonetResult = await eonetResponse.json();
        
        // Process global data
        const eventCounts = eonetResult.events.reduce((acc, event) => {
          const year = new Date(event.geometry[0].date).getFullYear();
          if (year >= 2019) {
            acc[year] = (acc[year] || 0) + 1;
          }
          return acc;
        }, {});

        // Fetch local weather data from Open-Meteo
        let localData = [];
        if (plotData && plotData.lat && plotData.lon) {
          const endDate = new Date();
          const startDate = new Date('2019-01-01');

          const openMeteoUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${plotData.lat}&longitude=${plotData.lon}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&daily=temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean&timezone=GMT`;

          const openMeteoResponse = await fetch(openMeteoUrl);
          if (!openMeteoResponse.ok) {
            throw new Error(`Open-Meteo API error: ${openMeteoResponse.status} ${openMeteoResponse.statusText}`);
          }

          const openMeteoData = await openMeteoResponse.json();

          // Process local data
          localData = openMeteoData.daily.time.map((date, index) => ({
            date: new Date(date).getFullYear(),
            temperature: openMeteoData.daily.temperature_2m_mean[index],
            precipitation: openMeteoData.daily.precipitation_sum[index],
            humidity: openMeteoData.daily.relative_humidity_2m_mean[index]
          }));

          // Aggregate data by year
          localData = Object.values(localData.reduce((acc, curr) => {
            if (!acc[curr.date]) {
              acc[curr.date] = { ...curr, count: 1 };
            } else {
              acc[curr.date].temperature += curr.temperature;
              acc[curr.date].precipitation += curr.precipitation;
              acc[curr.date].humidity += curr.humidity;
              acc[curr.date].count++;
            }
            return acc;
          }, {})).map(item => ({
            date: item.date,
            temperature: (item.temperature / item.count).toFixed(2),
            precipitation: (item.precipitation / item.count).toFixed(2),
            humidity: (item.humidity / item.count).toFixed(2),
          }));
        }

        // Combine global and local data
        const combinedData = Object.keys(eventCounts).map(year => ({
          year: parseInt(year),
          eventCount: eventCounts[year],
          ...localData.find(d => d.date === parseInt(year)) || {}
        })).sort((a, b) => a.year - b.year);

        setCombinedData(combinedData);  // Corrected this line
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
        // Set fallback data
        setCombinedData(generateMockCombinedData());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [plotData]);

  const generateMockCombinedData = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2018 }, (_, i) => ({
      year: 2019 + i,
      eventCount: Math.floor(Math.random() * 50 + 10),
      temperature: (Math.random() * 30 + 10).toFixed(2),
      precipitation: (Math.random() * 1000).toFixed(2),
      humidity: (Math.random() * 100).toFixed(2),
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="bg-black p-4 rounded-lg shadow-lg w-full h-full">
      
      {loading && <p className="text-white">Loading data...</p>}
      {error && <p className="text-red-500">Error: {error}. Displaying mock data.</p>}
      
      {!loading && (
        <div className="relative w-full h-[calc(100%-2rem)]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" stroke="#ffffff" />
              <YAxis yAxisId="left" stroke="#ffffff" />
              <YAxis yAxisId="right" orientation="right" stroke="#ffffff" />
              <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="eventCount" stroke="#8884d8" name="Global Events" />
              <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#82ca9d" name="Temperature (°C)" />
              <Line yAxisId="left" type="monotone" dataKey="precipitation" stroke="#ffc658" name="Precipitation (mm)" />
              <Line yAxisId="right" type="monotone" dataKey="humidity" stroke="#ff7300" name="Humidity (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default HistoricalImageryVisualization;