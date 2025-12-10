import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/auth";
import "../styles/edit-profile-modal.css";

function EpmModal({ open, title, children, onClose }) {
    if (!open) return null;

    function onBackdrop(e) {
        if (e.target === e.currentTarget) onClose?.();
    }

    return (
        <div className="epm-overlay" onMouseDown={onBackdrop}>
            <div
                className="epm-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <header className="epm-header">
                    <h3 className="epm-title">{title}</h3>
                    <button className="epm-close" onClick={onClose} aria-label="Close">
                        ×
                    </button>
                </header>
                <div className="epm-body">{children}</div>
            </div>
        </div>
    );
}

function EditProfileForm({ initial, onClose, onSaved }) {
    const { updateAuth } = useAuth();
    const [form, setForm] = useState({
        fullname: initial?.fullname || "",
        username: initial?.username || "",
        password: "",
        confirmPassword: "",
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");

    function onChange(e) {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    }

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");

        const fullname = form.fullname.trim();
        const username = form.username.trim();
        const password = form.password.trim();

        if (!username) return setErr("Username is required.");
        if (!fullname) return setErr("Full name is required.");
        if (password && password.length < 6)
            return setErr("Password must be at least 6 characters.");
        if (password && password !== form.confirmPassword)
            return setErr("Passwords do not match.");

        try {
            setSaving(true);
            const payload = {
                fullname,
                username,
                password: password || undefined,
            };

            const res = await authApi.updateMe(payload);
            const newUser = res?.user ?? res;

            updateAuth({ user: newUser });
            onSaved?.(newUser);
            onClose?.();
        } catch (e2) {
            const serverErr =
                e2?.data?.error || e2?.message || "Failed to update profile.";
            switch (serverErr) {
                case "username_taken":
                    setErr("This username is already taken.");
                    break;
                case "invalid_username":
                    setErr("Username is invalid.");
                    break;
                case "invalid_fullname":
                    setErr("Full name is invalid.");
                    break;
                case "weak_password":
                    setErr("Password must be at least 6 characters.");
                    break;
                default:
                    setErr("Failed to update profile.");
            }
        } finally {
            setSaving(false);
        }
    }

    const mismatch =
        form.password && form.confirmPassword && form.password !== form.confirmPassword;

    return (
        <form className="epm-form" onSubmit={onSubmit}>
            {err && <p className="epm-alert epm-alert--error">{err}</p>}

            <label className="epm-field">
                <span className="epm-label">Full name</span>
                <input
                    className="epm-input"
                    name="fullname"
                    value={form.fullname}
                    onChange={onChange}
                    autoComplete="name"
                    required
                />
            </label>

            <label className="epm-field">
                <span className="epm-label">Username</span>
                <input
                    className="epm-input"
                    name="username"
                    value={form.username}
                    onChange={onChange}
                    autoComplete="username"
                    required
                />
            </label>

            <label className="epm-field">
                <span className="epm-label">New password (optional)</span>
                <input
                    className={`epm-input ${mismatch ? "epm-input--error" : ""}`}
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder="Leave empty to keep current"
                    autoComplete="new-password"
                />
            </label>

            <label className="epm-field">
                <span className="epm-label">Confirm new password</span>
                <input
                    className={`epm-input ${mismatch ? "epm-input--error" : ""}`}
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={onChange}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                />
                {mismatch && (
                    <span className="epm-hint epm-hint--error">
            Passwords do not match.
          </span>
                )}
            </label>

            <div className="epm-actions">
                <button
                    type="button"
                    className="epm-btn epm-btn--ghost"
                    onClick={onClose}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="epm-btn epm-btn--primary"
                    disabled={saving}
                >
                    {saving ? "Saving…" : "Save changes"}
                </button>
            </div>
        </form>
    );
}

export default function EditProfileModal({ open, onClose, initial, onSaved }) {
    return (
        <EpmModal open={open} title="Edit Profile" onClose={onClose}>
            <EditProfileForm initial={initial} onClose={onClose} onSaved={onSaved} />
        </EpmModal>
    );
}
