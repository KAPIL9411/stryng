import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, TrendingUp } from 'lucide-react';
import { getAutocompleteSuggestions, getTrendingSearches } from '../api/products.api';
import useDebounce from '../hooks/useDebounce';

export default function SearchBar({ className = '' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const debouncedQuery = useDebounce(query, 300);

  // Load trending searches on mount
  useEffect(() => {
    getTrendingSearches(7, 5).then(data => {
      setTrendingSearches(data || []);
    });
  }, []);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      setIsLoading(true);
      console.log('🔍 Fetching autocomplete for:', debouncedQuery);
      
      getAutocompleteSuggestions(debouncedQuery, 8)
        .then(data => {
          console.log('✅ Autocomplete results:', data);
          setSuggestions(data || []);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('❌ Autocomplete error:', error);
          setSuggestions([]);
          setIsLoading(false);
        });
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  }, [debouncedQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery) => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      navigate(`/products?search=${encodeURIComponent(trimmedQuery)}`);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSearch(suggestions[selectedIndex].suggestion);
    } else {
      handleSearch(query);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    const itemCount = suggestions.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < itemCount - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  const showTrending = showSuggestions && query.trim().length === 0 && trendingSearches.length > 0;
  const showAutocomplete = showSuggestions && suggestions.length > 0;

  return (
    <div ref={searchRef} className={`search-bar ${className}`}>
      <form onSubmit={handleSubmit} className="search-bar__form">
        <Search className="search-bar__icon" size={18} />
        <input
          ref={inputRef}
          type="text"
          className="search-bar__input"
          placeholder="Search for products, brands..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          aria-label="Search products"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={showSuggestions}
        />
        {query && (
          <button
            type="button"
            className="search-bar__clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {/* Autocomplete Suggestions */}
      {(showAutocomplete || showTrending) && (
        <div className="search-suggestions" id="search-suggestions" role="listbox">
          {isLoading && (
            <div className="search-suggestions__loading">
              Searching...
            </div>
          )}

          {/* Trending Searches */}
          {showTrending && (
            <>
              <div className="search-suggestions__header">
                <TrendingUp size={14} />
                <span>Trending Searches</span>
              </div>
              {trendingSearches.map((item, index) => (
                <button
                  key={`trending-${index}`}
                  className="search-suggestions__item"
                  onClick={() => handleSuggestionClick(item.search_term)}
                  role="option"
                  aria-selected={false}
                >
                  <Search size={14} className="search-suggestions__item-icon" />
                  <span>{item.search_term}</span>
                  <span className="search-suggestions__count">
                    {item.search_count} searches
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Autocomplete Results */}
          {showAutocomplete && !isLoading && (
            <>
              {suggestions.map((item, index) => (
                <button
                  key={`suggestion-${index}`}
                  className={`search-suggestions__item ${selectedIndex === index ? 'search-suggestions__item--selected' : ''}`}
                  onClick={() => handleSuggestionClick(item.suggestion)}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <Search size={14} className="search-suggestions__item-icon" />
                  <div className="search-suggestions__item-content">
                    <span className="search-suggestions__item-text">
                      {item.suggestion}
                    </span>
                    <span className="search-suggestions__item-meta">
                      {item.match_type === 'brand' ? 'Brand' : 'Product'} • {item.category}
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* No Results */}
          {showAutocomplete && !isLoading && suggestions.length === 0 && query.trim().length >= 2 && (
            <div className="search-suggestions__empty">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
