import { useMemo, useState } from "react";
import { FiEye, FiEyeOff, FiLock, FiShield, FiUser } from "react-icons/fi";
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
      <div className="epm-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header className="epm-header">
          <h3 className="epm-title">{title}</h3>
          <button className="epm-close" onClick={onClose} aria-label="Close">
            x
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

function initials(fullname, username) {
  const source = normalizeStr(fullname) || normalizeStr(username);
  if (!source) return "U";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function passwordScore(password) {
  if (!password) return { score: 0, label: "No password change" };

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: "Weak" };
  if (score <= 3) return { score, label: "Good" };
  return { score, label: "Strong" };
}

function PasswordInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  invalid,
  visible,
  onToggle,
}) {
  return (
    <label className="epm-field">
      <span className="epm-label">{label}</span>
      <div className="epm-password">
        <input
          className={`epm-input ${invalid ? "epm-input--error" : ""}`}
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          disabled={disabled}
        >
          {visible ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
        </button>
      </div>
    </label>
  );
}

function EditProfileForm({ initial, onClose, onSaved }) {
  const { updateAuth, logout } = useAuth();

  const initFullname = useMemo(() => normalizeStr(initial?.fullname), [initial]);
  const initUsername = useMemo(() => normalizeStr(initial?.username), [initial]);

  const [tab, setTab] = useState("account");
  const [form, setForm] = useState({
    fullname: initFullname,
    username: initUsername,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    logoutAll: true,
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function togglePassword(name) {
    setShowPassword((current) => ({ ...current, [name]: !current[name] }));
  }

  const fullname = normalizeStr(form.fullname);
  const username = normalizeStr(form.username);
  const hasNewPassword = !!form.newPassword;
  const mismatch = hasNewPassword && form.confirmPassword && form.newPassword !== form.confirmPassword;
  const strength = passwordScore(form.newPassword);

  const fullnameChanged = fullname !== initFullname;
  const usernameChanged = username !== initUsername;
  const hasChanges = fullnameChanged || usernameChanged || hasNewPassword;

  async function forceRelogin() {
    await logout();
    onClose?.();
  }

  function mapError(e) {
    const code = e?.data?.code || e?.data?.error || e?.message;

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

    if (!username) return setErr("Username is required.");
    if (!fullname) return setErr("Full name is required.");

    if (hasNewPassword) {
      if (form.newPassword.trim().length < 6) return setErr("Password must be at least 6 characters.");
      if (!form.currentPassword) return setErr("Current password is required to change password.");
      if (form.newPassword !== form.confirmPassword) return setErr("Passwords do not match.");
    }

    if (!hasChanges) {
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
        }

        try {
          const me = await authApi.me();
          updateAuth({ user: me?.user ?? me });
          onSaved?.(me?.user ?? me);
        } catch {}
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

      <section className="epm-preview" aria-label="Profile preview">
        <div className="epm-avatar">{initials(fullname, username)}</div>
        <div>
          <div className="epm-preview-name">{fullname || "Full name"}</div>
          <div className="epm-preview-user">@{username || "username"}</div>
        </div>
      </section>

      <div className="epm-tabs" role="tablist" aria-label="Profile editing sections">
        <button type="button" className={tab === "account" ? "active" : ""} onClick={() => setTab("account")}>
          <FiUser aria-hidden="true" />
          Account
        </button>
        <button type="button" className={tab === "security" ? "active" : ""} onClick={() => setTab("security")}>
          <FiLock aria-hidden="true" />
          Security
        </button>
      </div>

      {tab === "account" && (
        <div className="epm-panel">
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
              <span className="epm-hint">Changing username will log you out after saving.</span>
            )}
          </label>
        </div>
      )}

      {tab === "security" && (
        <div className="epm-panel">
          <PasswordInput
            label="Current password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={onChange}
            placeholder={hasNewPassword ? "Required" : "Enter only if changing password"}
            autoComplete="current-password"
            disabled={saving}
            visible={showPassword.currentPassword}
            onToggle={() => togglePassword("currentPassword")}
          />

          <PasswordInput
            label="New password"
            name="newPassword"
            value={form.newPassword}
            onChange={onChange}
            placeholder="Leave empty to keep current"
            autoComplete="new-password"
            disabled={saving}
            invalid={mismatch}
            visible={showPassword.newPassword}
            onToggle={() => togglePassword("newPassword")}
          />

          <div className="epm-strength" data-score={strength.score}>
            <div>
              <span />
            </div>
            <strong>{strength.label}</strong>
          </div>

          <PasswordInput
            label="Confirm new password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={onChange}
            placeholder="Repeat new password"
            autoComplete="new-password"
            disabled={saving}
            invalid={mismatch}
            visible={showPassword.confirmPassword}
            onToggle={() => togglePassword("confirmPassword")}
          />

          {mismatch && <span className="epm-hint epm-hint--error">Passwords do not match.</span>}

          <label className="epm-check">
            <input
              type="checkbox"
              name="logoutAll"
              checked={!!form.logoutAll}
              onChange={onChange}
              disabled={saving || !hasNewPassword}
            />
            <span>
              <FiShield aria-hidden="true" />
              Logout from other devices
            </span>
          </label>
        </div>
      )}

      <div className="epm-actions">
        <div className="epm-status">{hasChanges ? "Unsaved changes" : "No changes yet"}</div>
        <button type="button" className="epm-btn epm-btn--ghost" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="epm-btn epm-btn--primary" disabled={saving || mismatch || !hasChanges}>
          {saving ? "Saving..." : "Save changes"}
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
