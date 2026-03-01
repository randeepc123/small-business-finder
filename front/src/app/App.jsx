import { useState, useEffect } from 'react';
import { BusinessMap } from './components/BusinessMap';
import { BusinessCard } from './components/BusinessCard';
import { BusinessDetails } from './components/BusinessDetails';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Search, MapIcon, List, Sparkles } from 'lucide-react';
import { Button } from './components/ui/button';

const BACKEND = 'http://localhost:5001';

export default function App() {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [detailsBusiness, setDetailsBusiness] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
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
      const url = `${BACKEND}/search?query=${encodeURIComponent(searchQuery)}&lat=${userLat}&lng=${userLng}`;
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
      {/* Decorative gradient background blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/50 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/50 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 text-white shadow-lg border-b z-10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              Local Business Finder
            </h1>
            <span className="text-xs bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm text-blue-50 border border-white/10 font-medium">
              {locationStatus}
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="I'm feeling sick..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-100 placeholder:opacity-70 focus:bg-white focus:text-gray-900 transition-all rounded-full px-4 h-11"
                />
              </div>

              <Button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="bg-white text-indigo-700 hover:bg-blue-50 rounded-full px-6 font-semibold shadow-sm h-11 transition-all"
              >
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
            <div className="flex bg-white/10 p-1 rounded-full backdrop-blur-sm border border-white/10">
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
                className={`gap-2 rounded-full px-4 ${viewMode === 'map' ? 'bg-white text-indigo-700 hover:bg-white shadow-sm' : 'text-blue-50 hover:bg-white/20 hover:text-white'}`}
              >
                <MapIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Map</span>
              </Button>
              <Button
                variant={viewMode === 'split' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('split')}
                className={`rounded-full px-4 ${viewMode === 'split' ? 'bg-white text-indigo-700 hover:bg-white shadow-sm' : 'text-blue-50 hover:bg-white/20 hover:text-white'}`}
              >
                <span className="hidden sm:inline">Both</span>
                <span className="sm:hidden">Split</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`gap-2 rounded-full px-4 ${viewMode === 'list' ? 'bg-white text-indigo-700 hover:bg-white shadow-sm' : 'text-blue-50 hover:bg-white/20 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>
          </div>

          {businesses.length > 0 && (
            <div className="flex items-center gap-2 mt-4 text-blue-100 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <p>Top {filteredBusinesses.length} recommended independent business{filteredBusinesses.length !== 1 ? 'es' : ''} for you</p>
            </div>
          )}

          {error && (
            <p className="text-sm bg-red-500/20 text-red-100 px-3 py-2 rounded-lg mt-4 inline-block border border-red-500/30 font-medium">⚠ {error}</p>
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
            <div className="flex flex-col items-center justify-center h-full text-indigo-600 gap-4 animate-in fade-in">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-lg shadow-indigo-200" />
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
