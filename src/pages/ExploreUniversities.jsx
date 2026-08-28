import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, X, ChevronLeft, ChevronRight, ArrowRight, ExternalLink } from 'lucide-react';
import { universityData } from '../data/universityData';
import { getDestinationFlagCode, studyDestinationNames, studyDestinations } from '../data/studyDestinations';

const ITEMS_PER_PAGE = 12;

const ExploreUniversities = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUni, setSelectedUni] = useState(null);

  // Set page title and meta description
  useEffect(() => {
    document.title = "Explore Universities | Universe Consults";
    
    // Add meta description dynamically
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.getElementsByTagName('head')[0].appendChild(metaDesc);
    }
    metaDesc.content = "Explore premium partner universities worldwide with Universe Educational Consultancy. Filter by country and study levels to find your perfect academic fit.";
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCountry]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedUni(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered universities
  const filteredUniversities = useMemo(() => {
    return universityData.filter((uni) => {
      if (!studyDestinationNames.includes(uni.country)) return false;

      const matchesSearch = 
        uni.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        uni.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        uni.country.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCountry = selectedCountry === 'All' || uni.country === selectedCountry;

      return matchesSearch && matchesCountry;
    });
  }, [searchQuery, selectedCountry]);

  // Paginated universities
  const paginatedUniversities = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUniversities.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUniversities, currentPage]);

  const totalPages = Math.ceil(filteredUniversities.length / ITEMS_PER_PAGE);

  // Generate pagination page numbers with ellipsis
  const paginationRange = useMemo(() => {
    const range = [];
    const maxVisiblePages = 5; // showing up to 5 page numbers directly

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      const leftSiblingIndex = Math.max(currentPage - 1, 1);
      const rightSiblingIndex = Math.min(currentPage + 1, totalPages);

      const showLeftEllipsis = leftSiblingIndex > 2;
      const showRightEllipsis = rightSiblingIndex < totalPages - 1;

      if (!showLeftEllipsis && showRightEllipsis) {
        for (let i = 1; i <= 4; i++) {
          range.push(i);
        }
        range.push('...');
        range.push(totalPages);
      } else if (showLeftEllipsis && !showRightEllipsis) {
        range.push(1);
        range.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          range.push(i);
        }
      } else {
        range.push(1);
        range.push('...');
        for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
          range.push(i);
        }
        range.push('...');
        range.push(totalPages);
      }
    }

    return range;
  }, [totalPages, currentPage]);

  const getFlagUrl = (country) => {
    const code = getDestinationFlagCode(country);
    return `https://flagcdn.com/32x24/${code}.png`;
  };

  // Get dynamic colors for avatar based on name hash
  const getAvatarColor = (name) => {
    const colors = [
      'bg-primary-900 text-accent-400 border-accent-400/20',
      'bg-primary-50 text-primary-600 border-primary-100',
      'bg-primary-800 text-white border-primary-700',
      'bg-accent-50 text-accent-700 border-accent-200'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCountry('All');
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* --- HERO / PAGE HEADER --- */}
      <header
        className="relative py-14 md:py-16"
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(2, 16, 39, 0.88), rgba(15, 23, 42, 0.72)), url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-full h-full bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-full h-full bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwdjJIMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 text-center z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-accent-400 text-xs font-semibold tracking-wide uppercase mb-4 backdrop-blur-sm">
            <Search className="w-3.5 h-3.5" />
            <span>Find Your Path</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 tracking-tight">
            Explore <span className="text-primary-400">Universities</span>
          </h1>
          <p className="text-base text-primary-200 max-w-2xl mx-auto font-light leading-relaxed">
            Discover leading universities and find the right destination for your academic journey. Filter institutions, learn about programs, and start your global journey with us.
          </p>
        </div>
      </header>

      {/* --- MAIN INTERACTIVE CONTAINER --- */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-10 md:py-16">
        
        {/* --- SEARCH AND FILTER AREA --- */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-150 p-6 md:p-8 mb-10 transition-all duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-end">
            
            {/* Search Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="search-input" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                University Search
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search university by name, city, country..."
                  className="block w-full pl-10 pr-4 py-3 bg-gray-50 hover:bg-gray-100/70 focus:bg-white text-gray-900 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 rounded-xl text-sm transition-all outline-none"
                />
              </div>
            </div>

            {/* Country Selector */}
            <div className="flex flex-col gap-2">
              <label htmlFor="country-filter" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Country Filter
              </label>
              <select
                id="country-filter"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="block w-full px-4 py-3 bg-gray-50 hover:bg-gray-100/70 focus:bg-white text-gray-900 border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 rounded-xl text-sm transition-all outline-none appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1em'
                }}
              >
                <option value="All">All Countries</option>
                {studyDestinations.map((destination) => (
                  <option key={destination.name} value={destination.name}>
                    {destination.name}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </section>

        {/* --- UNIVERSITY RESULT COUNT --- */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm font-semibold text-gray-600">
            Showing <span className="text-primary-600 font-bold">{filteredUniversities.length}</span> universities
          </p>
          {(searchQuery || selectedCountry !== 'All') && (
            <button 
              onClick={handleClearFilters}
              className="text-xs font-semibold text-primary-600 hover:text-primary-800 underline transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* --- UNIVERSITY CARDS / GRID SYSTEM --- */}
        {filteredUniversities.length === 0 ? (
          /* --- EMPTY SEARCH STATE --- */
          <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center max-w-md mx-auto shadow-xs">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No universities found</h3>
            <p className="text-gray-500 text-sm mb-6">
              Try adjusting your search query, or select another country filter.
            </p>
            <button
              onClick={handleClearFilters}
              className="w-full inline-flex justify-center items-center bg-primary-900 hover:bg-primary-800 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {paginatedUniversities.map((uni) => (
                <article 
                  key={uni.id} 
                  className="bg-white rounded-2xl border border-gray-100 hover:border-primary-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-6 md:p-7">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      {/* Logo Placeholder */}
                      <div className={`w-14 h-14 rounded-xl border flex items-center justify-center font-display font-bold text-xl shrink-0 ${getAvatarColor(uni.name)}`}>
                        {uni.name.charAt(0)}
                      </div>
                      
                      {/* Country Flag Badge */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-150 text-xs font-semibold text-gray-600 shadow-2xs">
                        <img 
                          src={getFlagUrl(uni.country)} 
                          alt={`${uni.country} flag`}
                          className="w-4 h-3.5 object-cover rounded-2xs"
                        />
                        {uni.country}
                      </div>
                    </div>

                    <h3 className="text-lg font-display font-bold text-gray-950 group-hover:text-primary-600 transition-colors mb-2 leading-tight">
                      {uni.name}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium mb-3">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      <span>{uni.city}, {uni.country}</span>
                    </div>

                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-4">
                      {uni.description}
                    </p>
                  </div>

                  <div className="p-6 pt-0 border-t border-gray-50 bg-gray-50/50 flex justify-between items-center mt-auto">
                    <button 
                      onClick={() => setSelectedUni(uni)}
                      className="w-full inline-flex justify-center items-center gap-2 bg-white hover:bg-primary-900 hover:text-white border border-gray-200 hover:border-primary-900 text-gray-700 font-bold px-4 py-2.5 rounded-xl transition-all duration-300 text-sm group-hover:shadow-xs"
                    >
                      View University <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* --- PAGINATION --- */}
            {totalPages > 1 && (
              <nav className="flex justify-center items-center gap-1.5 mt-12 md:mt-16">
                
                {/* Previous Button */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Page Numbers */}
                {paginationRange.map((page, idx) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 font-bold text-sm">
                        &hellip;
                      </span>
                    );
                  }
                  return (
                    <button
                      key={`page-${page}`}
                      onClick={() => setCurrentPage(Number(page))}
                      className={`w-10 h-10 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-primary-900 text-white font-bold shadow-md shadow-primary-900/10 border border-primary-900'
                          : 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

              </nav>
            )}
          </div>
        )}

      </main>

      {/* --- UNIVERSITY DETAILS MODAL / DRAWER --- */}
      {selectedUni && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedUni(null)}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-150 overflow-hidden transform transition-all flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative bg-primary-900 text-white px-6 py-8 md:p-8 flex items-start gap-4">
              <button 
                onClick={() => setSelectedUni(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Avatar */}
              <div className={`w-16 h-16 rounded-xl border flex items-center justify-center font-display font-bold text-2xl shrink-0 ${getAvatarColor(selectedUni.name)}`}>
                {selectedUni.name.charAt(0)}
              </div>

              {/* Title & Info */}
              <div className="pr-6">
                <h2 className="text-xl md:text-2xl font-display font-bold leading-tight mb-2 text-white">
                  {selectedUni.name}
                </h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-primary-200 font-medium">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-accent-400" />
                    <span>{selectedUni.city}, {selectedUni.country}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <img 
                      src={getFlagUrl(selectedUni.country)} 
                      alt="" 
                      className="w-3.5 h-3 object-cover rounded-3xs"
                    />
                    <span>{selectedUni.country}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              
              {/* About Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  About the University
                </h4>
                <p className="text-gray-700 text-sm md:text-base leading-relaxed">
                  {selectedUni.description}
                </p>
              </div>

              {/* External Link */}
              {selectedUni.website && (
                <div className="pt-2">
                  <a 
                    href={selectedUni.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    Visit University Website <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-5 md:px-8 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
              <button 
                onClick={() => setSelectedUni(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold transition-all text-sm"
              >
                Close details
              </button>
              <Link 
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent-400 hover:bg-accent-500 text-primary-900 font-bold transition-all shadow-md hover:shadow-lg hover:shadow-accent-400/20 text-sm"
              >
                Apply With Us <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ExploreUniversities;
