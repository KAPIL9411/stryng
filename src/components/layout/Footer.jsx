import { Link } from 'react-router-dom';
import { 
    Instagram, 
    Twitter, 
    Facebook, 
    Youtube, 
    Phone, 
    MapPin,
    Heart,
    CreditCard,
    Truck,
    Shield,
    ArrowRight,
    Sparkles,
    Zap,
    TrendingUp
} from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer-new">
            {/* Gen Z Hero Section */}
            <div className="footer-hero">
                <div className="container">
                    <div className="footer-hero__content">
                        <div className="footer-hero__badge">
                            <Sparkles size={16} />
                            <span>Your Vibe, Your Style</span>
                        </div>
                        <h2 className="footer-hero__title">
                            Fits That Hit Different 🔥
                        </h2>
                        <p className="footer-hero__subtitle">
                            No cap, we're serving looks that'll have everyone asking "where'd you get that?" 
                            Fresh drops, unmatched quality, and vibes that just get you.
                        </p>
                        <div className="footer-hero__stats">
                            <div className="footer-hero__stat">
                                <TrendingUp size={20} />
                                <div>
                                    <strong>10K+</strong>
                                    <span>Happy Customers</span>
                                </div>
                            </div>
                            <div className="footer-hero__stat">
                                <Zap size={20} />
                                <div>
                                    <strong>24/7</strong>
                                    <span>Fast Delivery</span>
                                </div>
                            </div>
                            <div className="footer-hero__stat">
                                <Sparkles size={20} />
                                <div>
                                    <strong>100%</strong>
                                    <span>Authentic Drip</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Footer Content */}
            <div className="footer-main">
                <div className="container">
                    <div className="footer-grid">
                        {/* Brand Column */}
                        <div className="footer-column footer-column--brand">
                            <Link to="/" className="footer-logo">
                                <img src="/images/logo2.webp" alt="Stryng" className="footer-logo__img" />
                            </Link>
                            <p className="footer-description">
                                Premium streetwear and fashion for the modern individual. 
                                Quality craftsmanship meets contemporary style.
                            </p>
                            
                            {/* Social Links */}
                            <div className="footer-social">
                                <a 
                                    href="https://instagram.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="footer-social__link"
                                    aria-label="Instagram"
                                >
                                    <Instagram size={20} />
                                </a>
                                <a 
                                    href="https://twitter.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="footer-social__link"
                                    aria-label="Twitter"
                                >
                                    <Twitter size={20} />
                                </a>
                                <a 
                                    href="https://facebook.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="footer-social__link"
                                    aria-label="Facebook"
                                >
                                    <Facebook size={20} />
                                </a>
                                <a 
                                    href="https://youtube.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="footer-social__link"
                                    aria-label="YouTube"
                                >
                                    <Youtube size={20} />
                                </a>
                            </div>
                        </div>

                        {/* Shop Column */}
                        <div className="footer-column">
                            <h4 className="footer-column__title">Shop</h4>
                            <nav className="footer-links">
                                <Link to="/products?category=t-shirts" className="footer-link">
                                    <ArrowRight size={14} />
                                    T-Shirts
                                </Link>
                                <Link to="/products?category=shirts" className="footer-link">
                                    <ArrowRight size={14} />
                                    Shirts
                                </Link>
                                <Link to="/products?category=trousers" className="footer-link">
                                    <ArrowRight size={14} />
                                    Trousers
                                </Link>
                                <Link to="/products?category=jackets" className="footer-link">
                                    <ArrowRight size={14} />
                                    Jackets
                                </Link>
                                <Link to="/products" className="footer-link">
                                    <ArrowRight size={14} />
                                    New Arrivals
                                </Link>
                                <Link to="/products" className="footer-link">
                                    <ArrowRight size={14} />
                                    Best Sellers
                                </Link>
                            </nav>
                        </div>

                        {/* Customer Service Column */}
                        <div className="footer-column">
                            <h4 className="footer-column__title">Customer Service</h4>
                            <nav className="footer-links">
                                <Link to="/account" className="footer-link">
                                    <ArrowRight size={14} />
                                    My Account
                                </Link>
                                <Link to="/cart" className="footer-link">
                                    <ArrowRight size={14} />
                                    Shopping Cart
                                </Link>
                                <Link to="/wishlist" className="footer-link">
                                    <ArrowRight size={14} />
                                    Wishlist
                                </Link>
                                <a href="#track-order" className="footer-link">
                                    <ArrowRight size={14} />
                                    Track Order
                                </a>
                                <a href="#size-guide" className="footer-link">
                                    <ArrowRight size={14} />
                                    Size Guide
                                </a>
                                <a href="#returns" className="footer-link">
                                    <ArrowRight size={14} />
                                    Returns & Exchanges
                                </a>
                            </nav>
                        </div>

                        {/* Contact Column */}
                        <div className="footer-column">
                            <h4 className="footer-column__title">Get In Touch</h4>
                            <div className="footer-contact">
                                <a href="tel:+911234567890" className="footer-contact__item">
                                    <Phone size={18} />
                                    <span>+91 123 456 7890</span>
                                </a>
                                <a href="mailto:support@stryng.com" className="footer-contact__item">
                                    <Phone size={18} />
                                    <span>support@stryng.com</span>
                                </a>
                                <div className="footer-contact__item">
                                    <MapPin size={18} />
                                    <span>Mumbai, Maharashtra, India</span>
                                </div>
                            </div>

                            {/* Business Hours */}
                            <div className="footer-hours">
                                <h5 className="footer-hours__title">Business Hours</h5>
                                <p className="footer-hours__text">Mon - Sat: 9:00 AM - 8:00 PM</p>
                                <p className="footer-hours__text">Sunday: 10:00 AM - 6:00 PM</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trust Badges */}
            <div className="footer-trust">
                <div className="container">
                    <div className="footer-trust__grid">
                        <div className="footer-trust__item">
                            <Truck size={24} />
                            <div>
                                <h5>Free Shipping</h5>
                                <p>On orders above ₹999</p>
                            </div>
                        </div>
                        <div className="footer-trust__item">
                            <Shield size={24} />
                            <div>
                                <h5>Secure Payment</h5>
                                <p>100% secure transactions</p>
                            </div>
                        </div>
                        <div className="footer-trust__item">
                            <Heart size={24} />
                            <div>
                                <h5>Easy Returns</h5>
                                <p>15-day return policy</p>
                            </div>
                        </div>
                        <div className="footer-trust__item">
                            <CreditCard size={24} />
                            <div>
                                <h5>Multiple Payments</h5>
                                <p>UPI, Cards, COD accepted</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="footer-bottom">
                <div className="container">
                    <div className="footer-bottom__content">
                        <p className="footer-bottom__text">
                            © {currentYear} Stryng Clothing. All rights reserved.
                        </p>
                        <div className="footer-bottom__links">
                            <a href="#privacy" className="footer-bottom__link">Privacy Policy</a>
                            <span className="footer-bottom__separator">•</span>
                            <a href="#terms" className="footer-bottom__link">Terms of Service</a>
                            <span className="footer-bottom__separator">•</span>
                            <a href="#cookies" className="footer-bottom__link">Cookie Policy</a>
                        </div>
                        <p className="footer-bottom__credit">
                            Made with <Heart size={14} className="footer-bottom__heart" /> in India
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
