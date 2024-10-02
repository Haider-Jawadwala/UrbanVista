import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Trees, Droplets, Leaf, Wind, Factory, Sun, AlertTriangle } from 'lucide-react';

const DATA_URL = 'https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv';

const indicators: Record<string, string> = {
  "Forest area (% of land area)": "forest_area_perc",
  "Renewable energy consumption (% of total)": "renewables_consumption_perc",
  "CO2 emissions (metric tons per capita)": "co2_per_capita",
  "Renewable electricity output (% of total)": "renewable_electricity_perc",
  "Access to clean fuels (% of population)": "access_to_clean_fuels_perc",
  "PM2.5 air pollution": "pm25_air_pollution",
};

interface CountryData {
  [key: string]: number | null;
}

interface ParsedData {
  [country: string]: CountryData;
}

interface StatCardProps {
  title: string;
  value: number | null;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
  <Card className="hover:shadow-lg transition-shadow duration-300">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value !== null ? value.toFixed(2) : 'N/A'}</div>
    </CardContent>
  </Card>
);

const WorldEnvironmentalDashboard: React.FC = () => {
  const [data, setData] = useState<ParsedData>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    detectCountry();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(DATA_URL);
      const csvData = await response.text();
      
      Papa.parse<Record<string, string>>(csvData, {
        header: true,
        complete: (results) => {
          const parsedData: ParsedData = {};
          const countrySet = new Set<string>();

          results.data.forEach((row) => {
            if (row.year === '2021' || row.year === '2020') { // Use most recent data
              parsedData[row.country] = {
                forest_area_perc: parseFloat(row.forest_area_perc) || null,
                renewables_consumption_perc: parseFloat(row.renewables_consumption_perc) || null,
                co2_per_capita: parseFloat(row.co2_per_capita) || null,
                renewable_electricity_perc: parseFloat(row.renewable_electricity_perc) || null,
                access_to_clean_fuels_perc: parseFloat(row.access_to_clean_fuels_perc) || null,
                pm25_air_pollution: parseFloat(row.pm_2_5_air_pollution) || null,
              };
              countrySet.add(row.country);
            }
          });

          setData(parsedData);
          setCountries(Array.from(countrySet).sort());
          setLoading(false);
        },
        error: (error: Error) => {
          console.error('Error parsing CSV:', error);
          setError('Failed to parse data. Please try again later.');
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data. Please try again later.');
      setLoading(false);
    }
  };

  const detectCountry = () => {
    fetch('https://ipapi.co/json/')
      .then(response => response.json())
      .then(data => {
        const detectedCountry = data.country_name;
        if (countries.includes(detectedCountry)) {
          setSelectedCountry(detectedCountry);
        } else {
          setSelectedCountry(countries[0]); // Fallback to first country if detected country is not in the list
        }
      })
      .catch(error => {
        console.error('Error detecting country:', error);
        setSelectedCountry(countries[0]); // Fallback to first country on error
      });
  };

  const iconMap: Record<string, React.ReactElement> = {
    "Forest area (% of land area)": <Trees className="h-6 w-6 text-green-700" />,
    "Renewable energy consumption (% of total)": <Sun className="h-6 w-6 text-yellow-400" />,
    "CO2 emissions (metric tons per capita)": <Factory className="h-6 w-6 text-gray-500" />,
    "Renewable electricity output (% of total)": <Sun className="h-6 w-6 text-yellow-500" />,
    "Access to clean fuels (% of population)": <Leaf className="h-6 w-6 text-green-600" />,
    "PM2.5 air pollution": <Wind className="h-6 w-6 text-blue-300" />,
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div id="environmental-dashboard" className="p-6 bg-gradient-to-br from-blue-50 to-green-50 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">Environmental Data for {selectedCountry}</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Object.entries(indicators).map(([title, key]) => (
          <StatCard
            key={key}
            title={title}
            value={data[selectedCountry]?.[key] || null}
            icon={iconMap[title] || <AlertTriangle className="h-6 w-6 text-yellow-500" />}
          />
        ))}
      </div>

      <div className="w-full">
        <Card>
          <CardHeader>
            <CardTitle>Select a Country</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </CardContent>
        </Card>
      </div>
      
      {Object.values(data[selectedCountry] || {}).every(value => value === null) && (
        <div className="text-center text-yellow-600 bg-yellow-100 p-4 rounded-md mt-6">
          <AlertTriangle className="inline-block mr-2" />
          No data available for {selectedCountry}. This could be due to lack of reporting or data collection issues.
        </div>
      )}
    </div>
  );
};

export default WorldEnvironmentalDashboard;