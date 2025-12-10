import {useEffect, useState} from "react";
import { useAuth } from "../context/AuthContext";
import {NavLink, Link, useLocation, useNavigate} from "react-router-dom";
import "../styles/navbar.css";


const Burger = ({ open }) => (
    <div className={`burger ${open ? "open" : ""}`} aria-hidden>
        <span></span><span></span><span></span>
    </div>
);


export default function Navbar() {
    const [open, setOpen] = useState(false);
    const { user, logout } = useAuth();

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

    const isAdmin =
        Array.isArray(user?.roles) ? user.roles.includes("ADMIN") :
            (user?.role === "ADMIN" || user?.role === "Admin");

    const navClass = ({ isActive }) => (isActive ? "active" : undefined);

    const handleSignOut = async () => {
        await logout();
        setOpen(false);
        nav("/", { replace: true });
    };

    return (
        <>
            <header className="nav-wrap">
                <div className="nav">
                    <Link to="/" className="brand" onClick={closeMenu}>
                        <div className="logo">🍕</div>
                        <span>Tasty <b>Pizza</b></span>
                    </Link>

                    <nav className={`links ${open ? "show" : ""}`}>
                        <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
                        <NavLink to="/menu" onClick={closeMenu}>Menu</NavLink>
                        {!user ? (
                            <NavLink to="/login" className={navClass}>Sign in</NavLink>
                        ) : (
                            <>
                                <NavLink to="/profile" className={navClass}>Profile</NavLink>
                                {isAdmin && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
                                <button
                                    className="nav-bar-logout-btn"
                                    type="button"
                                    onClick={handleSignOut}
                                    aria-label="Sign out"
                                >
                                    <svg className="ic" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        <polyline points="16 17 21 12 16 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                    <span className="txt">Sign out</span>
                                </button>
                            </>
                        )}
                    </nav>

                    <button
                        className="hamburger"
                        aria-label="Toggle menu"
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
