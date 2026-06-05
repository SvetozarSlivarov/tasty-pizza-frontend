import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import "../styles/login.css";

export default function Login() {
    const [form, setForm] = useState({ username: "", password: "" });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const { login, loading } = useAuth();
    const { t } = useLanguage();
    const nav = useNavigate();
    const loc = useLocation();
    const from = loc.state?.from?.pathname || "/";

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const res = await login(form);
        if (res.ok) nav(from, { replace: true });
        else setError(res.message || t("Login failed"));
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>{t("Sign in")}</h2>
                <p className="muted">{t("Welcome back! Please enter your credentials.")}</p>

                <form onSubmit={onSubmit} className="auth-form" noValidate>
                    <label htmlFor="username">{t("Username")}</label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />

                    <label htmlFor="password">{t("Password")}</label>
                    <div className="input-wrap">
                        <input
                            id="password"
                            name="password"
                            type={showPw ? "text" : "password"}
                            required
                            minLength={6}
                            autoComplete="current-password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                        <button
                            type="button"
                            className="pw-toggle"
                            aria-label={showPw ? t("Hide password") : t("Show password")}
                            onClick={() => setShowPw((v) => !v)}
                        >
                            {showPw ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>

                    {error && <p className="error">{error}</p>}

                    <button className="btn primary" type="submit" disabled={loading}>
                        {loading ? t("Signing in...") : t("Sign in")}
                    </button>
                </form>

                <p className="switch">
                    {t("Don't have an account?")} <Link to="/register">{t("Create one")}</Link>
                </p>
            </div>
        </div>
    );
}
