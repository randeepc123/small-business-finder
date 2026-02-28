import { useState } from 'react';
import { businesses } from './app/data/businesses';
import { BusinessMap } from './app/components/BusinessMap';
import { BusinessCard } from './app/components/BusinessCard';
import { BusinessDetails } from './app/components/BusinessDetails';
import { Input } from './app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './app/components/ui/select';
import { Search, MapIcon, List } from 'lucide-react';
import { Button } from './app/components/ui/button';

export default function App() {
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [detailsBusiness, setDetailsBusiness] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [viewMode, setViewMode] = useState('split');

    // Get unique categories
    const categories = ['all', ...Array.from(new Set(businesses.map(b => b.category)))];

    // Filter businesses
    const filteredBusinesses = businesses.filter(business => {
        const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            business.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || business.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <h1 className="text-2xl font-semibold mb-4">Local Business Finder</h1>

                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search businesses..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Category Filter */}
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-full sm:w-48">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(category => (
                                        <SelectItem key={category} value={category}>
                                            {category === 'all' ? 'All Categories' : category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex gap-2">
                            <Button
                                variant={viewMode === 'map' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('map')}
                                className="gap-2"
                            >
                                <MapIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Map</span>
                            </Button>
                            <Button
                                variant={viewMode === 'split' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('split')}
                            >
                                <span className="hidden sm:inline">Both</span>
                                <span className="sm:hidden">Split</span>
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className="gap-2"
                            >
                                <List className="w-4 h-4" />
                                <span className="hidden sm:inline">List</span>
                            </Button>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-3">
                        Found {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''}
                    </p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                <div className="h-full max-w-7xl mx-auto px-4 py-4">
                    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Map View */}
                        {(viewMode === 'split' || viewMode === 'map') && (
                            <div className={`${viewMode === 'map' ? 'lg:col-span-2' : ''} h-[400px] lg:h-full`}>
                                <BusinessMap
                                    businesses={filteredBusinesses}
                                    selectedBusiness={selectedBusiness}
                                    onBusinessSelect={(business) => {
                                        setSelectedBusiness(business);
                                        setDetailsBusiness(business);
                                    }}
                                />
                            </div>
                        )}

                        {/* List View */}
                        {(viewMode === 'split' || viewMode === 'list') && (
                            <div className={`${viewMode === 'list' ? 'lg:col-span-2' : ''} overflow-y-auto`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                                    {filteredBusinesses.map((business) => (
                                        <BusinessCard
                                            key={business.id}
                                            business={business}
                                            onSelect={(business) => {
                                                setSelectedBusiness(business);
                                                setDetailsBusiness(business);
                                            }}
                                            isSelected={selectedBusiness?.id === business.id}
                                        />
                                    ))}
                                </div>

                                {filteredBusinesses.length === 0 && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500">No businesses found matching your criteria.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Business Details Modal */}
            {detailsBusiness && (
                <BusinessDetails
                    business={detailsBusiness}
                    onClose={() => setDetailsBusiness(null)}
                />
            )}
        </div>
    );
}
