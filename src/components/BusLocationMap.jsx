import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import {icon, divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from "react-leaflet-cluster"

// Fictitious route + bus locations used as fallback
const buildMockRoute = (services) => {
  const baseLat = parseFloat(services.Latitude) || 1.3521;
  const baseLng = parseFloat(services.Longitude) || 103.8198;

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

export default function BusLocationMap({ services, onBack, userLocation,stoplocation, busstopdetails }) {
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [busStopCoords, setBusStopCoords] = useState([]);


  console.log("User Location",userLocation)
  console.log("Bus Service",services.serviceno)

  const { coords: mockCoords, buses, center: mockCenter } = useMemo(
    () => buildMockRoute(services),
    [services]
  );

  const toTitleCase = (text = "") =>
  text
    .replace(/-/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");


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


 const BusStopIcon = useMemo(
    () =>
      L.divIcon({
        html:
          '<div style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50px;background:#AB1B00;color:white;font-size:14px;font-weight:700;box-shadow:0 4px 8px rgba(14,165,233,0.4);border:1px solid white;">●</div>',
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      }),
    []
  );


  const createCustomClusterIcon = (cluster) => {
    return new divIcon({
    html: `
                  <div style="
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    gap:4px;
                  ">
                    <!-- Circle -->
                    <div style="
                      position:relative;
                      width:54px;height:54px;border-radius:50px;
                      display:flex;align-items:center;justify-content:center;
                      background:#000000;
                      border:3px solid white;
                      box-shadow:0 2px 8px rgba(0,0,0,0.2);
                    ">
                      <span style="
                        position:absolute;
                        inset:0;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:white;
                        font-size:14px;
                        font-weight:800;
                        line-height:1;
                        text-shadow:0 1px 2px rgba(0,0,0,0.35);
                        pointer-events:none;
                      ">
                        ${String(cluster.getChildCount())} Buses
                      </span>
                    </div>
                  </div>`
    })
  } 


  const hasRoute = Array.isArray(routeCoords) && routeCoords.length > 0;
  const polylineCoords = hasRoute ? routeCoords : mockCoords;
  const mapCenter = (typeof stoplocation  === "object" && stoplocation !== null)
    ? [stoplocation.latitude,stoplocation.longitude]
    : mockCenter;


  const formatArrival = (t) => {
  if (t === 0) return "Arriving";
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


        {services.location.length > 0 && (
        
            <MarkerClusterGroup 
              chunkedLoading 
              iconCreateFunction={createCustomClusterIcon}
            > {

             services.location.map((location,index) => {
              
              const busNumber = services.serviceno[index];

              const arrivalLabel = formatArrival(services.arrivals[index])

              const busIcon = L.divIcon({
                html: `
                  <div style="
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    gap:4px;
                  ">
                    <!-- Circle -->
                    <div style="
                      position:relative;
                      width:44px;height:44px;border-radius:22px;
                      display:flex;align-items:center;justify-content:center;
                      background:#2563eb;
                      border:1px solid white;
                      box-shadow:0 2px 8px rgba(0,0,0,0.2);
                    ">
                      <span style="
                        position:absolute;
                        inset:0;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:white;
                        font-size:14px;
                        font-weight:800;
                        line-height:1;
                        text-shadow:0 1px 2px rgba(0,0,0,0.35);
                        pointer-events:none;
                      ">
                        ${String(busNumber)}
                      </span>
                    </div>

                    <!-- Text below -->
                    <div style="
                      padding:2px 6px;
                      border-radius:999px;
                      background:rgba(17,24,39,0.92);
                      color:white;
                      font-size:11px;
                      font-weight:700;
                      line-height:1.2;
                      white-space:nowrap;
                      box-shadow:0 2px 8px rgba(0,0,0,0.15);
                      pointer-events:none;
                    ">
                      ${String(arrivalLabel)}
                    </div>
                  </div>
                `,
                className: "",
                iconSize: [60, 70],     // overall bounding box (circle + label)
                iconAnchor: [30, 22],   // anchor at center of the circle (not bottom label)
              });



              return (  
                  <Marker
                    position={[location[0], location[1]]}
                    icon={busIcon}
                  >
                  </Marker>
              );
             })
            }
            </MarkerClusterGroup>

        )}
        
      {stoplocation && (
          <Marker
            position={[stoplocation.latitude, stoplocation.longitude]}
            icon={BusStopIcon}
          >
          </Marker>
        )}

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
              <div className="flex flex-col flex-1 min-w-0">
                <h2 className="busstop-title font-semibold">
                  {toTitleCase(busstopdetails?.description)}
                </h2>
                <p className="text-md text-slate-700">
                  {busstopdetails?.busStopCode}
                </p>
              </div>
            </div>
        </div>
        
      </div>

      {/* Modern Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-5xl z-50">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg px-5 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-700">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
              <span>Bus-stop Location</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}