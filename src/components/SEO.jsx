import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEO Component for managing meta tags
 * Usage: <SEO title="Page Title" description="Page description" />
 */
export default function SEO({ 
    title = 'Stryng Clothing - Premium Streetwear & Fashion',
    description = 'Shop premium quality streetwear, t-shirts, shirts, and trousers at Stryng Clothing. Direct-to-consumer pricing with luxury quality.',
    keywords = 'streetwear, fashion, clothing, t-shirts, shirts, trousers, premium clothing, online shopping',
    image = '/images/stryingclothing.png',
    type = 'website'
}) {
    const location = useLocation();
    const url = `${window.location.origin}${location.pathname}`;

    useEffect(() => {
        // Update document title
        document.title = title;

        // Update or create meta tags
        const updateMetaTag = (name, content, isProperty = false) => {
            const attribute = isProperty ? 'property' : 'name';
            let element = document.querySelector(`meta[${attribute}="${name}"]`);
            
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, name);
                document.head.appendChild(element);
            }
            
            element.setAttribute('content', content);
        };

        // Standard meta tags
        updateMetaTag('description', description);
        updateMetaTag('keywords', keywords);

        // Open Graph tags
        updateMetaTag('og:title', title, true);
        updateMetaTag('og:description', description, true);
        updateMetaTag('og:image', image, true);
        updateMetaTag('og:url', url, true);
        updateMetaTag('og:type', type, true);
        updateMetaTag('og:site_name', 'Stryng Clothing', true);

        // Twitter Card tags
        updateMetaTag('twitter:card', 'summary_large_image');
        updateMetaTag('twitter:title', title);
        updateMetaTag('twitter:description', description);
        updateMetaTag('twitter:image', image);

        // Additional SEO tags
        updateMetaTag('robots', 'index, follow');
        updateMetaTag('author', 'Stryng Clothing');
        updateMetaTag('viewport', 'width=device-width, initial-scale=1.0');

        // Canonical URL
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', url);

    }, [title, description, keywords, image, url, type]);

    return null; // This component doesn't render anything
}

/**
 * Generate structured data for products
 */
export const generateProductSchema = (product) => {
    return {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: product.name,
        image: product.images,
        description: product.description,
        brand: {
            '@type': 'Brand',
            name: product.brand
        },
        offers: {
            '@type': 'Offer',
            url: `${window.location.origin}/products/${product.slug}`,
            priceCurrency: 'INR',
            price: product.price,
            availability: 'https://schema.org/InStock',
            seller: {
                '@type': 'Organization',
                name: 'Stryng Clothing'
            }
        },
        aggregateRating: product.reviewCount > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount
        } : undefined
    };
};

/**
 * Inject structured data into page
 */
export const injectStructuredData = (data) => {
    // Remove existing structured data
    const existing = document.querySelector('script[type="application/ld+json"]');
    if (existing) {
        existing.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
};
