import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import "../styles/legal.css";

export default function Cookies() {
    const { t } = useLanguage();

    return (
        <main className="legal-page">
            <h1>{t("Cookie Policy")}</h1>
            <p>{t("Last updated")}: {new Date().toISOString().slice(0, 10)}</p>

            <h2>{t("1. What Are Cookies")}</h2>
            <p>{t("Cookies are small text files stored on your device to help us provide a better experience.")}</p>

            <h2>{t("2. Cookies We Use")}</h2>
            <ul>
                <li><b>{t("cartId (essential):")}</b> {t("used to maintain your active shopping cart. Removed on logout.")}</li>
                <li><b>{t("tp_token (essential):")}</b> {t("authentication token stored in localStorage.")}</li>
                <li>{t("Optional functional or analytics cookies, if enabled.")}</li>
            </ul>

            <h2>{t("3. Managing Cookies")}</h2>
            <p>{t("You can control and delete cookies through your browser settings. Blocking some cookies may affect the website functionality.")}</p>

            <p><Link to="/">{"<-"} {t("Back to Home")}</Link></p>
        </main>
    );
}
