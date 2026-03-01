import { MapPin, Phone, Clock, Star } from 'lucide-react';
import { Card } from './ui/card';

export function BusinessCard({ business, onSelect, isSelected }) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg focus:outline-none focus-visible:outline-none border-gray-200 ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
      onClick={() => onSelect(business)}
    >
      {/* Photo — uses photo_url from backend, falls back to placeholder */}
      <div className="overflow-hidden rounded-t-lg h-48 bg-gray-100 flex items-center justify-center">
        {business.photo_url ? (
          <img
            src={business.photo_url}
            alt={business.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div className="flex flex-col items-center text-gray-300 gap-2">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5"/>
              <path d="M21 15l-5-5L5 21" strokeWidth="1.5"/>
            </svg>
            <span className="text-xs">No photo available</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-lg">{business.name}</h3>
            <p className="text-sm text-gray-600">{business.category}</p>
          </div>
          {business.rating && (
            <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-medium">{business.rating}</span>
            </div>
          )}
        </div>

        {business.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {business.description}
          </p>
        )}

        <div className="space-y-2">
          {business.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{business.address}</span>
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-600">{business.phone}</span>
            </div>
          )}
          {business.hours && (
            <div className="flex items-start gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{business.hours}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
