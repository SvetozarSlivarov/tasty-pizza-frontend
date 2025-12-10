import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export default function Login() {
    const [form, setForm] = useState({ username: "", password: "" });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const { login, loading } = useAuth();
    const nav = useNavigate();
    const loc = useLocation();
    const from = loc.state?.from?.pathname || "/";

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const res = await login(form);
        if (res.ok) nav(from, { replace: true });
        else setError(res.message || "Login failed");
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2>Sign in</h2>
                <p className="muted">Welcome back! Please enter your credentials.</p>

                <form onSubmit={onSubmit} className="auth-form" noValidate>
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />

                    <label htmlFor="password">Password</label>
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
                            aria-label={showPw ? "Hide password" : "Show password"}
                            onClick={() => setShowPw((v) => !v)}
                        >
                            {showPw ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>

                    {error && <p className="error">{error}</p>}

                    <button className="btn primary" type="submit" disabled={loading}>
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="switch">
                    Don't have an account? <Link to="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
}
