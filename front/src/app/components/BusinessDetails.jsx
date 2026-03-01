import { MapPin, Phone, Clock, Star, X, Globe } from 'lucide-react';
import { Button } from './ui/button';

export function BusinessDetails({ business, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10">

        {/* Photo */}
        <div className="relative h-64 bg-gray-100 flex items-center justify-center rounded-t-lg overflow-hidden">
          {business.photo_url ? (
            <img
              src={business.photo_url}
              alt={business.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="flex flex-col items-center text-gray-300 gap-2">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5"/>
                <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5"/>
                <path d="M21 15l-5-5L5 21" strokeWidth="1.5"/>
              </svg>
              <span className="text-sm">No photo available</span>
            </div>
          )}

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-white hover:bg-gray-100 rounded-full shadow"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Name, category, rating */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{business.name}</h2>
              <p className="text-gray-600">{business.category}</p>
            </div>
            {business.rating && (
              <div className="flex items-center gap-2 bg-yellow-100 px-3 py-2 rounded-lg">
                <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                <span className="font-semibold">{business.rating}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {business.description && (
            <p className="text-gray-700 mb-6">{business.description}</p>
          )}

          {/* Detail rows */}
          <div className="space-y-4">
            {business.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Address</h3>
                  <p className="text-gray-700">{business.address}</p>
                </div>
              </div>
            )}

            {business.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Phone</h3>
                  <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                    {business.phone}
                  </a>
                </div>
              </div>
            )}

            {business.hours && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Hours</h3>
                  <p className="text-gray-700 whitespace-pre-line">{business.hours}</p>
                </div>
              </div>
            )}

            {business.website && (
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">Website</h3>
                  <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                    {business.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            <Button className="flex-1" asChild>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions
              </a>
            </Button>
            {business.phone && (
              <Button variant="outline" className="flex-1" asChild>
                <a href={`tel:${business.phone}`}>Call Now</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
