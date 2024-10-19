import React, { useState } from 'react';
import { useRouter } from 'next/router';

const PlotStatusComponent = ({ plot, onStatusUpdate }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const router = useRouter();

  const handleDrag = (event, info) => {
    setPosition({ x: info.point.x, y: info.point.y });
  };

  const handleStatusUpdate = async (status) => {
    try {
      const formData = new FormData();
      formData.append('latitude', plot.lat);
      formData.append('longitude', plot.lon);
      formData.append('status', status);

      const response = await fetch('http://localhost:8000/api/update-plot-status', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log(data.message);

      onStatusUpdate(status);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleFunding = () => {
    // Navigate to the payment page
    router.push('/payment');
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 1000,
      }}
      className="bg-black p-4 rounded-lg shadow-md w-96"
    >
      <h3 className="text-xl font-semibold mb-2 text-white">Plot Status</h3>
      <p className="text-white mb-2">Status: {plot.status || 'Available'}</p>
      <div className="space-y-2">
        <button
          onClick={() => handleStatusUpdate('infrastructure')}
          className="bg-blue-500 text-white p-2 rounded w-full hover:bg-blue-600"
        >
          Mark for Infrastructure Development
        </button>
        <button
          onClick={() => handleStatusUpdate('environmental')}
          className="bg-green-500 text-white p-2 rounded w-full hover:bg-green-600"
        >
          Mark for Environmental Development
        </button>
        {plot.status === 'environmental' && (
          <button
            onClick={handleFunding}
            className="bg-yellow-500 text-white p-2 rounded w-full hover:bg-yellow-600"
          >
            Fund This Plot
          </button>
        )}
      </div>
    </div>
  );
};

export default PlotStatusComponent;