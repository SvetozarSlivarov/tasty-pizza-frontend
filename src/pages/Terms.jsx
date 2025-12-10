import { Link } from "react-router-dom";
import "../styles/legal.css";

export default function Terms() {
    return (
        <main className="legal-page">
            <h1>Terms and Conditions</h1>
            <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>

            <h2>1. Acceptance</h2>
            <p>
                By using this website and our services, you agree to these Terms and Conditions.
            </p>

            <h2>2. Orders</h2>
            <p>
                Orders are confirmed once accepted by us. We reserve the right to refuse an
                order in case of stock shortages or inaccurate information.
            </p>

            <h2>3. Prices and Payments</h2>
            <p>
                All prices are listed in the local currency and include VAT unless stated otherwise.
            </p>

            <h2>4. Delivery</h2>
            <p>
                Deliveries are made within the areas and time frames specified. Delivery fees
                are shown before checkout.
            </p>

            <h2>5. Liability</h2>
            <p>
                Our maximum liability is limited to the value of your order. We are not
                responsible for indirect damages.
            </p>

            <p><Link to="/">← Back to Home</Link></p>
        </main>
    );
}
