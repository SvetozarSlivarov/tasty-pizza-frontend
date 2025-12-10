import { Link } from "react-router-dom";
import "../styles/legal.css";

export default function Cookies() {
    return (
        <main className="legal-page">
            <h1>Cookie Policy</h1>
            <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>

            <h2>1. What Are Cookies</h2>
            <p>
                Cookies are small text files stored on your device to help us provide a
                better experience.
            </p>

            <h2>2. Cookies We Use</h2>
            <ul>
                <li><b>cartId (essential):</b> used to maintain your active shopping cart. Removed on logout.</li>
                <li><b>tp_token (essential):</b> authentication token stored in localStorage.</li>
                <li>Optional functional or analytics cookies, if enabled.</li>
            </ul>

            <h2>3. Managing Cookies</h2>
            <p>
                You can control and delete cookies through your browser settings. Blocking
                some cookies may affect the website functionality.
            </p>

            <p><Link to="/">← Back to Home</Link></p>
        </main>
    );
}
