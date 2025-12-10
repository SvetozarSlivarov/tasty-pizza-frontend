import { Link } from "react-router-dom";
import "../styles/legal.css";

export default function Privacy() {
    return (
        <main className="legal-page">
            <h1>Privacy Policy</h1>
            <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>

            <h2>1. Information We Collect</h2>
            <p>
                We collect personal details you provide (e.g. during registration or checkout)
                and technical data such as IP address and cookies.
            </p>

            <h2>2. How We Use Information</h2>
            <ul>
                <li>To process orders and payments</li>
                <li>To maintain your profile and shopping cart</li>
                <li>To improve our services and ensure security</li>
            </ul>

            <h2>3. Data Sharing</h2>
            <p>
                We do not share your personal data with third parties, except when required
                to fulfill an order or comply with the law.
            </p>

            <h2>4. Your Rights</h2>
            <p>
                You have the right to access, correct, and request deletion of your data.
                Contact us at <a href="mailto:hello@tastypizza.app">hello@tastypizza.app</a>.
            </p>

            <p><Link to="/">← Back to Home</Link></p>
        </main>
    );
}
