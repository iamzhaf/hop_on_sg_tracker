import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, MapPin, RefreshCw, Navigation, ArrowLeft, Bus, AlertCircle, Loader, Wifi } from 'lucide-react';
import { fetchBusArrivals, isApiKeyConfigured } from '../services/ltaApiService';

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
  const { busStopCode, description } = useParams();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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

  // Load bus arrivals
  const loadBusArrivals = async () => {
    if (!isApiKeyConfigured()) {
      setError('LTA API key not configured. Please add REACT_APP_LTA_API_KEY to your .env file.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await fetchBusArrivals(busStopCode);
      
      if (data.buses.length === 0) {
        setError('No buses currently serving this stop.');
      } else {
        setBuses(data.buses);
        setLastUpdated(new Date());
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading bus arrivals:', err);
      setError(err.message || 'Failed to load bus arrival data. Please try again.');
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadBusArrivals();
  }, [busStopCode]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !error) {
        loadBusArrivals();
      }
    }, 30000); // 30 seconds

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

  const getLoadColor = (load) => {
    switch(load) {
      case 'low': return 'bg-emerald-500';
      case 'medium': return 'bg-amber-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLoadText = (load) => {
    switch(load) {
      case 'low': return 'Seats Available';
      case 'medium': return 'Standing Available';
      case 'high': return 'Limited Standing';
      default: return 'Unknown';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-500 via-green-500 to-green-500 overflow-y-auto">
        <div className="min-h-screen p-4 pb-8 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bus className="w-10 h-10 text-green-600 animate-bounce" />
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-2">Loading bus arrivals...</p>
            <p className="text-gray-600 mb-4">Fetching real-time data from LTA</p>
            <Loader className="w-8 h-8 text-green-600 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && buses.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-500 via-green-500 to-green-500 overflow-y-auto">
        <div className="min-h-screen p-4 pb-8 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <p className="text-2xl font-semibold text-gray-900 mb-2">Unable to Load Data</p>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <div className="space-y-3">
              <button
                onClick={handleRefresh}
                className="w-full px-6 py-3 bg-gradient-to-br from-green-500 to-green-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-600 transition-all shadow-lg"
              >
                Try Again
              </button>
              <button
                onClick={handleBackToList}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Back to Bus Stops
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bus Route View
  if (selectedBus) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-300 via-green-300 to-green-100 overflow-y-auto">
        <div className="min-h-screen p-4 pb-8">
          <div className="max-w-2xl mx-auto">
            
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
              <button
                onClick={() => setSelectedBus(null)}
                className="flex items-center gap-2 text-green-600 hover:text-green-800 mb-4 font-semibold transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Arrivals
              </button>

              <div className="flex items-center gap-4 mb-4">
                <div className="bg-gradient-to-br from-green-600 to-green-600 text-white w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-bold">{selectedBus.number}</span>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">{selectedBus.operator}</div>
                  <div className="text-xs text-green-600 flex items-center gap-1 mb-1 font-semibold uppercase tracking-wide">
                    <Navigation className="w-3 h-3" />
                    Route to
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-600 bg-clip-text text-transparent">
                    {selectedBus.destination}
                  </h2>
                  <div className="text-xs text-gray-600 flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full w-fit mt-2">
                    {selectedBus.type === 'Double Deck' ? (
                      <DoubleDeckBus className="w-4 h-4 text-gray-700" />
                    ) : (
                      <SingleDeckBus className="w-4 h-4 text-gray-700" />
                    )}
                    <span className="font-medium">{selectedBus.type}</span>
                    {selectedBus.feature === 'WAB' && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">♿ Accessible</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-50 text-black p-4 rounded-2xl">
                <div className="text-sm opacity-90 mb-1">Next bus arrives in</div>
                <div className="text-4xl font-bold">
                  {selectedBus.arrivals[0] === 0 ? 'Arriving' : selectedBus.arrivals[0] === null ? 'N/A' : `${selectedBus.arrivals[0]} min`}
                </div>
              </div>
            </div>

            {/* Route Timeline */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-600" />
                Bus Stops Along Route
              </h3>
              
              <div className="space-y-1">
                {selectedBus.route.map((stop, index) => (
                  <div key={index} className="relative">
                    {index < selectedBus.route.length - 1 && (
                      <div className={`absolute left-6 top-12 w-0.5 h-full ${
                        stop.status === 'current' ? 'bg-gradient-to-b from-green-50 to-gray-300' : 'bg-gray-300'
                      }`}></div>
                    )}
                    
                    <div className={`relative flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 ${
                      stop.status === 'current' 
                        ? 'bg-gradient-to-r from-green-50 to-green-50 shadow-md' 
                        : 'hover:bg-gray-50'
                    }`}>
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                        stop.status === 'current'
                          ? 'bg-gradient-to-br from-green-50 to-green-50 shadow-lg'
                          : 'bg-gray-200'
                      }`}>
                        {stop.status === 'current' ? (
                          <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                        ) : (
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className={`font-bold ${
                              stop.status === 'current' ? 'text-green-900 text-lg' : 'text-gray-900'
                            }`}>
                              {stop.name}
                            </h4>
                            <p className="text-sm text-gray-500 mt-0.5">Stop {stop.code}</p>
                            {stop.status === 'current' && (
                              <span className="inline-block mt-2 px-3 py-1 bg-green-600 text-black text-xs font-semibold rounded-full">
                                Current Stop
                              </span>
                            )}
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            <div className={`text-sm font-semibold ${
                              stop.status === 'current' ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {stop.distance}
                            </div>
                            {stop.time > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                ~{stop.time} min
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard View
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-300 via-green-300 to-green-100 overflow-y-auto">
      <div className="min-h-screen p-4 pb-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-green-800 hover:text-green-800 mb-4 font-semibold transition-colors "
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Bus Stops
            </button>
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-black text-sm mb-2 font-medium text-green-800">
                  <MapPin className="w-4 h-4" />
                  <span>Bus Stop {busStopCode}</span>
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-br from-green-500 to-green-400 bg-clip-text text-transparent">
                  {busStopName}
                </h1>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-green-500 hover:from-green-600 hover:to-green-600 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105"
                aria-label="Refresh"
              >
                <RefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-green-50 px-4 py-2 rounded-xl">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-green-800">
                  {currentTime.toLocaleTimeString('en-SG', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </span>
              </div>

              {lastUpdated && (
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg">
                  <Wifi className="w-3 h-3 text-emerald-600" />
                  <span className="text-xs text-green-800 font-medium">
                    Live • Updated {Math.floor((Date.now() - lastUpdated) / 1000)}s ago
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bus List */}
          {buses.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl p-12 text-center border border-white/20">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bus className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 mb-2">No buses available</p>
              <p className="text-gray-600">There are currently no buses serving this stop.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {buses.map((bus, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedBus(bus)}
                  className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-white/20 transform hover:-translate-y-1 cursor-pointer active:scale-98"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-green-600 to-green-600 text-white w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg">
                          <span className="text-3xl font-bold">{bus.number}</span>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">{bus.operator}</div>
                          <div className="text-xs text-green-800 flex items-center gap-1 mb-1 font-semibold uppercase tracking-wide">
                            <Navigation className="w-3 h-3 text-green-800" />
                            To
                          </div>
                          <div className="text-xl font-bold text-green-800 mb-1">
                            {bus.destination}
                          </div>
                          <div className="text-xs text-gray-600 flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full w-fit">
                            {bus.type === 'Double Deck' ? (
                              <DoubleDeckBus className="w-4 h-4 text-gray-700" />
                            ) : (
                              <SingleDeckBus className="w-4 h-4 text-gray-700" />
                            )}
                            <span className="font-medium">{bus.type}</span>
                            {bus.feature === 'WAB' && (
                              <span className="ml-2">♿</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrival Times */}
                    <div className="flex items-center gap-3 mb-4">
                      {bus.arrivals.slice(0, 3).map((time, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 text-center py-4 rounded-2xl transition-all duration-300 ${
                            idx === 0
                              ? 'bg-gradient-to-br from-green-500 to-green-500 shadow-lg transform scale-105'
                              : 'bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200'
                          }`}
                        >
                          <div
                            className={`text-3xl font-bold ${
                              idx === 0 ? 'text-white' : 'text-gray-800'
                            }`}
                          >
                            {time === null ? '-' : time === 0 ? 'Arr' : time}
                          </div>
                          <div className={`text-xs mt-1 font-medium ${
                            idx === 0 ? 'text-white/90' : 'text-gray-500'
                          }`}>
                            {time === null ? 'N/A' : time === 0 ? 'Arriving' : 'min'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Load Indicator */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getLoadColor(bus.load)} shadow-lg animate-pulse`}></div>
                        <span className="text-sm font-semibold text-gray-700">{getLoadText(bus.load)}</span>
                      </div>
                      <div className="flex gap-1">
                        <div className={`w-2 h-6 rounded-full ${bus.load === 'high' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                        <div className={`w-2 h-6 rounded-full ${bus.load === 'medium' || bus.load === 'high' ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                        <div className={`w-2 h-6 rounded-full ${bus.load === 'low' || bus.load === 'medium' || bus.load === 'high' ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
                      <span>Tap to view route</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center bg-white/20 backdrop-blur-xl rounded-2xl p-4 border border-white/30">
            <p className="text-sm text-black font-semibold mb-2">
              Real-time data from LTA DataMall
            </p>
            <p className="text-xs text-black/80">
              ✨ Updates automatically every 30 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}