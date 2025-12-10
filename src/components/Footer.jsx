import { Link } from "react-router-dom";
import "../styles/footer.css";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <div className="footer-container">
                <div className="footer-col brand">
                    <Link to="/" className="footer-logo">
                        <span className="logo-dot">🍕</span>
                        <span className="logo-text">Tasty <b>Pizza</b></span>
                    </Link>
                    <p className="tagline">
                        Hand-tossed dough, premium ingredients, stone-baked perfection.
                    </p>
                </div>

                <nav className="footer-col">
                    <h4>Explore</h4>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/menu">Menu</Link></li>
                        <li><Link to="/login">Sign in</Link></li>
                    </ul>
                </nav>

                <div className="footer-col">
                    <h4>Contact</h4>
                    <ul className="contact">
                        <li><a href="tel:+359000000000">+359 00 000 000</a></li>
                        <li><a href="mailto:hello@tastypizza.app">hello@tastypizza.app</a></li>
                        <li>Mon–Sun: 10:00–23:00</li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Follow us</h4>
                    <div className="social">
                        <a aria-label="Instagram" href="#" rel="noreferrer">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><circle cx="17.5" cy="6.5" r="1.2"/></svg>
                        </a>
                        <a aria-label="Facebook" href="#" rel="noreferrer">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M22 12.06C22 6.49 17.52 2 11.94 2 6.37 2 1.88 6.49 1.88 12.06c0 5.03 3.68 9.21 8.48 9.96v-7.04H7.9v-2.92h2.46V9.41c0-2.43 1.45-3.77 3.67-3.77 1.06 0 2.16.19 2.16.19v2.38h-1.22c-1.2 0-1.58.74-1.58 1.5v1.8h2.69l-.43 2.92h-2.26V22c4.8-.75 8.48-4.93 8.48-9.96Z"/></svg>
                        </a>
                        <a aria-label="X / Twitter" href="#" rel="noreferrer">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18.244 2H21l-6.56 7.49L22 22h-6.828l-4.9-6.41L4.6 22H2l7.07-8.08L2 2h6.914l4.51 5.93L18.244 2Zm-2.39 18h2.004L8.226 4H6.11l9.745 16Z"/></svg>
                        </a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>© {year} Tasty Pizza • All rights reserved</p>
                <div className="legal">
                    <Link to="/privacy">Privacy</Link>
                    <span>•</span>
                    <Link to="/terms">Terms</Link>
                    <span>•</span>
                    <Link to="/cookies">Cookies</Link>
                </div>
            </div>

        </footer>
    );
}
