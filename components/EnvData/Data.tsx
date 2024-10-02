import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Trees, Droplets, MapPin, Leaf } from 'lucide-react';

// OpenStreetMap Overpass API URL for fetching geographical data
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Function to get the Overpass query for natural reserves, forests, water bodies, wildlife reserves
const getOverpassQuery = (region: string) => `
  [out:json];
  area[name="${region}"]->.searchArea;
  (
    node["leisure"="nature_reserve"](area.searchArea);
    node["natural"="wood"](area.searchArea);
    node["natural"="water"](area.searchArea);
    node["boundary"="national_park"](area.searchArea);
    node["leisure"="wildlife_reserve"](area.searchArea);
  );
  out body;
  >;
  out skel qt;
`;

interface GeoDataCount {
  type: string; // nature_reserve, wood, water, national_park, wildlife_reserve
  count: number;
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

const GeoDataDashboard: React.FC = () => {
  const [geoDataCount, setGeoDataCount] = useState<GeoDataCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<string>('India'); // Default region is India

  useEffect(() => {
    fetchGeoData(region);
  }, [region]);

  const fetchGeoData = async (regionName: string) => {
    setLoading(true);
    setError(null);

    try {
      const query = getOverpassQuery(regionName);
      const response = await axios.post(OVERPASS_API_URL, `data=${query}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const rawData = response.data.elements;

      // Count the number of each type
      const counts: GeoDataCount[] = [
        { type: 'Nature Reserve', count: rawData.filter((item: any) => item.tags.leisure === 'nature_reserve').length },
        { type: 'Forest', count: rawData.filter((item: any) => item.tags.natural === 'wood').length },
        { type: 'Water Body', count: rawData.filter((item: any) => item.tags.natural === 'water').length },
        { type: 'National Park', count: rawData.filter((item: any) => item.tags.boundary === 'national_park').length },
        { type: 'Wildlife Reserve', count: rawData.filter((item: any) => item.tags.leisure === 'wildlife_reserve').length },
      ];

      setGeoDataCount(counts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching geographical data:', error);
      setError('Unable to fetch geographical data. Please try again later.');
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
    <div id="geo-dashboard" className="p-6 bg-gray-100 min-h-full"> {/* Removed min-h-screen */}
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Geographical Data for {region}</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {geoDataCount.map((geo, index) => (
          <StatCard
            key={index}
            title={geo.type}
            value={geo.count}
            icon={
              geo.type === 'Nature Reserve' ? (
                <Leaf className="h-6 w-6 text-green-500" />
              ) : geo.type === 'Forest' ? (
                <Trees className="h-6 w-6 text-green-700" />
              ) : geo.type === 'Water Body' ? (
                <Droplets className="h-6 w-6 text-blue-500" />
              ) : geo.type === 'National Park' ? (
                <MapPin className="h-6 w-6 text-red-500" />
              ) : (
                <MapPin className="h-6 w-6 text-yellow-500" />
              )
            }
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Select a Region</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="p-2 border rounded-md w-full"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="Brazil">Brazil</option>
              <option value="Russia">Russia</option>
              <option value="Australia">Australia</option>
            </select>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GeoDataDashboard;
