import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = import.meta.env.VITE_BACKEND_API_URL;

// Fictitious route + bus locations used as fallback
const buildMockRoute = (service) => {
  const baseLat = parseFloat(service.Latitude) || 1.3521;
  const baseLng = parseFloat(service.Longitude) || 103.8198;

  const coords = [
    [baseLat, baseLng],
    [baseLat + 0.002, baseLng + 0.001],
    [baseLat + 0.004, baseLng - 0.0005],
    [baseLat + 0.006, baseLng + 0.0015]
  ];

  const buses = [
    { id: 'bus-1', lat: baseLat + 0.0025, lng: baseLng + 0.0005 },
    { id: 'bus-2', lat: baseLat + 0.0045, lng: baseLng + 0.001 }
  ];

  return { coords, buses, center: [baseLat + 0.003, baseLng + 0.0005] };
};

export default function RouteMap({ service, direction, onBack, userLocation }) {
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [busStopCoords, setBusStopCoords] = useState([]);

  console.log("User Location",userLocation)
  console.log("Bus Service",service)

  const { coords: mockCoords, buses, center: mockCenter } = useMemo(
    () => buildMockRoute(service),
    [service]
  );

  const getBusStopIcon = useMemo(() => {
    return (variant) => {
      let background = '#10b981'; // default upcoming stop (emerald)

      if (variant === 'past') {
        background = '#94a3b8'; // slate for stops already passed
      } else if (variant === 'current') {
        background = '#ef4444'; // red for current stop
      } else if (variant === 'start') {
        background = '#059669'; // darker emerald for start
      } else if (variant === 'end') {
        background = '#059669'; // darker emerald for end
      }

      return L.divIcon({
        html:
          `<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:10px;background:${background};color:white;font-size:11px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.15);border:2px solid white;">B</div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
    };
  }, []);

  const userLocationIcon = useMemo(
    () =>
      L.divIcon({
        html:
          '<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:10px;background:#0ea5e9;color:white;font-size:14px;font-weight:700;box-shadow:0 2px 8px rgba(14,165,233,0.4);border:3px solid white;">●</div>',
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      }),
    []
  );

    const BusLocationIcon = useMemo(
      () =>
        L.divIcon({
          html: `
            <div style="
              display:flex;
              align-items:center;
              justify-content:center;
              width:44px;
              height:44px;
              border-radius:22px;
              background:#2563eb;
              border:3px solid white;
              box-shadow:0 2px 8px rgba(0,0,0,0.2);
            ">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="26" height="26" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
              >
                <path d="M19 17h2l-1-5V6a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v6l-1 5h2"/>
                <path d="M7 17v2a2 2 0 1 0 4 0v-2"/>
                <path d="M13 17v2a2 2 0 1 0 4 0v-2"/>
                <path d="M5 12h14"/>
              </svg>
            </div>
          `,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      []
    );


  useEffect(() => {
    if (!API_URL) return;
    if (!service || !service.ServiceNo) return;

    const fetchRoute = async () => {
      try {
        setRouteError(null);

        const response = await fetch(`${API_URL}/api/fetch_all_services_routes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ serviceNo: service.ServiceNo, direction: service.Direction })
        });

        const data = await response.json();

        if (!Array.isArray(data)) {
          setRouteCoords(null);
          return;
        }

        const matched = data.find((item) => {
          if (!item.ServiceNo) return false;
          const sameService = String(item.ServiceNo) === String(service.ServiceNo);
          if (!direction) return sameService;
          return (
            sameService &&
            String(item.Direction) === String(direction)
          );
        });

        if (!matched || !matched.Coordinates) {
          setRouteCoords(null);
          setBusStopCoords([]);
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(matched.Coordinates);
        } catch (err) {
          console.error('Failed to parse route Coordinates JSON:', err);
          setRouteCoords(null);
          return;
        }

        if (!Array.isArray(parsed) || parsed.length === 0) {
          setRouteCoords(null);
          setBusStopCoords([]);
          return;
        }

        setRouteCoords(parsed);

        if (Array.isArray(matched.BusStopCoordinates)) {
          const stops = matched.BusStopCoordinates
            .map((pair) => {
              if (!Array.isArray(pair) || pair.length < 2) return null;
              const lat = parseFloat(pair[0]);
              const lng = parseFloat(pair[1]);
              if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
              return [lat, lng];
            })
            .filter(Boolean);

          setBusStopCoords(stops);
        } else {
          setBusStopCoords([]);
        }
      } catch (error) {
        console.error('Error fetching service route:', error);
        setRouteError(error.message || 'Failed to load service route. Showing approximate route.');
        setRouteCoords(null);
      }
    };

    fetchRoute();
  }, [service, direction]);

  const hasRoute = Array.isArray(routeCoords) && routeCoords.length > 0;
  const polylineCoords = hasRoute ? routeCoords : mockCoords;
  const mapCenter = (typeof userLocation === "object" && userLocation !== null)
    ? [userLocation.latitude,userLocation.longitude]
    : mockCenter;

  const currentStopIndex = useMemo(() => {
    if (!service || !busStopCoords.length) return null;
    const lat = parseFloat(service.Latitude);
    const lng = parseFloat(service.Longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    let bestIndex = null;
    let bestDist = Infinity;
    busStopCoords.forEach((coord, index) => {
      if (!Array.isArray(coord) || coord.length < 2) return;
      const dLat = coord[0] - lat;
      const dLng = coord[1] - lng;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < bestDist) {
        bestDist = distSq;
        bestIndex = index;
      }
    });

    return bestIndex;
  }, [service, busStopCoords]);

  const formatArrival = (t) => {
  if (t === 0) return "Arr";
  if (t === 1) return "1 min";
  return `${t} mins`;
};

  return (
    <div className="fixed inset-0 z-40">
      <MapContainer
        center={mapCenter}
        zoom={15}
        style={{ height: '100%', width: '100%', filter: 'saturate(1.05) contrast(1.02)' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        />
        <Polyline
          positions={polylineCoords}
          pathOptions={{ color: '#10b981', weight: 4, opacity: 0.9 }}
        />
        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userLocationIcon}
          >
            <Tooltip permanent direction="bottom" offset={[0, 12]}>
              <span className="text-xs font-medium">You are here</span>
            </Tooltip>
          </Marker>
        )}
        {Array.isArray(service.location) &&
              <Marker
                position={[service.location[0][0], service.location[0][1]]}
                icon={BusLocationIcon}
              >
                <Tooltip permanent direction="bottom" offset={[0, 12]}>
                  <span className="text-xs font-medium">Arriving in {formatArrival(service.arrivals[0])}</span>
                </Tooltip>
              </Marker>
        }
        {busStopCoords.map((coord, index) => {
          const lastIndex = busStopCoords.length - 1;
          const isCurrent = currentStopIndex === index;

          let variant = 'default';

          if (currentStopIndex != null && index < currentStopIndex) {
            variant = 'past';
          } else {
            if (index === 0) variant = 'start';
            if (index === lastIndex) variant = 'end';
            if (isCurrent) variant = 'current';
          }

          return (
            <Marker
              key={`stop-${index}`}
              position={coord}
              icon={getBusStopIcon(variant)}
            >
              {index === 0 && (
                <Tooltip permanent direction="top" offset={[0, -12]}>
                  <span className="text-xs font-semibold">Start</span>
                </Tooltip>
              )}
              {index === lastIndex && (
                <Tooltip permanent direction="top" offset={[0, -12]}>
                  <span className="text-xs font-semibold">End</span>
                </Tooltip>
              )}
              {isCurrent && (
                <Tooltip direction="bottom" offset={[0, 12]}>
                  <span className="text-xs font-medium">{service.BusStopDesc} ({service.BusStopCode})</span>
                </Tooltip>
              )}
            </Marker>
          );
        })}
      </MapContainer>

      {/* Modern Top Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl z-50">
      
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 px-6 py-4">
            <div className="flex items-center items-stretch justify-between gap-6">
                {/* Back Button */}
                <button
                onClick={onBack}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors group"
                >
                <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-slate-600 flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </div>
                <span className="hidden sm:inline">Back</span>
                </button>

                {/* Service Info */}
                <div className="flex items-stretch gap-3 flex-1 min-w-0">
                <div className="bg-slate-900 text-white w-14 h-14 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <span className="text-xl font-bold">{service.ServiceNo}</span>
                </div>
                <div className="min-w-0 flex-1 flex items-center">
                    <span className="text-lg font-semibold text-slate-900 w-full break-words">
                    {service.BusStopDesc}
                    </span>
                </div>         
                </div>
            </div>

            <hr className="border-gray-200 mt-3 mb-2" />

            {/* Service Direction */}
            <div className="flex flex-col items-center gap-0">
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
        </div>
        
      </div>

      {/* Modern Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl z-50">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg px-5 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-700">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-0.5 rounded-full bg-emerald-500" />
              <span>Route</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow-sm" />
              <span>Past stops</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
              <span>Current stop</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-sky-500 border-2 border-white shadow-sm" />
              <span>Your location</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}