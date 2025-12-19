import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/auth";
import "../styles/edit-profile-modal.css";
import { redirect } from "react-router-dom";

function EpmModal({ open, title, children, onClose }) {
  if (!open) return null;

  function onBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div className="epm-overlay" onMouseDown={onBackdrop}>
      <div className="epm-dialog" role="dialog" aria-modal="true" aria-label={title}>
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

function normalizeStr(x) {
  return (x ?? "").trim();
}

function EditProfileForm({ initial, onClose, onSaved }) {
  const { updateAuth, logout } = useAuth();

  const initFullname = useMemo(() => normalizeStr(initial?.fullname), [initial]);
  const initUsername = useMemo(() => normalizeStr(initial?.username), [initial]);

  const [form, setForm] = useState({
    fullname: initFullname,
    username: initUsername,

    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    logoutAll: true, // ✅ default recommended
  });

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  const fullname = normalizeStr(form.fullname);
  const username = normalizeStr(form.username);
  const hasNewPassword = !!form.newPassword;
  const mismatch =
    hasNewPassword && form.confirmPassword && form.newPassword !== form.confirmPassword;

  const fullnameChanged = fullname !== initFullname;
  const usernameChanged = username !== initUsername;

  async function forceRelogin() {
    await logout();
    onClose?.();
  }

  function mapError(e2) {
    const code = e2?.data?.code || e2?.data?.error || e2?.message;

    switch (code) {
      case "USERNAME_TAKEN":
      case "username_taken":
        return "This username is already taken.";

      case "BAD_CREDENTIALS":
      case "invalid_credentials":
        return "Current password is wrong.";

      case "invalid_username":
        return "Username is invalid.";

      case "invalid_fullname":
        return "Full name is invalid.";

      case "weak_password":
        return "Password must be at least 6 characters.";

      default:
        return "Failed to update profile.";
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    // Basic validation
    if (!username) return setErr("Username is required.");
    if (!fullname) return setErr("Full name is required.");

    if (hasNewPassword) {
      if (form.newPassword.trim().length < 6) return setErr("Password must be at least 6 characters.");
      if (!form.currentPassword) return setErr("Current password is required to change password.");
      if (form.newPassword !== form.confirmPassword) return setErr("Passwords do not match.");
    }

    if (!fullnameChanged && !usernameChanged && !hasNewPassword) {
      onClose?.();
      return;
    }

    try {
      setSaving(true);

      if (fullnameChanged) {
        const res = await authApi.updateFullName({ fullname });
        const newUser = res?.user ?? res;
        updateAuth({ user: newUser });
        onSaved?.(newUser);
      }

      if (hasNewPassword) {
        await authApi.changePassword({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
          logoutAll: !!form.logoutAll,
        });


        if (form.logoutAll) {
          await forceRelogin();
          return;
        } else {
          try {
            const me = await authApi.me();
            updateAuth({ user: me?.user ?? me });
            onSaved?.(me?.user ?? me);
          } catch {
          }
        }
      }

      if (usernameChanged) {
        await authApi.updateUsername({ username });
        await forceRelogin();
        return;
      }

      onClose?.();
    } catch (e2) {
      setErr(mapError(e2));
    } finally {
      setSaving(false);
    }
  }

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
          disabled={saving}
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
          disabled={saving}
        />
        {usernameChanged && (
          <span className="epm-hint">
            Changing username will log you out.
          </span>
        )}
      </label>

      <hr className="epm-sep" />

      <label className="epm-field">
        <span className="epm-label">Current password</span>
        <input
          className="epm-input"
          type="password"
          name="currentPassword"
          value={form.currentPassword}
          onChange={onChange}
          placeholder={hasNewPassword ? "Required" : "Enter only if changing password"}
          autoComplete="current-password"
          disabled={saving}
        />
      </label>

      <label className="epm-field">
        <span className="epm-label">New password (optional)</span>
        <input
          className={`epm-input ${mismatch ? "epm-input--error" : ""}`}
          type="password"
          name="newPassword"
          value={form.newPassword}
          onChange={onChange}
          placeholder="Leave empty to keep current"
          autoComplete="new-password"
          disabled={saving}
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
          disabled={saving}
        />
        {mismatch && (
          <span className="epm-hint epm-hint--error">
            Passwords do not match.
          </span>
        )}
      </label>

      <label className="epm-field epm-field--row">
        <input
          type="checkbox"
          name="logoutAll"
          checked={!!form.logoutAll}
          onChange={onChange}
          disabled={saving || !hasNewPassword}
        />
        <span className="epm-label" style={{ margin: 0 }}>
          Logout from other devices (recommended)
        </span>
      </label>

      <div className="epm-actions">
        <button type="button" className="epm-btn epm-btn--ghost" onClick={onClose} disabled={saving}>
          Cancel
        </button>

        <button type="submit" className="epm-btn epm-btn--primary" disabled={saving || mismatch}>
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
