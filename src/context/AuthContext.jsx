import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [booted, setBooted] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setUser(await authApi.me());
            } catch {
                setUser(null);
            } finally {
                setBooted(true);
            }
        })();
    }, []);

    async function login(values) {
        setLoading(true);
        try {
            await authApi.login(values);
            setUser(await authApi.me());
            return { ok: true };
        } catch (e) {
            const msg =
                e.data?.error === "invalid_credentials"
                    ? "Invalid username or password"
                    : e.message || "Login failed";
            return { ok: false, message: msg };
        } finally {
            setLoading(false);
        }
    }

    async function register(values) {
        setLoading(true);
        try {
            await authApi.register(values);
            setUser(await authApi.me());
            return { ok: true };
        } catch (e) {
            const msg =
                e.data?.error === "username_exists"
                    ? "Username already taken"
                    : e.message || "Registration failed";
            return { ok: false, message: msg };
        } finally {
            setLoading(false);
        }
    }

    async function logout() {
        await authApi.logout();
        setUser(null);
        try { window.dispatchEvent(new Event("cart:refresh")); } catch {}
    }

    function updateAuth({ user }) {
        if (user) setUser(user);
    }

    const value = useMemo(
        () => ({ user, loading, login, register, logout, booted, setUser, updateAuth }),
        [user, loading, booted]
    );

    return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};