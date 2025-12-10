import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function WaitBoot({ children }) {
    const { booted } = useAuth();
    if (!booted) return null;
    return children;
}

export function RequireAuth() {
    const { user } = useAuth();
    const loc = useLocation();
    return (
        <WaitBoot>
            {user ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc }} />}
        </WaitBoot>
    );
}

export function GuestOnly() {
    const { user } = useAuth();
    return <WaitBoot>{!user ? <Outlet /> : <Navigate to="/" replace />}</WaitBoot>;
}

export function RequireAdmin() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    return <WaitBoot>{isAdmin ? <Outlet /> : <Navigate to="/" replace />}</WaitBoot>;
}
