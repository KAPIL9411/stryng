/**
 * A/B Testing Utilities
 * Simple client-side A/B testing framework
 */

// Storage key for user's variant assignments
const STORAGE_KEY = 'ab_test_variants';

/**
 * Get or assign user to a variant
 * @param {string} experimentName - Name of the experiment
 * @param {Array<Object>} variants - Array of variant objects with name and weight
 * @returns {string} Assigned variant name
 */
export const getVariant = (experimentName, variants) => {
    // Get existing assignments
    const assignments = getAssignments();
    
    // Check if user already has an assignment for this experiment
    if (assignments[experimentName]) {
        return assignments[experimentName];
    }
    
    // Assign new variant based on weights
    const variant = assignVariant(variants);
    
    // Save assignment
    assignments[experimentName] = variant;
    saveAssignments(assignments);
    
    // Track assignment in analytics
    trackVariantAssignment(experimentName, variant);
    
    return variant;
};

/**
 * Assign variant based on weights
 * @param {Array<Object>} variants - Array of {name, weight}
 * @returns {string} Selected variant name
 */
const assignVariant = (variants) => {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const variant of variants) {
        random -= variant.weight;
        if (random <= 0) {
            return variant.name;
        }
    }
    
    return variants[0].name; // Fallback
};

/**
 * Get all variant assignments from storage
 */
const getAssignments = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
};

/**
 * Save variant assignments to storage
 */
const saveAssignments = (assignments) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    } catch (e) {
        console.error('Failed to save A/B test assignments', e);
    }
};

/**
 * Track variant assignment in analytics
 */
const trackVariantAssignment = (experimentName, variant) => {
    if (window.gtag) {
        window.gtag('event', 'ab_test_assignment', {
            experiment_name: experimentName,
            variant: variant,
            event_category: 'A/B Testing',
        });
    }
    
    console.log(`[A/B Test] ${experimentName}: ${variant}`);
};

/**
 * Track conversion for an experiment
 * @param {string} experimentName - Name of the experiment
 * @param {string} conversionType - Type of conversion (e.g., 'purchase', 'signup')
 * @param {number} value - Optional value for the conversion
 */
export const trackConversion = (experimentName, conversionType, value = 0) => {
    const assignments = getAssignments();
    const variant = assignments[experimentName];
    
    if (!variant) {
        console.warn(`No variant assignment found for experiment: ${experimentName}`);
        return;
    }
    
    if (window.gtag) {
        window.gtag('event', 'ab_test_conversion', {
            experiment_name: experimentName,
            variant: variant,
            conversion_type: conversionType,
            value: value,
            event_category: 'A/B Testing',
        });
    }
    
    console.log(`[A/B Test Conversion] ${experimentName} (${variant}): ${conversionType}`);
};

/**
 * Reset all variant assignments (useful for testing)
 */
export const resetAssignments = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[A/B Test] All assignments reset');
    } catch (e) {
        console.error('Failed to reset A/B test assignments', e);
    }
};

/**
 * Get current variant for an experiment
 * @param {string} experimentName - Name of the experiment
 * @returns {string|null} Current variant or null if not assigned
 */
export const getCurrentVariant = (experimentName) => {
    const assignments = getAssignments();
    return assignments[experimentName] || null;
};

// ========================================
// PREDEFINED EXPERIMENTS
// ========================================

/**
 * Infinite Scroll vs Pagination experiment
 */
export const getProductListingVariant = () => {
    return getVariant('product_listing_pagination', [
        { name: 'infinite_scroll', weight: 50 },
        { name: 'traditional_pagination', weight: 50 },
    ]);
};

/**
 * Products per page experiment
 */
export const getProductsPerPageVariant = () => {
    return getVariant('products_per_page', [
        { name: '12', weight: 25 },
        { name: '24', weight: 50 },
        { name: '36', weight: 25 },
    ]);
};

/**
 * Image size experiment
 */
export const getImageSizeVariant = () => {
    return getVariant('product_image_size', [
        { name: 'small', weight: 33 },
        { name: 'medium', weight: 34 },
        { name: 'large', weight: 33 },
    ]);
};

/**
 * Hero carousel speed experiment
 */
export const getCarouselSpeedVariant = () => {
    return getVariant('hero_carousel_speed', [
        { name: 'slow', weight: 33 },    // 8s per slide
        { name: 'medium', weight: 34 },  // 5s per slide
        { name: 'fast', weight: 33 },    // 3s per slide
    ]);
};

/**
 * Search debounce delay experiment
 */
export const getSearchDebounceVariant = () => {
    return getVariant('search_debounce_delay', [
        { name: '200ms', weight: 33 },
        { name: '300ms', weight: 34 },
        { name: '500ms', weight: 33 },
    ]);
};

// ========================================
// REACT HOOKS
// ========================================

import { useState, useEffect } from 'react';

/**
 * React hook for A/B testing
 * @param {string} experimentName - Name of the experiment
 * @param {Array<Object>} variants - Array of variant objects
 * @returns {string} Assigned variant
 */
export const useABTest = (experimentName, variants) => {
    const [variant, setVariant] = useState(null);
    
    useEffect(() => {
        const assignedVariant = getVariant(experimentName, variants);
        setVariant(assignedVariant);
    }, [experimentName]);
    
    return variant;
};

/**
 * Hook for product listing pagination experiment
 */
export const useProductListingExperiment = () => {
    return useABTest('product_listing_pagination', [
        { name: 'infinite_scroll', weight: 50 },
        { name: 'traditional_pagination', weight: 50 },
    ]);
};

/**
 * Hook for products per page experiment
 */
export const useProductsPerPageExperiment = () => {
    const variant = useABTest('products_per_page', [
        { name: '12', weight: 25 },
        { name: '24', weight: 50 },
        { name: '36', weight: 25 },
    ]);
    
    return variant ? parseInt(variant) : 24;
};

// ========================================
// ANALYTICS HELPERS
// ========================================

/**
 * Track page view with variant information
 */
export const trackPageViewWithVariants = (pagePath) => {
    const assignments = getAssignments();
    
    if (window.gtag) {
        window.gtag('event', 'page_view', {
            page_path: pagePath,
            ab_variants: JSON.stringify(assignments),
            event_category: 'Navigation',
        });
    }
};

/**
 * Get all active experiments and their variants
 */
export const getActiveExperiments = () => {
    return getAssignments();
};

/**
 * Export experiment data for analysis
 */
export const exportExperimentData = () => {
    const assignments = getAssignments();
    const data = {
        assignments,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
    };
    
    console.log('[A/B Test Export]', data);
    return data;
};
