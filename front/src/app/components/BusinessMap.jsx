import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { useState } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBaFcA1aMshX-NaWsyT7T1CCpQqLiBWxZw'; // same key as backend

export function BusinessMap({ businesses, selectedBusiness, onBusinessSelect }) {
  const [hoveredBusiness, setHoveredBusiness] = useState(null);

  // Default center — falls back to NYC if no businesses
  const center = businesses.length > 0
    ? { lat: businesses[0].lat, lng: businesses[0].lng }
    : { lat: 40.7128, lng: -74.0060 };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={center}
        defaultZoom={14}
        mapId="local-business-map"
        style={{ width: '100%', height: '100%', borderRadius: '8px' }}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {businesses.map((business) => {
          if (!business.lat || !business.lng) return null;
          const isSelected = selectedBusiness?.id === business.id;

          return (
            <div key={business.id}>
              <AdvancedMarker
                position={{ lat: business.lat, lng: business.lng }}
                onClick={() => onBusinessSelect(business)}
                onMouseEnter={() => setHoveredBusiness(business)}
                onMouseLeave={() => setHoveredBusiness(null)}
              >
                <Pin
                  background={isSelected ? '#EF4444' : '#2563EB'}
                  borderColor={isSelected ? '#B91C1C' : '#1D4ED8'}
                  glyphColor="#ffffff"
                />
              </AdvancedMarker>

              {/* Tooltip on hover */}
              {hoveredBusiness?.id === business.id && (
                <InfoWindow
                  position={{ lat: business.lat, lng: business.lng }}
                  disableAutoPan
                >
                  <div style={{ padding: '4px 2px', minWidth: '120px' }}>
                    <p style={{ fontWeight: '600', fontSize: '13px', margin: 0 }}>{business.name}</p>
                    <p style={{ color: '#6B7280', fontSize: '11px', margin: '2px 0 0' }}>{business.category}</p>
                    {business.rating && (
                      <p style={{ color: '#D97706', fontSize: '11px', margin: '2px 0 0' }}>⭐ {business.rating}</p>
                    )}
                  </div>
                </InfoWindow>
              )}
            </div>
          );
        })}
      </Map>
    </APIProvider>
  );
}
