import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const pollCategories = [
  "Residential Development",
  "Commercial Space",
  "Green Area / Park",
  "Educational Institution",
  "Healthcare Facility",
  "Mixed-Use Development"
];

const PollComponent = ({ showRecommendationPoll, currentFact, pollData, highlightedPlot, onVote, initialPosition }) => {
  const handleVote = async (category) => {
    if (!highlightedPlot) {
      console.error('No plot selected');
      return;
    }
    onVote(category, highlightedPlot.lat, highlightedPlot.lon);
  };

  const RecommendationPoll = () => (
    <div className="mt-2">
      <h3 className="text-lg font-semibold mb-1 text-white">Vote for development:</h3>
      <ul className="space-y-1">
        {pollCategories.map((category, index) => (
          <li key={index}>
            <button
              onClick={() => handleVote(category)}
              className="bg-gray-700 text-white p-1 rounded hover:bg-gray-600 w-full text-left text-sm"
            >
              {category}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const EnvironmentalFact = () => (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-white">Environmental Tip:</h3>
      <p className="text-white">{currentFact}</p>
    </div>
  );

  const PollGraph = ({ pollData }) => (
    <div className="mt-4">
      <h3 className="text-xl font-semibold mb-2 text-white">Community Votes</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={pollData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <XAxis
            dataKey="category"
            tick={{ fill: '#ffffff', fontSize: 8 }}
            angle={-45}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#4a5568' }} itemStyle={{ color: '#e2e8f0' }} />
          <Bar dataKey="votes" fill="#ffffff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <motion.div
      className="w-96 bg-black p-4 rounded-lg shadow-md"
      drag
      dragMomentum={false}
      initial={initialPosition}
    >
      {showRecommendationPoll ? (
        <>
          <RecommendationPoll />
          {pollData && pollData.length > 0 && <PollGraph pollData={pollData} />}
        </>
      ) : (
        <EnvironmentalFact />
      )}
    </motion.div>
  );
};

export default PollComponent;