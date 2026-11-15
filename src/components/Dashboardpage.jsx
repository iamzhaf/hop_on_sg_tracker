import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, MapPin, RefreshCw, Navigation, ArrowLeft, Bus, AlertCircle, Loader, Wifi } from 'lucide-react';
import { fetchBusArrivals, isApiKeyConfigured } from '../services/ltaApiService';
import { SlidersHorizontal, MapPinned } from 'lucide-react'
import RouteMap from './RouteMap';
import BusLocationMap from './BusLocationMap'; 

// API URL
const API_URL = import.meta.env.VITE_BACKEND_API_URL;


// Single Deck Bus Icon
const SingleDeckBus = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 7c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V7z"/>
    <rect x="5" y="8" width="4" height="4" rx="0.5" fill="white" opacity="0.3"/>
    <rect x="10" y="8" width="4" height="4" rx="0.5" fill="white" opacity="0.3"/>
    <rect x="15" y="8" width="4" height="4" rx="0.5" fill="white" opacity="0.3"/>
    <circle cx="7" cy="18" r="1.5"/>
    <circle cx="17" cy="18" r="1.5"/>
  </svg>
);

// Double Deck Bus Icon
const DoubleDeckBus = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 3c0-0.5.4-1 1-1h14c.6 0 1 .5 1 1v5H4V3z"/>
    <rect x="5" y="3.5" width="3" height="2.5" rx="0.3" fill="white" opacity="0.3"/>
    <rect x="9" y="3.5" width="3" height="2.5" rx="0.3" fill="white" opacity="0.3"/>
    <rect x="13" y="3.5" width="3" height="2.5" rx="0.3" fill="white" opacity="0.3"/>
    <rect x="17" y="3.5" width="2" height="2.5" rx="0.3" fill="white" opacity="0.3"/>
    <path d="M4 8c0-0.5.4-1 1-1h14c.6 0 1 .5 1 1v7c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V8z"/>
    <rect x="5" y="9" width="4" height="4" rx="0.5" fill="white" opacity="0.3"/>
    <rect x="10" y="9" width="4" height="4" rx="0.5" fill="white" opacity="0.3"/>
    <rect x="15" y="9" width="4" height="4" rx="0.5" fill="white" opacity="0.3"/>
    <circle cx="7" cy="18.5" r="1.5"/>
    <circle cx="17" cy="18.5" r="1.5"/>
  </svg>
);

