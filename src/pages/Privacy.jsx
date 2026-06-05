import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "../styles/legal.css";

export default function Privacy() {
    const { t } = useLanguage();

    return (
        <main className="legal-page">
            <h1>{t("Privacy Policy")}</h1>
            <p>{t("Last updated")}: {new Date().toISOString().slice(0, 10)}</p>

            <h2>{t("1. Information We Collect")}</h2>
            <p>
                {t("We collect personal details you provide (e.g. during registration or checkout) and technical data such as IP address and cookies.")}
            </p>

            <h2>{t("2. How We Use Information")}</h2>
            <ul>
                <li>{t("To process orders and payments")}</li>
                <li>{t("To maintain your profile and shopping cart")}</li>
                <li>{t("To improve our services and ensure security")}</li>
            </ul>

            <h2>{t("3. Data Sharing")}</h2>
            <p>
                {t("We do not share your personal data with third parties, except when required to fulfill an order or comply with the law.")}
            </p>

            <h2>{t("4. Your Rights")}</h2>
            <p>
                {t("You have the right to access, correct, and request deletion of your data.")}{" "}
                {t("Contact us at")} <a href="mailto:hello@tastypizza.app">hello@tastypizza.app</a>.
            </p>

            <p><Link to="/">{"<-"} {t("Back to Home")}</Link></p>
        </main>
    );
}
