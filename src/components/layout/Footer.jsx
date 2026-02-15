import { Link } from 'react-router-dom';
import {
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      {/* Main Footer Content */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            {/* Brand Column */}
            <div className="footer-column footer-column--brand">
              <Link to="/" className="footer-logo">
                <img
                  src="/images/logo2.webp"
                  alt="Stryng"
                  className="footer-logo__img"
                />
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
                  <Instagram size={18} />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social__link"
                  aria-label="Twitter"
                >
                  <Twitter size={18} />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social__link"
                  aria-label="Facebook"
                >
                  <Facebook size={18} />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-social__link"
                  aria-label="YouTube"
                >
                  <Youtube size={18} />
                </a>
              </div>
            </div>

            {/* Shop Column */}
            <div className="footer-column">
              <h4 className="footer-column__title">Shop</h4>
              <nav className="footer-links">
                <Link to="/products?category=t-shirts" className="footer-link">
                  T-Shirts
                </Link>
                <Link to="/products?category=shirts" className="footer-link">
                  Shirts
                </Link>
                <Link to="/products?category=trousers" className="footer-link">
                  Trousers
                </Link>
                <Link to="/products?category=jackets" className="footer-link">
                  Jackets
                </Link>
                <Link to="/products" className="footer-link">
                  New Arrivals
                </Link>
                <Link to="/products" className="footer-link">
                  Best Sellers
                </Link>
              </nav>
            </div>

            {/* Customer Service Column */}
            <div className="footer-column">
              <h4 className="footer-column__title">Customer Service</h4>
              <nav className="footer-links">
                <Link to="/account" className="footer-link">
                  My Account
                </Link>
                <Link to="/order-tracking" className="footer-link">
                  Track Order
                </Link>
                <Link to="/wishlist" className="footer-link">
                  Wishlist
                </Link>
                <a href="#size-guide" className="footer-link">
                  Size Guide
                </a>
                <a href="#shipping" className="footer-link">
                  Shipping Info
                </a>
                <a href="#returns" className="footer-link">
                  Returns & Exchanges
                </a>
              </nav>
            </div>

            {/* Contact Column */}
            <div className="footer-column">
              <h4 className="footer-column__title">Contact Us</h4>
              <div className="footer-contact">
                <a
                  href="mailto:support@stryng.com"
                  className="footer-contact__item"
                >
                  <Mail size={16} />
                  <span>stryngclothing@gmail.com</span>
                </a>
                <a href="tel:+911234567890" className="footer-contact__item">
                  <Phone size={16} />
                  <span>+91 9411867984</span>
                </a>
                <div className="footer-contact__item">
                  <MapPin size={16} />
                  <span>Bareilly, Uttar Pradesh, India</span>
                </div>
              </div>
              <p className="footer-hours">
                Mon - Sat: 9 AM - 8 PM
                <br />
                Sunday: 10 AM - 6 PM
              </p>
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
              <a href="#privacy" className="footer-bottom__link">
                Privacy Policy
              </a>
              <a href="#terms" className="footer-bottom__link">
                Terms of Service
              </a>
              <a href="#cookies" className="footer-bottom__link">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
