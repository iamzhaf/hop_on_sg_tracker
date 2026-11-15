import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Navigation, Bus, Locate, ChevronRight, Loader, AlertCircle, SlidersHorizontal } from 'lucide-react';
import Papa from 'papaparse';
import '../App.css'
import NearbyServices from './NearbyServices';

const API_URL = import.meta.env.VITE_BACKEND_API_URL;

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
  const [showNearbyServices, setShowNearbyServices] = useState(false);
  const [showSupportBanner, setShowSupportBanner] = useState(() => {
    return localStorage.getItem('hideSupportBanner') !== 'true';
  });

  const handleDismissSupport = (e) => {
    e.stopPropagation();
    setShowSupportBanner(false);
    localStorage.setItem('hideSupportBanner', 'true');
  };

  const csvUrl = `${import.meta.env.BASE_URL}data/busstops.csv`;

  /**
   * Clean bus stop description for URL
   */
const cleanBusDescription = (description) => {
  return (description ?? '')
    .replace(/\s*\/\s*/g, '-')          // handles "A/B" and "A / B"
    .replace(/[^a-zA-Z0-9\s-]/g, '')    // keep letters, numbers, spaces, hyphen
    .trim()
    .replace(/\s+/g, '-')              // spaces -> hyphen
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .toLowerCase();
};

  /**
   * Haversine formula to calculate distance between two GPS coordinates
   */
  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
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
        distanceValue: distance.unit === 'km' ? distance.value : distance.value / 1000,
        estimated_walking_time: distance.unit === 'km' ? ((distance.value / 3.89) * 60 ) + 2 : ((distance.value / 1000 / 3.89) * 60 ) + 2
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
      filtered = [...filtered].filter(stop => stop.distanceValue <= 0.5);
    } else if (sortBy === 'name') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredStops(filtered);
  }, [searchQuery, busStops, sortBy]);

  const getDistanceColor = (distanceObj) => {
    if (!distanceObj) return 'text-gray-500 bg-gray-50';
    
    const kmValue = distanceObj.unit === 'km' ? distanceObj.value : distanceObj.value / 1000;
    
    if (kmValue < 0.5) return 'text-emerald-600 bg-emerald-50';
    if (kmValue < 1.0) return 'text-amber-600 bg-amber-50';
    return 'text-gray-600 bg-gray-50';
  };

  /**
   * Handle bus stop click - navigate to dashboard
   */
  const handleBusStopClick = (stop) => {
    const cleanDescription = cleanBusDescription(stop.name);
    navigate(`/dashboards/${stop.code}/${cleanDescription}/${stop.latitude}/${stop.longitude}`);
  };

  // Error state
  if (dataError) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-2">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center max-w-md w-full">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Unable to Load Data</h2>
          <p className="text-slate-600 text-sm mb-6">{dataError}</p>
          <button
            onClick={loadBusStopsFromCSV}
            className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-2">
        <div className="text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader className="w-7 h-7 sm:w-8 sm:h-8 text-slate-600 animate-spin" />
          </div>
          <p className="text-base sm:text-lg font-medium text-slate-900 mb-1">
            {dataLoading ? 'Loading bus stops' : 'Finding your location'}
          </p>
          <p className="text-sm text-slate-500">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="w-full px-1 sm:px-2 md:px-4 lg:max-w-4xl lg:mx-auto py-4 sm:py-6 md:py-12">
        
        {/* Support the Developer Banner */}
        {showSupportBanner && (
          <div className="mb-8 bg-gradient-to-r from-amber-500/[0.06] via-orange-500/[0.03] to-yellow-500/[0.06] hover:from-amber-500/[0.09] hover:via-orange-500/[0.06] hover:to-yellow-500/[0.09] backdrop-blur-md border border-amber-500/20 hover:border-amber-500/35 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow-[0_4px_25px_-5px_rgba(245,158,11,0.08)] hover:shadow-[0_10px_35px_-5px_rgba(245,158,11,0.15)] transition-all duration-300 relative overflow-hidden group">
            {/* Ambient decorative glowing backdrops */}
            <div className="absolute -left-16 -top-16 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-400/15 transition-all duration-500"></div>
            <div className="absolute -right-16 -bottom-16 w-36 h-36 bg-orange-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-400/15 transition-all duration-500"></div>
            
            {/* Left Content Area */}
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 min-w-0 z-10 w-full md:w-auto text-center sm:text-left">
              {/* Animated Icon Ring */}
              <div className="relative flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 shadow-md shadow-orange-500/20 transform group-hover:rotate-3 group-hover:scale-105 transition-all duration-300">
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 animate-ping opacity-25"></span>
                <span className="text-2xl z-10 leading-none">☕</span>
              </div>
              
              <div className="min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
                  <h4 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-900 via-amber-800 to-orange-950 text-base sm:text-lg leading-tight">
                    Keep Hop-on SG Free & Ad-Free
                  </h4>
                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider">
                    Developer Support
                  </span>
                </div>
                <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed max-w-xl">
                  If this tracker helps you catch your bus on time, consider buying a coffee! Every cup keeps servers running and supports independent work.
                </p>
              </div>
            </div>
            
            {/* Right Interactive Button Area */}
            <div className="flex items-center gap-3 z-10 w-full md:w-auto justify-between md:justify-end flex-shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-amber-500/10">
              <a
                href="https://buymeacoffee.com/mzhafran"
                target="_blank"
                rel="noopener noreferrer"
                className="relative group overflow-hidden px-6 py-3 bg-gradient-to-r from-[#FFDD00] via-[#FFEA33] to-[#FFDD00] bg-[length:200%_auto] hover:bg-right text-slate-900 font-extrabold rounded-2xl shadow-md hover:shadow-xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2.5 border border-yellow-400/50 w-full sm:w-auto"
              >
                <span className="text-xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">☕</span>
                <span className="text-xs sm:text-sm font-extrabold tracking-wider uppercase">Buy me a coffee</span>
              </a>
              
              <button
                onClick={handleDismissSupport}
                className="p-2 hover:bg-amber-500/10 rounded-xl text-amber-900/60 hover:text-amber-900 transition-colors border border-transparent hover:border-amber-500/10 self-center"
                aria-label="Dismiss support banner"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Hero Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 sm:gap-3 bg-white rounded-full px-4 sm:px-5 py-2 sm:py-2.5 mb-4 sm:mb-6 shadow-sm border border-slate-200">
            <div className="bg-emerald-500 rounded-full p-1 sm:p-1.5">
              <Bus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-xs sm:text-sm">Hop-on SG</span>
            <img src="/singapore.png" alt="SG" className="h-4 sm:h-5 w-auto" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
            Find Your Stop
          </h1>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto px-2">
            Real-time bus arrivals at your fingertips
          </p>

          {locationError && (
            <div className="mt-4 sm:mt-6 bg-amber-50 border border-amber-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 inline-block max-w-md mx-1">
              <p className="text-xs sm:text-sm text-amber-800">{locationError}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
            <div className="bg-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 shadow-sm border border-slate-200">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{busStops.length}</div>
              <div className="text-xs text-slate-500 font-medium">Bus Stops</div>
            </div>
            <div className="bg-white rounded-xl px-4 sm:px-6 py-3 sm:py-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900">Live</div>
              </div>
              <div className="text-xs text-slate-500 font-medium">Real-Time Data</div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          {/* Search Bar */}
          <div className="relative mb-3 sm:mb-4">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search by name, code, or road..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-slate-400 focus:bg-white transition-all text-sm sm:text-base text-slate-900 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setSortBy('distance')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  sortBy === 'distance'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Nearest</span>
                </div>
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  sortBy === 'name'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Name</span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="font-medium">{filteredStops.length} stops</span>
            </div>
          </div>
        </div>

        {/* Nearby Services Toggle */}
        <div className="flex justify-center mb-4 sm:mb-6">
          <button
            onClick={() => setShowNearbyServices(prev => !prev)}
            className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-900 text-xs 
                            sm:text-sm font-medium text-slate-700 
                            hover:bg-slate-50 transition-all"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{showNearbyServices ? 'Hide' : 'View'} nearby services</span>
            </div>
          </button>
        </div>

        {showNearbyServices && (
          <div className="mb-4 sm:mb-6">
            <NearbyServices userLocation={userLocation} busStops={filteredStops} />
          </div>
        )}

        {/* Bus Stops List */}
        <div className="space-y-2 sm:space-y-3">
          {filteredStops.length === 0 ? (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
              <div className="bg-slate-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No bus stops found</h3>
              <p className="text-slate-600 text-sm mb-4">Try adjusting your search or filters</p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-5 sm:px-6 py-2 sm:py-2.5 bg-slate-900 text-white rounded-lg sm:rounded-xl font-medium hover:bg-slate-800 transition-colors text-sm"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredStops.slice(0, 20).map((stop) => (
              <div
                key={stop.code}
                onClick={() => handleBusStopClick(stop)}
                className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
              >
                <div className="p-3 sm:p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                        <div className="bg-slate-900 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold">
                          {stop.code}
                        </div>
                        <div className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-xs font-semibold ${getDistanceColor(stop.distance)}`}>
                          <div className="flex items-center gap-1">
                            <Navigation className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {formatDistance(stop.distance)}
                          </div>
                        </div>
                        <div className="bg-slate-50 text-slate-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-xs font-medium">
                          ~{Math.ceil(stop.estimated_walking_time)} min walk
                        </div>
                      </div>
                      
                      {/* Stop Name */}
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 sm:mb-1.5 leading-snug">
                        {stop.name}
                      </h3>
                      
                      {/* Road Name */}
                      <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1 sm:gap-1.5">
                        <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                        {stop.road}
                      </p>
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex-shrink-0">
                      <div className="bg-slate-50 group-hover:bg-slate-900 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors">
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-8 sm:mt-12 space-y-3 sm:space-y-4">
          {userLocation && (
            <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-slate-600 flex-wrap text-xs sm:text-sm">
                <Locate className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                <span>
                  Location: {userLocation.latitude.toFixed(4)}°, {userLocation.longitude.toFixed(4)}°
                </span>
              </div>
            </div>
          )}

          <div className="text-center space-y-2 sm:space-y-3 pb-6 sm:pb-8">
            <p className="text-slate-600 text-xs sm:text-sm">
              Powered by LTA DataMall
            </p>
            <a
              href="https://buymeacoffee.com/mzhafran"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <img
                src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
                alt="Buy Me A Coffee"
                className="h-8 sm:h-10 mx-auto"
              />
            </a>
            <p className="text-slate-400 text-xs">
              © 2025 Hop-On SG. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}