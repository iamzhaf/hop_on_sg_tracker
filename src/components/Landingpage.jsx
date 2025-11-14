import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Navigation, Bus, Locate, ChevronRight, Loader, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import '../App.css'

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('distance');
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [busStopsData, setBusStopsData] = useState([]);
  const [busStops, setBusStops] = useState([]);
  const [filteredStops, setFilteredStops] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const csvUrl = `${import.meta.env.BASE_URL}data/busstops.csv`;

  /**
   * Clean bus stop description for URL
   * Removes special characters and converts to URL-friendly format
   */
  const cleanBusDescription = (description) => {
    return description
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .toLowerCase();
  };

  /**
   * Haversine formula to calculate distance between two GPS coordinates
   */
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    
    const lat1_rad = toRadians(lat1);
    const lon1_rad = toRadians(lon1);
    const lat2_rad = toRadians(lat2);
    const lon2_rad = toRadians(lon2);
    
    const dlat = lat2_rad - lat1_rad;
    const dlon = lon2_rad - lon1_rad;
    
    const a = Math.sin(dlat/2) ** 2 + 
              Math.cos(lat1_rad) * Math.cos(lat2_rad) * Math.sin(dlon/2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    
    let distance = R * c;
    
    if (distance < 1) {
      distance = distance * 1000;
      return { value: distance, unit: 'm' };
    }
    
    return { value: distance, unit: 'km' };
  };

  /**
   * Format distance for display
   */
  const formatDistance = (distanceObj) => {
    if (!distanceObj) return 'N/A';
    
    if (distanceObj.unit === 'm') {
      return `${Math.round(distanceObj.value)}m`;
    } else {
      return `${distanceObj.value.toFixed(1)}km`;
    }
  };

  /**
   * Load bus stops data from CSV file
   */
  const loadBusStopsFromCSV = () => {
    setDataLoading(true);
    setDataError(null);

    fetch(csvUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          complete: (results) => {
            const stops = results.data.map(row => {
              return {
                code: row.BusStopCode || row.busStopCode,
                name: row.Description || row.description,
                road: row.RoadName || row.roadName,
                latitude: parseFloat(row.Latitude || row.latitude),
                longitude: parseFloat(row.Longitude || row.longitude)
              };
            }).filter(stop => {
              return stop.code && 
                     stop.name && 
                     !isNaN(stop.latitude) && 
                     !isNaN(stop.longitude);
            });

            if (stops.length === 0) {
              setDataError('No valid bus stops found in CSV.');
              setDataLoading(false);
              return;
            }

            setBusStopsData(stops);
            setDataLoading(false);
          },
          error: (error) => {
            setDataError(`CSV parsing error: ${error.message}`);
            setDataLoading(false);
          }
        });
      })
      .catch(error => {
        setDataError(`Failed to load bus stops: ${error.message}`);
        setDataLoading(false);
      });
  };

  /**
   * Calculate distances when user location and bus stops data are ready
   */
  useEffect(() => {
    if (!userLocation || busStopsData.length === 0) return;

    const stopsWithDistance = busStopsData.map(stop => {
      const distance = haversine(
        userLocation.latitude, 
        userLocation.longitude, 
        stop.latitude, 
        stop.longitude
      );
      
      return {
        ...stop,
        distance: distance,
        distanceValue: distance.unit === 'km' ? distance.value : distance.value / 1000
      };
    });

    const sorted = stopsWithDistance.sort((a, b) => a.distanceValue - b.distanceValue);
    
    setBusStops(sorted);
    setFilteredStops(sorted);
  }, [userLocation, busStopsData]);

  /**
   * Load CSV data on mount
   */
  useEffect(() => {
    loadBusStopsFromCSV();
  }, []);

  /**
   * Get user's location
   */
  useEffect(() => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationLoading(false);
        },
        (error) => {
          setLocationError('Unable to get your location. Using default location (Orchard Road).');
          
          setUserLocation({
            latitude: 1.3048,
            longitude: 103.8318
          });
          
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationError('Geolocation not supported.');
      
      setUserLocation({
        latitude: 1.3048,
        longitude: 103.8318
      });
      
      setLocationLoading(false);
    }
  }, []);

  /**
   * Filter and search bus stops
   */
  useEffect(() => {
    if (busStops.length === 0) return;

    let filtered = busStops;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(stop => 
        stop.name.toLowerCase().includes(query) ||
        stop.code.toLowerCase().includes(query) ||
        stop.road.toLowerCase().includes(query)
      );
    }

    if (sortBy === 'distance') {
      filtered = [...filtered].sort((a, b) => a.distanceValue - b.distanceValue);
    } else if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredStops(filtered);
  }, [searchQuery, busStops, sortBy]);

  const getDistanceColor = (distanceObj) => {
    if (!distanceObj) return 'text-gray-600 bg-gray-50 border-gray-200';
    
    const kmValue = distanceObj.unit === 'km' ? distanceObj.value : distanceObj.value / 1000;
    
    if (kmValue < 0.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (kmValue < 1.0) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  /**
   * Handle bus stop click - navigate to dashboard
   */
  const handleBusStopClick = (stop) => {
    const cleanDescription = cleanBusDescription(stop.name);
    navigate(`/dashboards/${stop.code}/${cleanDescription}`);
  };

  // Error state
  if (dataError) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-300 via-green-300 to-green-100 overflow-y-auto flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 mb-2">Data Loading Error</p>
          <p className="text-gray-600 mb-4 text-sm">{dataError}</p>
          <button
            onClick={loadBusStopsFromCSV}
            className="px-6 py-3 bg-gradient-to-br from-green-300 via-green-300 to-green-100 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (locationLoading || dataLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-300 via-green-300 to-green-100 overflow-y-auto flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-green-300 via-green-300 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {dataLoading ? (
              <Bus className="w-10 h-10 text-green-600 animate-bounce" />
            ) : (
              <Locate className="w-10 h-10 text-green-600 animate-pulse" />
            )}
          </div>
          <p className="text-2xl font-semibold text-gray-900 mb-2">
            {dataLoading ? 'Loading bus stops...' : 'Finding your location...'}
          </p>
          <div className="mt-6">
            <Loader className="w-8 h-8 text-green-600 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-300 via-green-300 to-green-100 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        
        {/* Hero Header */}
        <div className="text-center mb-8 pt-8">
          <div className="inline-block bg-white/20 backdrop-blur-xl rounded-full px-6 py-3 mb-6 border border-white/30">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-full p-2">
                <Bus className="w-6 h-6 text-green-500" />
              </div>
              <span className="font-bold text-2xl text-black">Go green and hop on</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-4 drop-shadow-lg">
            Find Your Bus Stop
          </h1>
          <p className="text-black/90 text-lg md:text-xl max-w-2xl mx-auto">
            Get your bus arrivals at your fingertips.
          </p>

          {locationError && (
            <div className="mt-4 bg-amber-500/20 backdrop-blur-xl border border-amber-300/50 rounded-2xl px-4 py-2 inline-block">
              <p className="text-sm text-black font-medium">{locationError}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="bg-white/20 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/30">
              <div className="text-3xl font-bold text-black">{busStops.length}</div>
              <div className="text-sm text-black/80">Bus Stops</div>
            </div>
            <div className="bg-white/20 backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/30">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <div className="text-3xl font-bold text-black">Live</div>
              </div>
              <div className="text-sm text-black/80">Real-Time</div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by stop name, code, or road..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-gray-900 font-medium placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortBy('distance')}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  sortBy === 'distance'
                    ? 'bg-gradient-to-br from-green-400 to-green-500 text-black shadow-lg border-4 border-green-600'
                    : 'bg-gradient-to-br from-green-400 to-green-500 text-black shadow-lg border-4 border-green-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  <span>Nearest</span>
                </div>
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105 ${
                  sortBy === 'name'
                    ? 'bg-gradient-to-br from-green-400 to-green-500 text-black shadow-lg border-4 border-green-600'
                    : 'bg-gradient-to-br from-green-400 to-green-500 text-black shadow-lg border-4 border-green-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Name</span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-green-50 px-4 py-2 rounded-xl border border-green-200">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-900 font-semibold">
                {filteredStops.length} {filteredStops.length === 1 ? 'stop' : 'stops'} found
              </span>
            </div>
          </div>
        </div>

        {/* Bus Stops List */}
        <div className="space-y-4">
          {filteredStops.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl p-12 text-center border border-white/20">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 mb-2">No bus stops found</p>
              <p className="text-gray-600 mb-4">Try adjusting your search query</p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredStops.slice(0, 20).map((stop) => (
              <div
                key={stop.code}
                onClick={() => handleBusStopClick(stop)}
                className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-white/20 cursor-pointer transform hover:-translate-y-1 hover:scale-[1.02] active:scale-98"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <div className="bg-gradient-to-br from-green-600 to-green-600 text-white px-4 py-1.5 rounded-lg shadow-md">
                          <span className="text-sm font-bold">{stop.code}</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm border-2 ${getDistanceColor(stop.distance)}`}>
                          <div className="flex items-center gap-1.5">
                            <Navigation className="w-3.5 h-3.5" />
                            {formatDistance(stop.distance)}
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                        {stop.name}
                      </h3>
                      
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {stop.road}
                      </p>
                    </div>

                    <div className="flex-shrink-0 ml-4">
                      <div className="bg-gradient-to-br from-green-100 to-green-100 w-12 h-12 rounded-full flex items-center justify-center">
                        <ChevronRight className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 space-y-4">
          {userLocation && (
            <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-4 border border-white/30 text-center">
              <div className="flex items-center justify-center gap-2 text-white flex-wrap">
                <Locate className="w-5 h-5 text-emerald-300" />
                <span className="font-medium text-sm text-black">
                  Distances calculated from your location ({userLocation.latitude.toFixed(4)}°, {userLocation.longitude.toFixed(4)}°)
                </span>
              </div>
            </div>
          )}

          <div className="text-center space-y-2 mb-10">
            <p className="text-black/90 text-sm font-medium">
              Powered by LTA DataMall • Real-time bus data
            </p>
            <p className="text-black/70 text-xs">
              © 2025 Hop-On SG. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}