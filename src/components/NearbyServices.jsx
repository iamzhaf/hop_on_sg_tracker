import React, { useState, useEffect } from 'react';
import { Navigation, ChevronRight, Loader, AlertCircle } from 'lucide-react';
import RouteMap from './RouteMap';

const API_URL = import.meta.env.VITE_BACKEND_API_URL;

export default function NearbyServices({ userLocation, busStops }) {
  const [nearbyServices, setNearbyServices] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDirection, setSelectedDirection] = useState(null);

  useEffect(() => {
    if (!API_URL) return;
    if (!userLocation || !busStops || busStops.length === 0) return;

    if (busStops.length === 0) return;

    const busStopCodes = busStops.map(stop => stop.code);
    const distance = busStops.map(stop => Math.round(stop.distanceValue * 1000));

    console.log(JSON.stringify({ busStopCodes, distance }));

    const fetchNearbyServices = async () => {
      try {
        setNearbyLoading(true);
        setNearbyError(null);

        console.log(`${API_URL}/api/fetch_all_nearby_bus_services`)
        const response = await fetch(`${API_URL}/api/fetch_all_nearby_bus_services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ busStopCodes, distance })
        });

        const data = await response.json();

        if (!Array.isArray(data)) {
          setNearbyServices([]);
          return;
        }

        const sorted = [...data].sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setNearbyServices(sorted);
      } catch (error) {
        console.error('Error fetching nearby services:', error);
        setNearbyError(error.message || 'Failed to load nearby services.');
      } finally {
        setNearbyLoading(false);
      }
    };

    fetchNearbyServices();
  }, [userLocation, busStops]);

  const handleServiceClick = (service) => {
    setSelectedService({ });
    setSelectedDirection(service.direction);
  };

  if (nearbyLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-center gap-3">
          <Loader className="w-5 h-5 text-slate-600 animate-spin" />
          <p className="text-sm font-medium text-slate-700">Loading nearby bus services...</p>
        </div>
      </div>
    );
  }

  if (nearbyError) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-4">
        <div className="flex items-center justify-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <p className="text-sm font-medium">{nearbyError}</p>
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

  if (!nearbyServices.length) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Nearby Bus Services</h2>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="font-medium">{nearbyServices.length} services</span>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {nearbyServices.map((service, index) => (
          <div
            key={`${service.ServiceNo}-${service.BusStopCode}-${index}`}
            onClick={() => handleServiceClick(service)}
            className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer group"
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 overflow-hidden">
                  {/* Service Number and Stop Code */}
                  <div className="flex items-start gap-2 mb-3 flex-wrap">
                    <div className="bg-slate-900 text-white px-3 sm:px-4 py-1.5 rounded-lg shadow-sm">
                      <span className="text-sm sm:text-base font-bold">{service.ServiceNo}</span>
                    </div>
                    <div className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg max-w-full">
                      <span className="text-xs font-medium break-words">
                        {service.BusStopDesc} ({service.BusStopCode})
                      </span>
                    </div>
                  </div>

                  {/* Route Description */}
                {/* Service Direction */}
                <div className="flex flex-col items-center mt-1 gap-0">
                <div className="text-center">
                    <span className="text-xs text-slate-400 uppercase tracking-wide">From</span>
                    <p className="text-sm text-slate-900 font-semibold">{service.Start_Desc}</p>
                </div>
                <span className="text-3xl text-slate-900">
                    {service.Start_Desc && service.Dest_Desc && service.Start_Desc === service.Dest_Desc
                        ? '↑↓'
                        : '↓'}
                </span>
                <div className="text-center">
                    <span className="text-xs text-slate-400 uppercase tracking-wide">To</span>
                    <p className="text-sm text-slate-900 font-semibold">{service.Dest_Desc}</p>
                </div>
                </div>

                  {/* Distance */}
                  <div className="flex items-center mt-3 gap-2 text-xs sm:text-sm text-slate-500">
                    <Navigation className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{service.distance}m away</span>
                  </div>
                </div>

                {/* Arrow Icon */}
                <div className="flex-shrink-0">
                  <div className="bg-slate-50 group-hover:bg-slate-900 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}