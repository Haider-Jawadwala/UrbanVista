import React from 'react';
import { motion } from 'framer-motion';

const Recommendations = ({ recommendations, initialPosition }) => {
  return (
    <motion.div
      className="w-96 max-h-64 overflow-y-auto bg-black p-4 rounded-lg shadow-md"
      drag
      dragMomentum={false}
      initial={initialPosition}
    >
      <h3 className="text-xl font-semibold mb-2 text-white">Recommendations:</h3>
      {recommendations.length > 0 ? (
        <ul className="list-disc pl-5 text-white">
          {recommendations.map((recommendation, index) => (
            <li key={index}>{recommendation}</li>
          ))}
        </ul>
      ) : (
        <p className="text-white">Click "Find Empty Plots" to get recommendations for development in the selected area.</p>
      )}
    </motion.div>
  );
};

export default Recommendations;