/**
 * LTA DataMall API Service (Vite Version)
 * Handles all API calls to Singapore's LTA DataMall
 */

// CORS Proxy for development (remove in production with proper backend)
const CORS_PROXY = 'https://corsproxy.io/?';
const LTA_BASE_URL = 'https://datamall2.mytransport.sg/ltaodataservice/v3';
const API_KEY = import.meta.env.VITE_LTA_API_KEY;

/**
 * Calculate minutes until arrival from ISO timestamp
 */
export const calculateMinutesUntilArrival = (estimatedArrival) => {
  if (!estimatedArrival) return null;
  
  const now = new Date();
  const arrivalTime = new Date(estimatedArrival);
  const diffMs = arrivalTime - now;
  const diffMinutes = Math.floor(diffMs / 60000);
  
  return diffMinutes >= 0 ? diffMinutes : 0;
};

/**
 * Map LTA load status to user-friendly text
 * SEA (Seats Available), SDA (Standing Available), LSD (Limited Standing)
 */
export const mapLoadStatus = (load) => {
  const loadMap = {
    'SEA': 'low',      // Seats Available
    'SDA': 'medium',   // Standing Available
    'LSD': 'high',     // Limited Standing
    '': 'unknown'
  };
  return loadMap[load] || 'unknown';
};

/**
 * Map LTA bus type to user-friendly format
 * SD (Single Deck), DD (Double Deck), BD (Bendy)
 */
export const mapBusType = (type) => {
  const typeMap = {
    'SD': 'Single Deck',
    'DD': 'Double Deck',
    'BD': 'Bendy',
    '': 'Unknown'
  };
  return typeMap[type] || 'Unknown';
};

/**
 * Fetch bus arrivals for a specific bus stop
 * @param {string} busStopCode - The bus stop code (e.g., "44411")
 * @returns {Promise<Object>} Bus arrival data
 */
export const fetchBusArrivals = async (busStopCode) => {
  if (!API_KEY) {
    throw new Error('LTA API Key not configured. Please set VITE_LTA_API_KEY in .env file');
  }

  const apiUrl = `${LTA_BASE_URL}/BusArrival?BusStopCode=${busStopCode}`;
  const url = `${CORS_PROXY}${encodeURIComponent(apiUrl)}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'AccountKey': API_KEY,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`LTA API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return parseBusArrivalData(data);
  } catch (error) {
    console.error('Error fetching bus arrivals:', error);
    throw error;
  }
};

/**
 * Parse LTA API response into our app format
 */
const parseBusArrivalData = (apiResponse) => {
  const { BusStopCode, Services } = apiResponse;

  const buses = Services.map(service => {
    const nextBuses = [service.NextBus, service.NextBus2, service.NextBus3];
    
    // Calculate arrival times in minutes
    const arrivals = nextBuses
      .map(bus => calculateMinutesUntilArrival(bus.EstimatedArrival))
      .filter(time => time !== null);

    // Get first bus details
    const firstBus = service.NextBus;
    
    return {
      number: service.ServiceNo,
      operator: service.Operator,
      destination: getDestinationName(firstBus.DestinationCode),
      arrivals: arrivals.length > 0 ? arrivals : [null, null, null],
      load: mapLoadStatus(firstBus.Load),
      type: mapBusType(firstBus.Type),
      feature: firstBus.Feature, // WAB (Wheelchair Accessible Bus)
      originCode: firstBus.OriginCode,
      destinationCode: firstBus.DestinationCode,
      monitored: firstBus.Monitored === 1,
      // Mock route data - in production, fetch from routes API
      route: generateMockRoute(BusStopCode, firstBus.DestinationCode)
    };
  }).filter(bus => bus.arrivals.some(time => time !== null)); // Filter out buses with no arrivals

  return {
    busStopCode: BusStopCode,
    buses: buses,
    timestamp: new Date().toISOString()
  };
};

/**
 * Get destination name from destination code
 * In production, this would fetch from a bus routes API or database
 */
const getDestinationName = (destinationCode) => {
  // This is a simplified mapping - in production, use actual route data
  const destinationMap = {
    '44009': 'Choa Chu Kang Int',
    '44531': 'Yew Tee MRT',
    '03211': 'Orchard',
    '01012': 'City Hall',
    // Add more mappings as needed
  };
  
  return destinationMap[destinationCode] || `Stop ${destinationCode}`;
};

/**
 * Generate mock route data
 * In production, fetch actual route from LTA Bus Routes API
 */
const generateMockRoute = (currentStopCode, destinationCode) => {
  return [
    {
      name: 'Current Stop',
      code: currentStopCode,
      status: 'current',
      distance: '0 km',
      time: 0
    },
    {
      name: 'Next Stop 1',
      code: 'XXXXX',
      status: 'upcoming',
      distance: '0.5 km',
      time: 3
    },
    {
      name: 'Next Stop 2',
      code: 'XXXXX',
      status: 'upcoming',
      distance: '1.2 km',
      time: 7
    },
    {
      name: 'Destination',
      code: destinationCode,
      status: 'upcoming',
      distance: '5.0 km',
      time: 20
    }
  ];
};

/**
 * Check if API key is configured
 */
export const isApiKeyConfigured = () => {
  return Boolean(API_KEY && API_KEY !== 'your_api_key_here');
};