export default function DashboardPage() {
  const { busStopCode, description,lat,long } = useParams();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedService,setSelectedService] = useState(null)
  const [selectedDirection,setSelectedDirection] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [allServicesLocation,SetAllServicesLocation] = useState(null);
  const [showSupportBanner, setShowSupportBanner] = useState(() => {
    return localStorage.getItem('hideSupportBanner') !== 'true';
  });

  const handleDismissSupport = (e) => {
    e.stopPropagation();
    setShowSupportBanner(false);
    localStorage.setItem('hideSupportBanner', 'true');
  };
    
 // Function for handling the selected bus service for bus location viewing in its route map
 const handleServiceClick = (service) => {
    setSelectedService({ServiceNo:service.number,Direction:service.route_direction,location:service.location,arrivals:service.arrivals,Dest_Desc:service.destination});
    setSelectedDirection(service.route_direction);
  };

 // Function for viweing location for all bus services in map
  const hadndleAllServices = (buses) => {

    const services = buses.map(service => service.number)
    const locations = buses.map(service => service.location[0])
    const arrivals = buses.map(service => service.arrivals[0])

    SetAllServicesLocation({serviceno: services, location: locations, arrivals: arrivals})
  }

  // Format description for display
  const busStopName = description
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadBusArrivals = async (options = { background: false }) => {
      const { background } = options;

      try {
        if (!background) {
          setLoading(true);       // only show loader for initial / manual load
        }

        const response = await fetch(`${API_URL}/api/fetch_bus_arrivals`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ busStopCode })
        });

        const data = await response.json();

        if (data.buses.length === 0) {
          setError('No buses currently serving this stop.');
        } else {
          setBuses(data.buses);
          setLastUpdated(new Date());
          setError(null);
        }

      } catch (error) {
        console.error('Error fetching bus arrivals:', error);
        setError(error.message || 'Failed to load bus arrival data. Please try again.');
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
};


  // Load user location 
  const getLocation = () => {
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      () => {
        setLocationError(
          'Unable to get your location. Using default location (Orchard Road).'
        );
        setUserLocation({
          latitude: 1.3048,
          longitude: 103.8318,
        });
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Initial load
  useEffect(() => {
    loadBusArrivals({backgroud: false});
    getLocation();
  }, [busStopCode]);



  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !error) {
        loadBusArrivals({background: true});
        getLocation();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [loading, error, busStopCode]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBusArrivals();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleBackToList = () => {
    navigate('/');
  };

  // Operator code -> readable name (falls back to whatever the API sent)
  const getOperatorName = (op) => {
    const names = { SBST: 'SBS Transit', SMRT: 'SMRT', TTS: 'Tower Transit', GAS: 'Go-Ahead' };
    return names[op] || op;
  };

  // Neutral, distinct colours per operator so cards are easy to tell apart
  const getOperatorStyle = (op) => {
    const styles = {
      SBST: 'bg-violet-50 text-violet-700 border-violet-200',
      SMRT: 'bg-rose-50 text-rose-700 border-rose-200',
      TTS: 'bg-teal-50 text-teal-700 border-teal-200',
      GAS: 'bg-orange-50 text-orange-700 border-orange-200',
    };
    return styles[op] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  // Service category inferred from the service number (only unambiguous patterns)
  const getServiceCategory = (number) => {
    const n = String(number || '');
    if (/e$/.test(n)) return 'Express';
    if (/^NR/i.test(n) || /N$/.test(n)) return 'Night';
    return null;
  };

  const getLoadColor = (load) => {
    switch(load) {
      case 'low': return 'bg-emerald-500';
      case 'medium': return 'bg-amber-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const getLoadText = (load) => {
    switch(load) {
      case 'low': return 'Seats Available';
      case 'medium': return 'No Seats';
      case 'high': return 'Limited Standing';
      default: return 'Unknown';
    }
  };

  // Loading state
  if (loading && buses.length===0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader className="w-8 h-8 text-slate-600 animate-spin" />
          </div>
          <p className="text-lg font-medium text-slate-900 mb-1">Loading bus arrivals</p>
          <p className="text-sm text-slate-500">Fetching real-time data</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && buses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center max-w-md w-full mx-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Unable to Load Data</h2>
          <p className="text-slate-600 text-sm mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="w-full px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleBackToList}
              className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              Back to Bus Stops
            </button>
          </div>
        </div>
      </div>
    );
  }


  if (selectedService) {
      return (
        <RouteMap
          service={selectedService}
          direction={selectedDirection}
          userLocation={userLocation}
          onBack={() => setSelectedService(null)}
        />
      );
    }

  if (allServicesLocation) {
      return (
        <BusLocationMap
          services={allServicesLocation}
          userLocation={userLocation}
          stoplocation={{latitude:lat,longitude:long}}
          busstopdetails={{busStopCode:busStopCode,description:description}}
          onBack={() => SetAllServicesLocation(null)}
        />
      );
    }

  // Bus Route View
  if (selectedBus) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4">
            <button
              onClick={() => setSelectedBus(null)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-sm sm:text-base">Back to Arrivals</span>
            </button>

            <div className="flex items-start gap-3 sm:gap-4 mb-4">
              <div className="bg-slate-900 text-white w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-lg sm:text-2xl font-bold">{selectedBus.number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 mb-0.5">{selectedBus.operator}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1 mb-0.5 font-medium uppercase tracking-wide">
                  <Navigation className="w-3 h-3" />
                  To
                </div>
                <h2 className="text-base sm:text-xl font-semibold text-slate-900 break-words leading-tight">
                  {selectedBus.destination}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="text-xs text-slate-600 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                    {selectedBus.type[0] === 'Double Deck' ? (
                      <DoubleDeckBus className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <SingleDeckBus className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span className="font-medium">{selectedBus.type}</span>
                  </div>
                  {selectedBus.feature === 'WAB' && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">♿</span>
                  )}
                </div>
              </div>
            </div>

            {/* Next Arrival */}
            <div className="bg-slate-50 p-4 rounded-xl">

              <div className="text-sm text-slate-500 mb-1">
                {selectedBus.arrivals[0] === 0 ? 'Bus is' : selectedBus.arrivals[0] !== null ? `Next arrival in` : 'N/A'}
              </div>
              <div className="text-2xl sm:text-4xl font-bold text-slate-900">
                {selectedBus.arrivals[0] === 0 ? 'Arriving' : selectedBus.arrivals[0] === null ? 'N/A' : selectedBus.arrivals[0] > 0 ? `${selectedBus.arrivals[0]} mins` : `${selectedBus.arrivals[0]} min`}
              </div>

            </div>

          </div>

          <div className="p-4 rounded-xl mb-5">
            <button
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-900 text-xs 
                              sm:text-sm font-medium text-slate-700 
                              hover:bg-slate-50 transition-all"
              onClick={() => handleServiceClick(selectedBus)}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>See Bus Location and Route Map</span>
              </div>
            </button>
            {/* <p>
              {JSON.stringify(userLocation)}
            </p> */}
          </div>


          {/* Route Timeline - Mobile Optimized Left-Aligned */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 sm:mb-6 flex items-center gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              Bus Route
            </h3>
            
            <div className="relative">
              {/* Main vertical line */}
              <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-slate-200"></div>

              <div className="space-y-0">
                {selectedBus.route.map((stop, index) => {
                  const isFirst = index === 0;
                  const isLast = index === selectedBus.route.length - 1;
                  const isCurrent = stop.status === 'current';
                  
                  return (
                    <div key={index} className="relative flex items-start gap-3 sm:gap-4 py-2 sm:py-3">
                      {/* Station marker */}
                      <div className="relative z-10 flex-shrink-0">
                        {(isFirst || isLast) ? (
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[3px] ${
                            isCurrent 
                              ? 'bg-emerald-500 border-emerald-500' 
                              : isFirst
                                ? 'bg-green-500 border-green-500'
                                : 'bg-red-500 border-red-500'
                          } flex items-center justify-center shadow-sm`}>
                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                          </div>
                        ) : (
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-[3px] ${
                            isCurrent 
                              ? 'bg-emerald-500 border-emerald-500' 
                              : 'bg-white border-slate-300'
                          } flex items-center justify-center`}>
                            {isCurrent && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                            {!isCurrent && <div className="w-2 h-2 bg-slate-300 rounded-full"></div>}
                          </div>
                        )}
                      </div>

                      {/* Station info */}
                      <div className="flex-1 min-w-0 pt-1.5 sm:pt-2">
                        <div className={`font-semibold text-sm sm:text-base leading-tight ${
                          isCurrent ? 'text-emerald-700' : 
                          isFirst ? 'text-green-700' :
                          isLast ? 'text-red-700' :
                          'text-slate-900'
                        }`}>
                          {stop.name}
                        </div>
                        {stop.sub_name && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {stop.sub_name}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                              📍 Current
                            </span>
                          )}
                          {isFirst && !isCurrent && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Start
                            </span>
                          )}
                          {isLast && !isCurrent && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              End
                            </span>
                          )}
                          <span className="text-xs text-slate-500">{stop.distance}</span>
                          {stop.time > 0 && (
                            <span className="text-xs text-slate-400">~{stop.time} min</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        
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

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 font-medium transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-base">Back to Bus Stops</span>
          </button>
          
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm mb-1 font-medium">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Bus Stop {busStopCode}</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 break-words">
                {busStopName}
              </h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 sm:p-3 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50 flex-shrink-0"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              <span className="text-xs sm:text-sm font-medium text-slate-700">
                {currentTime.toLocaleTimeString('en-SG', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>

            {lastUpdated && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-50 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-emerald-700 font-medium">
                  Live
                </span>
              </div>
            )}
          </div>
        </div>


        {/* Bus List */}
        {buses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
            <div className="bg-slate-100 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bus className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No buses available</h3>
            <p className="text-slate-600 text-sm">There are currently no buses serving this stop.</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">

          <div className="p-4 rounded-xl mb-5">
            <button
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-900 text-xs 
                              sm:text-sm font-medium text-slate-700 
                              hover:bg-slate-50 transition-all"
              onClick={() => hadndleAllServices(buses)}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <MapPinned className="w-5 h-5 sm:w-7 sm:h-7" />
                <span>See Upcoming Bus Location</span>
              </div>
            </button>
            {/* <p>
              {JSON.stringify(userLocation)}
            </p> */}
          </div>

            {buses.map((bus, index) => (
              <div
                key={index}
                onClick={() => setSelectedBus(bus)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="p-4 sm:p-5">
                  {/* Bus Info Header */}
                  <div className="flex items-center justify-center gap-4 sm:gap-6 mb-3 sm:mb-4">
                    {/* Service number + service type (grouped) */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {bus.operator && (
                        <span className={`text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md border whitespace-nowrap ${getOperatorStyle(bus.operator)}`}>
                          {getOperatorName(bus.operator)}
                        </span>
                      )}
                      <div className="bg-slate-900 text-white w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shadow-sm">
                        <span className="text-lg sm:text-2xl font-bold">{bus.number}</span>
                      </div>
                      {getServiceCategory(bus.number) && (
                        <span className="text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-900 text-white whitespace-nowrap">
                          {getServiceCategory(bus.number)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Destination */}
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="bg-slate-100 rounded-full w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center flex-shrink-0">
                          <Navigation className="w-4 h-4 sm:w-5 sm:h-5 rotate-45 text-slate-900" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm text-slate-500 font-semibold leading-none">
                            This bus goes to
                          </div>
                          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 break-words leading-tight mt-1">
                            {bus.destination}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arrival Times */}
                  <div className="flex items-end gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                    {bus.arrivals.slice(0, 3).map((time, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <span className={`text-xs sm:text-sm font-bold text-center leading-tight max-w-full ${
                        { low: 'text-emerald-600', medium: 'text-amber-600', high: 'text-red-600' }[bus.load?.[idx]] || 'text-slate-400'
                      }`}>
                        {time !== null && bus.load?.[idx] ? getLoadText(bus.load[idx]) : ' '}
                      </span>
                      <div
                        className={`relative w-full text-center pt-7 sm:pt-8 pb-2.5 sm:pb-3 rounded-lg sm:rounded-xl transition-all ${getLoadColor(bus.load?.[idx])} ${
                          idx === 0 ? 'shadow-md' : 'opacity-90'
                        }`}
                      >
                        {time !== null && bus.type?.[idx] && (
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 sm:gap-1 bg-white rounded-md px-1 sm:px-1.5 py-0.5 shadow-sm">
                            {bus.type[idx] === 'Double Deck' ? (
                              <DoubleDeckBus className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800" />
                            ) : (
                              <SingleDeckBus className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800" />
                            )}
                            <span className="text-[10px] sm:text-xs font-bold text-slate-800 leading-none">
                              {bus.type[idx] === 'Double Deck' ? 'DD' : bus.type[idx] === 'Bendy' ? 'BD' : 'SD'}
                            </span>
                            {(Array.isArray(bus.feature) ? bus.feature[idx] : bus.feature) === 'WAB' && (
                              <span className="text-xs sm:text-sm text-blue-600 leading-none" title="Wheelchair accessible">♿</span>
                            )}
                          </div>
                        )}
                        <div className="text-xl sm:text-2xl font-bold text-white">
                          {time === null ? '-' : time === 0 ? 'Arr' : time}
                        </div>
                        <div className="text-xs mt-0.5 font-medium text-white/80">
                          {time === null ? 'N/A' : time === 0 ? 'Now' : 'min'}
                        </div>
                      </div>
                      </div>
                    ))}
                  </div>

                  {/* Tap Hint */}
                  <div className="mt-2.5 sm:mt-3 flex items-center justify-center gap-1.5 text-slate-400 text-xs sm:text-sm">
                    <span>Tap for route</span>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Real-time data from LTA DataMall
          </p>
          <p className="text-xs text-slate-400 mt-0.5 sm:mt-1">
            Auto-updates every 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}