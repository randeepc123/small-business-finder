import { MapPin, Phone, Clock, Star } from 'lucide-react';
import { Card } from './ui/card';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function BusinessCard({ business, onSelect, isSelected }) {
    return (
        <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onSelect(business)}
        >
            <div className="overflow-hidden rounded-t-lg h-48">
                <ImageWithFallback
                    src={`https://source.unsplash.com/800x600/?${business.image}`}
                    alt={business.name}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h3 className="font-semibold text-lg">{business.name}</h3>
                        <p className="text-sm text-gray-600">{business.category}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded">
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm font-medium">{business.rating}</span>
                    </div>
                </div>

                <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {business.description}
                </p>

                <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{business.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-gray-600">{business.phone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{business.hours}</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}
