import { MapPin } from 'lucide-react';

export function BusinessMap({ businesses, selectedBusiness, onBusinessSelect }) {
  // Calculate bounds for the map
  const lats = businesses.map(b => b.lat);
  const lngs = businesses.map(b => b.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  // Convert lat/lng to x/y coordinates (0-100%)
  const getPosition = (lat, lng) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 80 + 10; // 10% padding
    const y = ((maxLat - lat) / (maxLat - minLat)) * 80 + 10; // Invert Y and add padding
    return { x, y };
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden shadow-lg bg-gradient-to-br from-blue-50 to-green-50 relative border border-gray-200">
      {/* Map Background */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full">
          {/* Grid lines */}
          {Array.from({ length: 10 }).map((_, i) => (
            <g key={i}>
              <line
                x1={`${i * 10}%`}
                y1="0%"
                x2={`${i * 10}%`}
                y2="100%"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-gray-400"
              />
              <line
                x1="0%"
                y1={`${i * 10}%`}
                x2="100%"
                y2={`${i * 10}%`}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-gray-400"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Business Markers */}
      {businesses.map((business) => {
        const { x, y } = getPosition(business.lat, business.lng);
        const isSelected = selectedBusiness?.id === business.id;
        
        return (
          <div
            key={business.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="relative group cursor-pointer hover:z-50" onClick={() => onBusinessSelect(business)}>
              {/* Marker Pin */}
              <div className="transition-all hover:scale-110 relative z-10">
                <MapPin
                  className={`w-8 h-8 transition-colors ${
                    isSelected
                      ? 'text-red-500 fill-red-500'
                      : 'text-blue-600 fill-blue-600 group-hover:text-red-500 group-hover:fill-red-500'
                  }`}
                />
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
                  <p className="font-semibold text-sm">{business.name}</p>
                  <p className="text-xs text-gray-600">{business.category}</p>
                </div>
                <div className="w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-md border border-gray-200 z-10">
        <p className="text-xs font-semibold text-gray-700 mb-2">Map Legend</p>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <MapPin className="w-4 h-4 text-blue-600 fill-blue-600" />
          <span>Business Location</span>
        </div>
      </div>

      {/* Map Title */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md border border-gray-200 z-10">
        <p className="text-sm font-semibold text-gray-800">Local Area Map</p>
        <p className="text-xs text-gray-600">Click markers for details</p>
      </div>
    </div>
  );
}