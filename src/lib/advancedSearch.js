/**
 * Advanced Search Utilities
 * Implements fuzzy matching, relevance scoring, and search suggestions
 * Alternative to Algolia for client-side search
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
const levenshteinDistance = (str1, str2) => {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
};

/**
 * Calculate similarity score between two strings (0-1)
 */
const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
};

/**
 * Normalize text for searching
 */
const normalizeText = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' '); // Normalize whitespace
};

/**
 * Extract searchable text from product
 */
const getSearchableText = (product) => {
    return [
        product.name,
        product.description,
        product.brand,
        product.category,
        product.fabric,
        ...(product.colors?.map(c => c.name) || []),
        ...(product.sizes || []),
    ].filter(Boolean).join(' ');
};

/**
 * Calculate relevance score for a product
 */
const calculateRelevanceScore = (product, searchTerms, query) => {
    const searchableText = normalizeText(getSearchableText(product));
    let score = 0;

    // Exact match in name (highest priority)
    if (normalizeText(product.name).includes(query)) {
        score += 100;
    }

    // Exact match in description
    if (normalizeText(product.description || '').includes(query)) {
        score += 50;
    }

    // Exact match in brand
    if (normalizeText(product.brand).includes(query)) {
        score += 40;
    }

    // Exact match in category
    if (normalizeText(product.category).includes(query)) {
        score += 30;
    }

    // Term matching
    searchTerms.forEach(term => {
        if (searchableText.includes(term)) {
            score += 10;
        }

        // Fuzzy matching for typos
        const words = searchableText.split(' ');
        words.forEach(word => {
            const similarity = calculateSimilarity(term, word);
            if (similarity > 0.7) {
                score += similarity * 5;
            }
        });
    });

    // Boost for trending products
    if (product.isTrending) {
        score *= 1.2;
    }

    // Boost for new products
    if (product.isNew) {
        score *= 1.1;
    }

    // Boost for higher ratings
    if (product.rating) {
        score *= (1 + product.rating / 10);
    }

    return score;
};

/**
 * Advanced search with fuzzy matching and relevance scoring
 */
export const advancedSearch = (products, query, options = {}) => {
    const {
        fuzzyMatch = true,
        minScore = 0,
        maxResults = 100,
    } = options;

    if (!query || query.trim().length === 0) {
        return products;
    }

    const normalizedQuery = normalizeText(query);
    const searchTerms = normalizedQuery.split(' ').filter(Boolean);

    // Calculate scores for all products
    const scoredProducts = products.map(product => ({
        product,
        score: calculateRelevanceScore(product, searchTerms, normalizedQuery),
    }));

    // Filter by minimum score and sort by relevance
    return scoredProducts
        .filter(item => item.score > minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults)
        .map(item => item.product);
};

/**
 * Generate search suggestions based on partial query
 */
export const generateSearchSuggestions = (products, query, maxSuggestions = 5) => {
    if (!query || query.trim().length < 2) {
        return [];
    }

    const normalizedQuery = normalizeText(query);
    const suggestions = new Set();

    products.forEach(product => {
        // Product names
        if (normalizeText(product.name).includes(normalizedQuery)) {
            suggestions.add(product.name);
        }

        // Brands
        if (normalizeText(product.brand).includes(normalizedQuery)) {
            suggestions.add(product.brand);
        }

        // Categories
        if (normalizeText(product.category).includes(normalizedQuery)) {
            suggestions.add(product.category);
        }
    });

    return Array.from(suggestions).slice(0, maxSuggestions);
};

/**
 * Get popular search terms (based on product data)
 */
export const getPopularSearchTerms = (products) => {
    const termFrequency = {};

    products.forEach(product => {
        // Count brands
        termFrequency[product.brand] = (termFrequency[product.brand] || 0) + 1;

        // Count categories
        termFrequency[product.category] = (termFrequency[product.category] || 0) + 1;

        // Count common words in names
        const words = normalizeText(product.name).split(' ');
        words.forEach(word => {
            if (word.length > 3) { // Ignore short words
                termFrequency[word] = (termFrequency[word] || 0) + 1;
            }
        });
    });

    // Sort by frequency and return top terms
    return Object.entries(termFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term]) => term);
};

/**
 * Search with filters
 */
export const searchWithFilters = (products, query, filters = {}) => {
    let results = query ? advancedSearch(products, query) : products;

    // Apply category filter
    if (filters.categories && filters.categories.length > 0) {
        results = results.filter(p => filters.categories.includes(p.category));
    }

    // Apply price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const min = filters.minPrice || 0;
        const max = filters.maxPrice || Infinity;
        results = results.filter(p => p.price >= min && p.price <= max);
    }

    // Apply size filter
    if (filters.sizes && filters.sizes.length > 0) {
        results = results.filter(p => 
            p.sizes && p.sizes.some(s => filters.sizes.includes(s))
        );
    }

    // Apply color filter
    if (filters.colors && filters.colors.length > 0) {
        results = results.filter(p =>
            p.colors && p.colors.some(c => filters.colors.includes(c.name))
        );
    }

    // Apply availability filter
    if (filters.inStock) {
        results = results.filter(p => p.stock > 0);
    }

    // Apply rating filter
    if (filters.minRating) {
        results = results.filter(p => p.rating >= filters.minRating);
    }

    return results;
};

/**
 * Highlight search terms in text
 */
export const highlightSearchTerms = (text, query) => {
    if (!query || !text) return text;

    const normalizedQuery = normalizeText(query);
    const terms = normalizedQuery.split(' ').filter(Boolean);
    
    let highlightedText = text;
    
    terms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        highlightedText = highlightedText.replace(
            regex,
            '<mark>$1</mark>'
        );
    });

    return highlightedText;
};

/**
 * Get search analytics
 */
export const getSearchAnalytics = (searchHistory) => {
    const analytics = {
        totalSearches: searchHistory.length,
        uniqueQueries: new Set(searchHistory.map(s => s.query)).size,
        averageResultsCount: 0,
        topQueries: [],
        noResultQueries: [],
    };

    // Calculate average results
    if (searchHistory.length > 0) {
        analytics.averageResultsCount = Math.round(
            searchHistory.reduce((sum, s) => sum + s.resultsCount, 0) / searchHistory.length
        );
    }

    // Find top queries
    const queryFrequency = {};
    searchHistory.forEach(s => {
        queryFrequency[s.query] = (queryFrequency[s.query] || 0) + 1;
    });

    analytics.topQueries = Object.entries(queryFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

    // Find queries with no results
    analytics.noResultQueries = searchHistory
        .filter(s => s.resultsCount === 0)
        .map(s => s.query);

    return analytics;
};

/**
 * Create search index for faster searching (optional optimization)
 */
export class SearchIndex {
    constructor(products) {
        this.products = products;
        this.index = this.buildIndex(products);
    }

    buildIndex(products) {
        const index = {};

        products.forEach((product, idx) => {
            const searchableText = normalizeText(getSearchableText(product));
            const words = searchableText.split(' ');

            words.forEach(word => {
                if (!index[word]) {
                    index[word] = [];
                }
                index[word].push(idx);
            });
        });

        return index;
    }

    search(query) {
        const normalizedQuery = normalizeText(query);
        const terms = normalizedQuery.split(' ').filter(Boolean);
        const productIndices = new Set();

        terms.forEach(term => {
            if (this.index[term]) {
                this.index[term].forEach(idx => productIndices.add(idx));
            }
        });

        return Array.from(productIndices).map(idx => this.products[idx]);
    }
}
