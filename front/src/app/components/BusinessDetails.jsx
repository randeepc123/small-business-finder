import { MapPin, Phone, Clock, Star, X } from 'lucide-react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function BusinessDetails({ business, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      {/* Blurred Background Image */}
      <div className="absolute inset-0 bg-black bg-opacity-50">
        <ImageWithFallback
          src={`https://source.unsplash.com/1920x1080/?${business.image}`}
          alt=""
          className="w-full h-full object-cover blur-2xl opacity-40"
        />
      </div>
      
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10">
        <div className="relative">
          <ImageWithFallback
            src={`https://source.unsplash.com/1200x600/?${business.image}`}
            alt={business.name}
            className="w-full h-64 object-cover"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-white hover:bg-gray-100 rounded-full"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold mb-1">{business.name}</h2>
              <p className="text-gray-600">{business.category}</p>
            </div>
            <div className="flex items-center gap-2 bg-yellow-100 px-3 py-2 rounded-lg">
              <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
              <span className="font-semibold">{business.rating}</span>
            </div>
          </div>
          
          <p className="text-gray-700 mb-6">
            {business.description}
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium mb-1">Address</h3>
                <p className="text-gray-700">{business.address}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium mb-1">Phone</h3>
                <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                  {business.phone}
                </a>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium mb-1">Hours</h3>
                <p className="text-gray-700">{business.hours}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex gap-3">
            <Button className="flex-1" asChild>
              <a href={`https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}`} target="_blank" rel="noopener noreferrer">
                Get Directions
              </a>
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href={`tel:${business.phone}`}>
                Call Now
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}