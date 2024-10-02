import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Thermometer, Droplets, Cloud, Wind, Sun, Compass } from 'lucide-react';

const API_KEY = '05c0c024456b2ebf398ba15660e5b043'; // Replace with your actual API key

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  cloudCover: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  date: string;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card className="hover:shadow-lg transition-shadow duration-300">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const GeolocationWeatherDashboard: React.FC = () => {
  const [currentData, setCurrentData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [city, setCity] = useState<string>('');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Unable to retrieve your location. Please check your browser settings.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetchWeatherData();
    }
  }, [location]);

  const fetchWeatherData = async () => {
    try {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${location?.lat}&lon=${location?.lon}&appid=${API_KEY}&units=metric`);
      const data = response.data;
      setCity(data.city.name);

      // Set current weather data
      if (data.list && data.list.length > 0) {
        setCurrentData({
          temperature: data.list[0].main.temp,
          feelsLike: data.list[0].main.feels_like,
          humidity: data.list[0].main.humidity,
          cloudCover: data.list[0].clouds.all,
          windSpeed: data.list[0].wind.speed,
          windDirection: data.list[0].wind.deg,
          pressure: data.list[0].main.pressure,
          date: new Date(data.list[0].dt * 1000).toLocaleString()
        });
      }

      // Process forecast data
      const processedForecast = data.list.map((item: any) => ({
        temperature: item.main.temp,
        feelsLike: item.main.feels_like,
        humidity: item.main.humidity,
        cloudCover: item.clouds.all,
        windSpeed: item.wind.speed,
        windDirection: item.wind.deg,
        pressure: item.main.pressure,
        date: new Date(item.dt * 1000).toLocaleString()
      }));

      setForecastData(processedForecast);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setError("Unable to fetch weather data. Please try again later.");
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div id="weather" className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Weather Dashboard for {city}</h1>
      
      {currentData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard title="Temperature" value={`${currentData.temperature.toFixed(1)}°C`} icon={<Thermometer className="h-6 w-6 text-orange-500" />} />
          <StatCard title="Feels Like" value={`${currentData.feelsLike.toFixed(1)}°C`} icon={<Thermometer className="h-6 w-6 text-red-500" />} />
          <StatCard title="Humidity" value={`${currentData.humidity}%`} icon={<Droplets className="h-6 w-6 text-blue-500" />} />
          <StatCard title="Cloud Cover" value={`${currentData.cloudCover}%`} icon={<Cloud className="h-6 w-6 text-gray-500" />} />
          <StatCard title="Wind Speed" value={`${currentData.windSpeed.toFixed(1)} m/s`} icon={<Wind className="h-6 w-6 text-teal-500" />} />
          <StatCard title="Pressure" value={`${currentData.pressure} hPa`} icon={<Compass className="h-6 w-6 text-purple-500" />} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>5-Day Temperature Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={false} label={{ value: 'Time', position: 'insideBottom', offset: 3 }} />
                <YAxis />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="temperature" name="Temperature" stroke="#ff7300" dot={false} />
                <Line type="monotone" dataKey="feelsLike" name="Feels Like" stroke="#ff0000" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5-Day Weather Factors Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={false} label={{ value: 'Time', position: 'insideBottom', offset: 3 }} />
                <YAxis />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} />
                <Legend />
                <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" dot={false} />
                <Line type="monotone" dataKey="cloudCover" name="Cloud Cover (%)" stroke="#6b7280" dot={false} />
                <Line type="monotone" dataKey="windSpeed" name="Wind Speed (m/s)" stroke="#14b8a6" dot={false} />
                <Line type="monotone" dataKey="pressure" name="Pressure (hPa)" stroke="#8b5cf6" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GeolocationWeatherDashboard;