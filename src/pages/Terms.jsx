import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "../styles/legal.css";

export default function Terms() {
    const { t } = useLanguage();

    return (
        <main className="legal-page">
            <h1>{t("Terms and Conditions")}</h1>
            <p>{t("Last updated")}: {new Date().toISOString().slice(0, 10)}</p>

            <h2>{t("1. Acceptance")}</h2>
            <p>{t("By using this website and our services, you agree to these Terms and Conditions.")}</p>

            <h2>{t("2. Orders")}</h2>
            <p>
                {t("Orders are confirmed once accepted by us. We reserve the right to refuse an order in case of stock shortages or inaccurate information.")}
            </p>

            <h2>{t("3. Prices and Payments")}</h2>
            <p>{t("All prices are listed in the local currency and include VAT unless stated otherwise.")}</p>

            <h2>{t("4. Delivery")}</h2>
            <p>{t("Deliveries are made within the areas and time frames specified. Delivery fees are shown before checkout.")}</p>

            <h2>{t("5. Liability")}</h2>
            <p>
                {t("Our maximum liability is limited to the value of your order. We are not responsible for indirect damages.")}
            </p>

            <p><Link to="/">{"<-"} {t("Back to Home")}</Link></p>
        </main>
    );
}
