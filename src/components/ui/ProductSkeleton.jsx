/**
 * ProductSkeleton Component
 * Displays a loading skeleton for product cards
 * Improves perceived performance during data fetching
 */

export default function ProductSkeleton({ count = 1 }) {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className="product-card skeleton">
                    <div className="product-card__image-wrapper skeleton__image">
                        <div className="skeleton__shimmer" />
                    </div>
                    <div className="product-card__info">
                        <div className="skeleton__text skeleton__text--brand" />
                        <div className="skeleton__text skeleton__text--name" />
                        <div className="skeleton__text skeleton__text--price" />
                        <div className="skeleton__colors">
                            <span className="skeleton__color-dot" />
                            <span className="skeleton__color-dot" />
                            <span className="skeleton__color-dot" />
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}
