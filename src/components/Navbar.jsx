import {useEffect, useRef, useState} from "react";
import { useAuth } from "../context/AuthContext";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, useLanguage } from "../context/LanguageContext";
import {NavLink, Link, useLocation, useNavigate} from "react-router-dom";
import "../styles/navbar.css";


const Burger = ({ open }) => (
    <div className={`burger ${open ? "open" : ""}`} aria-hidden>
        <span></span><span></span><span></span>
    </div>
);


export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [languageOpen, setLanguageOpen] = useState(false);
    const languageRef = useRef(null);
    const { user, logout } = useAuth();
    const { language, setLanguage, t } = useLanguage();

    const loc = useLocation();
    const nav = useNavigate();
    const closeMenu = () => setOpen(false);

    useEffect(() => { setOpen(false); }, [loc.pathname]);
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    }, [open]);
    useEffect(() => {
        const onPointerDown = (e) => {
            if (!languageRef.current?.contains(e.target)) setLanguageOpen(false);
        };
        const onKey = (e) => e.key === "Escape" && setLanguageOpen(false);
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    const isAdmin =
        Array.isArray(user?.roles) ? user.roles.includes("ADMIN") :
            (user?.role === "ADMIN" || user?.role === "Admin");

    const navClass = ({ isActive }) => (isActive ? "active" : undefined);

    const handleSignOut = async () => {
        await logout();
        setOpen(false);
        nav("/", { replace: true });
    };

    const selectLanguage = (nextLanguage) => {
        setLanguage(nextLanguage);
        setLanguageOpen(false);
        setOpen(false);
    };

    const languageSwitcher = (
        <div className="language-switcher" ref={languageRef}>
            <button
                type="button"
                className={`language-trigger ${languageOpen ? "open" : ""}`}
                onClick={() => setLanguageOpen((value) => !value)}
                aria-label={t("Language")}
                aria-haspopup="listbox"
                aria-expanded={languageOpen}
            >
                <svg className="language-globe" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18" />
                    <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21" />
                    <path d="M12 3C9.6 5.5 8.4 8.5 8.4 12S9.6 18.5 12 21" />
                </svg>
                <span className="language-code">{language.toUpperCase()}</span>
                <svg className="language-chevron" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.5 7.5 10 12l4.5-4.5" />
                </svg>
            </button>

            {languageOpen && (
                <div className="language-menu" role="listbox" aria-label={t("Language")}>
                    {SUPPORTED_LANGUAGES.map((lang) => {
                        const active = lang === language;
                        return (
                            <button
                                key={lang}
                                type="button"
                                className={`language-option ${active ? "active" : ""}`}
                                onClick={() => selectLanguage(lang)}
                                role="option"
                                aria-selected={active}
                            >
                                <span className="language-option-code">{lang.toUpperCase()}</span>
                                <span className="language-option-label">{LANGUAGE_LABELS[lang] || lang.toUpperCase()}</span>
                                {active && (
                                    <svg className="language-check" viewBox="0 0 20 20" aria-hidden="true">
                                        <path d="m5 10 3 3 7-7" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return (
        <>
            <header className="nav-wrap">
                <div className="nav">
                    <Link to="/" className="brand" onClick={closeMenu}>
                        <div className="logo">🍕</div>
                        <span>Tasty <b>Pizza</b></span>
                    </Link>

                    <nav className={`links ${open ? "show" : ""}`}>
                        <NavLink to="/" end onClick={closeMenu}>{t("Home")}</NavLink>
                        <NavLink to="/menu" onClick={closeMenu}>{t("Menu")}</NavLink>
                        {!user ? (
                            <>
                                <NavLink to="/login" className={navClass}>{t("Sign in")}</NavLink>
                                {languageSwitcher}
                            </>
                        ) : (
                            <>
                                <NavLink to="/profile" className={navClass}>{t("Profile")}</NavLink>
                                {isAdmin && <NavLink to="/admin" className={navClass}>{t("Admin")}</NavLink>}
                                {languageSwitcher}
                                <button
                                    className="nav-bar-logout-btn"
                                    type="button"
                                    onClick={handleSignOut}
                                    aria-label={t("Sign out")}
                                >
                                    <svg className="ic" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        <polyline points="16 17 21 12 16 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                    <span className="txt">{t("Sign out")}</span>
                                </button>
                            </>
                        )}
                    </nav>

                    <button
                        className="hamburger"
                        aria-label={t("Toggle menu")}
                        aria-expanded={open}
                        onClick={() => setOpen(v => !v)}
                    >
                        <Burger open={open} />
                    </button>
                </div>
            </header>

            <div style={{ height: "76px" }} />
        </>
    );
}
