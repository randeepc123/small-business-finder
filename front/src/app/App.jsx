import { useState, useEffect } from 'react';
import { BusinessMap } from './components/BusinessMap';
import { BusinessCard } from './components/BusinessCard';
import { BusinessDetails } from './components/BusinessDetails';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Search, MapIcon, List, Sparkles } from 'lucide-react';
import { Button } from './components/ui/button';

const BACKEND = 'http://127.0.0.1:5001';

export default function App() {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailsBusiness, setDetailsBusiness] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(5000); // metres
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('split');
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Locating...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Get user location on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('Location unavailable');
      // Fallback to New York City
      setUserLat(40.7128);
      setUserLng(-74.0060);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocationStatus('Location found ✓');
      },
      () => {
        setLocationStatus('Location denied — using default');
        setUserLat(40.7128);
        setUserLng(-74.0060);
      }
    );
  }, []);

  // ── Search handler ──────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!userLat || !userLng) return;

    setLoading(true);
    setError(null);
    setBusinesses([]);
    setSelectedBusiness(null);
    setDetailsBusiness(null);

    try {
      const url = `${BACKEND}/search?query=${encodeURIComponent(searchQuery).toString()}&lat=${userLat}&lng=${userLng}&radius=${radius}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBusinesses(data.businesses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch full details when a business is selected ──────────────────────────
  const handleSelectBusiness = async (business) => {
    setSelectedBusiness(business);
    setDetailsBusiness(business);
    setDetailsData(null); // clear previous while loading

    try {
      const res = await fetch(`${BACKEND}/details?place_id=${business.place_id}`);
      if (!res.ok) throw new Error('Could not load details');
      const data = await res.json();
      // Merge details into the business object so BusinessDetails has everything
      setDetailsData({
        ...business,
        phone: data.formatted_phone_number || null,
        hours: data.opening_hours?.weekday_text?.join(', ') || null,
        description: data.description || null,
        photo_url: data.photo_url || business.photo_url || null,
        website: data.website || null,
        address: data.formatted_address || business.address,
      });
    } catch {
      // Fall back to card data if details call fails
      setDetailsData({
        ...business,
        phone: null,
        hours: null,
        description: null,
      });
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  // Build category list dynamically from whatever the API returned
  const categories = ['all', ...Array.from(new Set(businesses.map(b => b.category).filter(Boolean)))];

  const filteredBusinesses = businesses.filter(business => {
    const matchesCategory = categoryFilter === 'all' || business.category === categoryFilter;
    return matchesCategory;
  });

  return (
    <div className="h-screen flex flex-col bg-slate-50 relative overflow-hidden">

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className='flex-row'>
              <img src="public/logo.png" alt="" srcset="" className='w-15 inline-block'/>
              <h1 className="text-2xl font-semibold inline-block align-middle">Shop Local</h1>
            </div>
            <span className="text-xs text-gray-400">{locationStatus}</span>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 cursor-pointer" onClick={handleSearch} disabled={loading || !searchQuery.trim()}/>
                <Input
                  placeholder="I want pizzas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>

              <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
                {loading ? 'Searching...' : 'Search'}
              </Button>


              {/* Category Filter — only shown once results are loaded */}
              {businesses.length > 0 && (
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
              )}
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

          {/* Radius Slider */}
          <div className="mt-4 flex items-center gap-4">
            <span className="text-black-100 text-s font-extrabold whitespace-nowrap">
              📍 Radius: <span className="text-black font-bold">{radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}</span>
            </span>
            <input
              type="range"
              min="500"
              max="25000"
              step="500"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full cursor-pointer"
            />
            <span className="text-blue-200 text-xs whitespace-nowrap">500 m — 25 km</span>
          </div>

          {businesses.length > 0 && (
            <p className="text-sm text-gray-600 mt-3">
              Found {filteredBusinesses.length} business{filteredBusinesses.length !== 1 ? 'es' : ''}
            </p>
          )}

          {error && (
            <p className="text-sm text-red-500 mt-3">⚠ {error}</p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        <div className="h-full max-w-7xl mx-auto px-4 py-6">

          {/* Empty / loading state */}
          {!loading && businesses.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 animate-in fade-in duration-700">
              <div className="p-6 bg-white rounded-full shadow-sm shadow-indigo-100 border border-indigo-50">
                <span className="text-6xl">🏪</span>
              </div>
              <p className="text-2xl font-semibold text-slate-700 tracking-tight">Discover local gems</p>
              <p className="text-slate-500 max-w-sm text-center">Tell us what you need in natural language, and we'll use AI to find the best local, independent businesses for you.</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-full text-black gap-4 animate-in fade-in">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-black rounded-full animate-spin shadow-lg shadow-black-200" />
              <p className="font-medium text-lg">AI is analyzing nearby businesses...</p>
            </div>
          )}

          {!loading && businesses.length > 0 && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Map View */}
              {(viewMode === 'split' || viewMode === 'map') && (
                <div className={`${viewMode === 'map' ? 'lg:col-span-2' : ''} h-[400px] lg:h-full`}>
                  <BusinessMap
                    businesses={filteredBusinesses}
                    selectedBusiness={selectedBusiness}
                    onBusinessSelect={handleSelectBusiness}
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
                        onSelect={handleSelectBusiness}
                        isSelected={selectedBusiness?.id === business.id}
                      />
                    ))}
                  </div>

                  {filteredBusinesses.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No businesses found for that category.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Business Details Modal — only opens once details are loaded */}
      {detailsBusiness && detailsData && (
        <BusinessDetails
          business={detailsData}
          onClose={() => { setDetailsBusiness(null); setDetailsData(null); }}
        />
      )}
    </div>
  );
}
