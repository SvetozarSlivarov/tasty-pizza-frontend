import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import "../styles/register.css";

export default function Register() {
    const [form, setForm] = useState({
        fullname: "",
        username: "",
        password: "",
        confirm: "",
    });
    const [showPw, setShowPw] = useState(false);
    const [showPw2, setShowPw2] = useState(false);
    const [error, setError] = useState("");
    const { register, loading } = useAuth();
    const { t } = useLanguage();
    const nav = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password.length < 6) {
            setError(t("Password must be at least 6 characters."));
            return;
        }
        if (form.password !== form.confirm) {
            setError(t("Passwords do not match."));
            return;
        }
        if (form.fullname.trim().length < 6){
            setError(t("Full name must be at least 6 characters."));
            return
        }
        if(form.username.trim().length < 3){
            setError(t("Username must be at least 3 characters."))
        }

        const res = await register({
            fullname: form.fullname.trim(),
            username: form.username.trim(),
            password: form.password,
        });

        if (res.ok) nav("/", { replace: true });
        else setError(res.message || t("Registration failed"));
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>{t("Create account")}</h2>
                <p className="muted">{t("Join us for fast & tasty pizza.")}</p>

                <form onSubmit={onSubmit} className="auth-form" noValidate>
                    <label htmlFor="fullname">{t("Full name")}</label>
                    <input
                        id="fullname"
                        name="fullname"
                        type="text"
                        required
                        autoComplete="name"
                        value={form.fullname}
                        onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                    />

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
                            autoComplete="new-password"
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

                    <label htmlFor="confirm">{t("Confirm password")}</label>
                    <div className="input-wrap">
                        <input
                            id="confirm"
                            name="confirm"
                            type={showPw2 ? "text" : "password"}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={form.confirm}
                            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                        />
                        <button
                            type="button"
                            className="pw-toggle"
                            aria-label={showPw2 ? t("Hide password") : t("Show password")}
                            onClick={() => setShowPw2((v) => !v)}
                        >
                            {showPw2 ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>

                    {error && <p className="error">{error}</p>}

                    <button className="btn primary" type="submit" disabled={loading}>
                        {loading ? t("Creating...") : t("Create account")}
                    </button>
                </form>

                <p className="switch">
                    {t("Already have an account?")} <Link to="/login">{t("Sign in")}</Link>
                </p>
            </div>
        </div>
    );
}
