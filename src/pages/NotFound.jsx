import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import "../styles/notFound.css";

export default function NotFound() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const auth = useAuth?.();
  const isAdmin = auth?.user?.role === "ADMIN";

  return (
    <section className="not-found-page">
      <div className="not-found-scene" aria-hidden="true">
        <div className="not-found-plate">
          <div className="not-found-slice slice-one">
            <span />
            <span />
            <span />
          </div>
          <div className="not-found-slice slice-two">
            <span />
            <span />
          </div>
        </div>
        <div className="not-found-ticket">404</div>
      </div>

      <div className="not-found-content">
        <p className="not-found-eyebrow">{t("Lost pizza ticket")}</p>
        <h1>{t("This page slipped out of the oven.")}</h1>
        <p>
          {t("We checked the kitchen, the menu, and the delivery bag, but this address is not here.")}
        </p>
        <code className="not-found-path">{pathname}</code>

        <div className="not-found-actions">
          <Link className="not-found-btn primary" to="/menu">
            {t("Open menu")}
          </Link>
          <Link className="not-found-btn" to="/">
            {t("Back to Home")}
          </Link>
          {isAdmin ? (
            <Link className="not-found-btn" to="/admin">
              {t("Admin dashboard")}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
