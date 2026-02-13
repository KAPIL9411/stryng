import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Youtube } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer__grid">
                {/* Brand */}
                <div>
                    <div className="footer__brand">Stryng<span>.</span></div>
                    <p className="footer__about">
                        Curated fashion for the modern individual. We believe in quality, sustainability, and timeless style that transcends seasons.
                    </p>
                    <div className="footer__social">
                        <a href="#" className="footer__social-link" aria-label="Instagram"><Instagram size={18} /></a>
                        <a href="#" className="footer__social-link" aria-label="Twitter"><Twitter size={18} /></a>
                        <a href="#" className="footer__social-link" aria-label="Facebook"><Facebook size={18} /></a>
                        <a href="#" className="footer__social-link" aria-label="YouTube"><Youtube size={18} /></a>
                    </div>
                </div>

                {/* Shop */}
                <div>
                    <h4 className="footer__title">Shop</h4>
                    <nav className="footer__links">
                        <Link to="/products" className="footer__link">New Arrivals</Link>
                        <Link to="/products" className="footer__link">Bestsellers</Link>
                        <Link to="/products" className="footer__link">Shirts</Link>
                        <Link to="/products" className="footer__link">T-Shirts</Link>
                        <Link to="/products" className="footer__link">Trousers</Link>
                        <Link to="/products" className="footer__link">Jackets</Link>
                        <Link to="/products" className="footer__link">Sale</Link>
                    </nav>
                </div>

                {/* Help */}
                <div>
                    <h4 className="footer__title">Help</h4>
                    <nav className="footer__links">
                        <Link to="/" className="footer__link">FAQs</Link>
                        <Link to="/" className="footer__link">Shipping & Delivery</Link>
                        <Link to="/" className="footer__link">Returns & Exchanges</Link>
                        <Link to="/" className="footer__link">Size Guide</Link>
                        <Link to="/" className="footer__link">Track Order</Link>
                        <Link to="/" className="footer__link">Contact Us</Link>
                    </nav>
                </div>

                {/* Company */}
                <div>
                    <h4 className="footer__title">Company</h4>
                    <nav className="footer__links">
                        <Link to="/" className="footer__link">About Us</Link>
                        <Link to="/" className="footer__link">Careers</Link>
                        <Link to="/" className="footer__link">Sustainability</Link>
                        <Link to="/" className="footer__link">Press</Link>
                        <Link to="/" className="footer__link">Privacy Policy</Link>
                        <Link to="/" className="footer__link">Terms of Service</Link>
                    </nav>
                </div>
            </div>

            <div className="footer__bottom">
                © {new Date().getFullYear()} Stryng Clothing. All rights reserved. Designed with ♥ in India.
            </div>
        </footer>
    );
}
