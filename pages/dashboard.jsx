import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import 'tailwindcss/tailwind.css';
import historicalLocations from '../data/historical-locations.json';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import environmentalFacts from '../data/environmentalFacts';
import TimeLapseVisualization from '../components/TimeLapse/TimeLapseVisualization';
import HistoricalImageryVisualization from '../components/Historical/HistoricalImageryVisualization';
import PlotStatusComponent from '../components/PlotStatus/PlotStatusComponent';

const Earth = dynamic(() => import('../components/EarthDash/earthdash'), { ssr: false });

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoiYWJpemVyNzg2IiwiYSI6ImNtMXBib3QzNDAyaXMyanM2NHozZ2UzMG4ifQ.ORflOjRbApQD8WOMkE3j-Q';

const CustomTooltip = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-20 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm whitespace-nowrap"
            style={{
              top: 'calc(100% + 10px)',
              right: '50%',
            }}
          >
            {content}
            <div
              className="absolute w-2 h-2 bg-gray-900 rotate-45"
              style={{
                top: '-4px',
                right: '10px',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Dashboard() {
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [plotData, setPlotData] = useState([]);
  const [highlightedPlot, setHighlightedPlot] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isHistoricalMappingActive, setIsHistoricalMappingActive] = useState(true);
  const [isLeftColumnVisible, setIsLeftColumnVisible] = useState(true);
  const [pollData, setPollData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const suggestionTimeoutRef = useRef(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showRecommendationPoll, setShowRecommendationPoll] = useState(false);
  const [currentFact, setCurrentFact] = useState('');
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [showTimeLapse, setShowTimeLapse] = useState(false);
  const VRIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8z" />
      <path d="M9 12c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z" />
      <path d="M17 12c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z" />
      <path d="M3 10v4" />
      <path d="M21 10v4" />
      <path d="M12 7v1" />
      <path d="M12 16v1" />
      <path d="M7 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2H7z" />
    </svg>
  );
  const [pollCategories, setPollCategories] = useState([
    "Residential Development",
    "Commercial Space",
    "Green Area / Park",
    "Educational Institution",
    "Healthcare Facility",
    "Mixed-Use Development"
  ]);

  useEffect(() => {
    // Set initial random fact
    setCurrentFact(environmentalFacts[Math.floor(Math.random() * environmentalFacts.length)]);

    // Change fact every 10 seconds
    const factInterval = setInterval(() => {
      setCurrentFact(environmentalFacts[Math.floor(Math.random() * environmentalFacts.length)]);
    }, 10000);

    return () => clearInterval(factInterval);
  }, []);

  useEffect(() => {
    let interval;

    if (isHistoricalMappingActive) {
      const changeLocation = () => {
        const randomIndex = Math.floor(Math.random() * historicalLocations.length);
        setCurrentLocation(historicalLocations[randomIndex]);
      };

      changeLocation(); // Initial location
      interval = setInterval(changeLocation, 10000); // Change every 10 seconds for smoother transitions
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isHistoricalMappingActive]);

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

  const findPlots = async (e) => {
    e.preventDefault();
    setMessage('');
    setPlotData([]);
    setPollData([]);
    setHighlightedPlot(null);
    setLoading(true);
    setIsHistoricalMappingActive(false);
    setShowGraph(true);
    setShowRecommendationPoll(true);
    setShowTimeLapse(false);

    try {
      const formData = new FormData();
      formData.append('city', city);

      const response = await fetch('http://localhost:8000/api/get-empty-plots', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      setMessage(data.message);
      setPlotData(data.plots || []);
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (lat, lon) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('lat', lat);
      formData.append('lon', lon);

      const response = await fetch('http://localhost:8000/api/get-recommendations', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      setHighlightedPlot({
        lat: data.lat,
        lon: data.lon,
        population: data.population,
        climate: data.climate,
      });

      // Parse recommendations only if it's a string
      if (typeof data.recommendations === 'string') {
        const recommendationList = data.recommendations.split('\n').filter(item => item.trim() !== '');
        setRecommendations(recommendationList);
      } else if (Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }

      // Fetch poll data separately
      await fetchPollData(lat, lon);
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while fetching recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (status) => {
    setSelectedPlot(prevPlot => ({
      ...prevPlot,
      status: status
    }));
  };

  const handleMarkerClick = (index) => {
    const plot = plotData[index];
    setSelectedPlot(plot);
    setShowTimeLapse(true);
    fetchRecommendations(plot.lat, plot.lon);
  };

  const handleVote = async (category) => {
    if (!highlightedPlot) {
      console.error('No plot selected');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('lat', highlightedPlot.lat);
      formData.append('lon', highlightedPlot.lon);
      formData.append('category', category);

      const response = await fetch('http://localhost:8000/api/vote', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log(data.message);

      // Refresh poll data after voting
      fetchPollData(highlightedPlot.lat, highlightedPlot.lon);
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while submitting your vote.');
    }
  };

  const RecommendationPoll = () => {
    return (
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
  };

  const EnvironmentalFact = () => (
    <div className="bg-black p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2 text-white">Environmental Tip:</h3>
      <p className="text-white">{currentFact}</p>
    </div>
  );

  const fetchPollData = async (lat, lon) => {
    try {
      const response = await fetch(`http://localhost:8000/api/poll-data?lat=${lat}&lon=${lon}`);
      const data = await response.json();
      setPollData(data.poll_data);
    } catch (error) {
      console.error('Error fetching poll data:', error);
    }
  };

  const PollGraph = ({ pollData }) => {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
      const maxVotes = Math.max(...pollData.map(item => item.votes));
      const normalizedData = pollData.map(item => ({
        category: item.category,
        votes: (item.votes / maxVotes) * 100, // Normalize to percentage
      }));
      setChartData(normalizedData);
    }, [pollData]);

    const chartAnimation = useSpring({
      from: { opacity: 0, transform: 'scale(0.8)' },
      to: { opacity: 1, transform: 'scale(1)' },
      config: { duration: 1000 },
    });

    return (
      <motion.div
        className="mt-8 bg-gradient-to-br from-gray-900 to-black rounded-lg shadow-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h3 className="text-xl font-semibold mb-4 text-center text-blue-400">Community Preferences</h3>
        <animated.div style={chartAnimation} className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
              <PolarGrid stroke="#4a5568" />
              <PolarAngleAxis dataKey="category" tick={{ fill: '#e2e8f0', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#e2e8f0' }} />
              <Radar name="Votes" dataKey="votes" stroke="#4fd1c5" fill="#4fd1c5" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </animated.div>
      </motion.div>
    );
  };

  // Animation variants for smooth transitions
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.5 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    },
    exit: {
      y: 20,
      opacity: 0,
      transition: { duration: 0.5, ease: "easeIn" }
    }
  };

  const HistoricalDataDisplay = ({ currentLocation }) => {
    if (!currentLocation) {
      return <div className="text-white">No historical location selected.</div>;
    }

    return (
      <div className="bg-black p-4 rounded-lg shadow-md h-full overflow-y-auto">
        <h3 className="text-xl font-semibold mb-2 text-white">Historical Location Spotlight</h3>
        <p><strong className="text-white">{currentLocation.name}</strong></p>
        <p><strong className="text-white">Location:</strong> Lat: {currentLocation.lat}, Lon: {currentLocation.lon}</p>
        <p className="mt-2 text-white">{currentLocation.facts}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <Head>
        <title>Find Empty Plots</title>
        <meta name="description" content="Find empty plots in a city" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="h-screen relative">
        {/* Earth component (centered and full-screen) */}
        <div className="absolute inset-0 z-0">
          <Earth
            plotData={plotData}
            onMarkerClick={handleMarkerClick}
            historicalLocation={isHistoricalMappingActive ? currentLocation : null}
            highlightedPlot={highlightedPlot}
          />
        </div>

        {/* Search bar and button (top-left corner) */}
        <div className="absolute top-14 left-4 z-10 w-96 ">
          <form onSubmit={findPlots} className="bg-black p-4 rounded-lg shadow-md">
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
        </div>

        {/* Recommendations (top-right corner) */}
        <div className="absolute top-14 right-4 z-10 w-96 max-h-64 overflow-y-auto bg-black p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold text-white">Recommendations:</h3>
            <CustomTooltip content="VR Visualization">
              <button
                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full"
                onClick={() => console.log('VR mode activated')}
                aria-label="Activate VR mode"
              >
                <VRIcon />
              </button>
            </CustomTooltip>
          </div>
          {recommendations.length > 0 ? (
            <ul className="list-disc pl-5 text-white">
              {recommendations.map((recommendation, index) => (
                <li key={index}>{recommendation}</li>
              ))}
            </ul>
          ) : (
            <p className="text-white">Click "Find Empty Plots" to get recommendations for development in the selected area.</p>
          )}
        </div>

        {/* Poll (bottom-right corner) */}
        <div className="absolute bottom-4 right-4 z-10 w-96 bg-black p-4 rounded-lg shadow-md">
          {showRecommendationPoll ? <RecommendationPoll /> : <EnvironmentalFact />}
        </div>

        {/* Graph or Historical Data (bottom-left corner) */}
        <div className="absolute bottom-4 left-4 z-10 w-96 h-64 bg-black p-4 rounded-lg shadow-md">
          {showGraph ? (
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
                  <Tooltip contentStyle={{ backgroundColor: '#1a202c', borderColor: '#4a5568' }} itemStyle={{ color: '#e2e8f0' }} />
                  <Bar dataKey="votes" fill="#ffffff" />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <HistoricalDataDisplay currentLocation={currentLocation} />
          )}
        </div>

        {/* Time-Lapse Visualization */}
        <TimeLapseVisualization
          plotData={selectedPlot}
          isVisible={showTimeLapse}
        />
        <HistoricalImageryVisualization
          plotData={selectedPlot}
          isVisible={showTimeLapse}
        />
        <AnimatePresence>
          {selectedPlot && (
            <PlotStatusComponent
              plot={selectedPlot}
              onStatusUpdate={handleStatusUpdate}
            />
          )}
        </AnimatePresence>

        {/* Loading screen */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="loading-circle"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style jsx>{`
        .loading-circle {
          border: 8px solid #f3f3f3;
          border-top: 8px solid #3498db;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Custom scrollbar styles */
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: #4a5568 #2d3748;
        }

        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: #2d3748;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: #4a5568;
          border-radius: 4px;
          border: 2px solid #2d3748;
        }
      `}</style>
    </div>
  );
}
