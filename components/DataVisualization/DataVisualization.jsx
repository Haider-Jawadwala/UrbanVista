import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DataVisualization = ({ showGraph, pollData, currentLocation, initialPosition }) => {
  const PollGraph = () => (
    <>
      <h3 className="text-xl font-semibold mb-2 text-white">Community Votes</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pollData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <XAxis
            dataKey="category"
            tick={{ fill: '#ffffff', fontSize: 8 }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis tick={{ fill: '#ffffff' }} />
          <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#4a5568' }} itemStyle={{ color: '#e2e8f0' }} />
          <Bar dataKey="votes" fill="#4fd1c5" />
        </BarChart>
      </ResponsiveContainer>
    </>
  );

  const HistoricalDataDisplay = () => {
    if (!currentLocation) {
      return <div className="text-white">No historical location selected.</div>;
    }

    return (
      <>
        <h3 className="text-xl font-semibold mb-2 text-white">Historical Location Spotlight</h3>
        <p><strong className="text-white">{currentLocation.name}</strong></p>
        <p><strong className="text-white">Location:</strong> Lat: {currentLocation.lat}, Lon: {currentLocation.lon}</p>
        <p className="mt-2 text-white">{currentLocation.facts}</p>
      </>
    );
  };

  return (
    <motion.div
      className="w-96 h-64 bg-black p-4 rounded-lg shadow-md overflow-y-auto"
      drag
      dragMomentum={false}
      initial={initialPosition}
    >
      {showGraph ? <PollGraph /> : <HistoricalDataDisplay />}
    </motion.div>
  );
};

export default DataVisualization;