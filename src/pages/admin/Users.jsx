import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin";
import styles from "../../styles/adminUsers.module.css";

const ROLE_OPTIONS = ["ADMIN", "CUSTOMER"];

function RoleBadge({ role }) {
    const cls = role === "ADMIN" ? styles.badgeAdmin : styles.badgeCustomer;
    return <span className={`${styles.badge} ${cls}`}>{role}</span>;
}

function Avatar({ username = "?" }) {
    const initials = (username[0] || "?").toUpperCase();
    return <span className={styles.avatar}>{initials}</span>;
}

export default function UsersAdmin() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [size] = useState(50);
    const [q, setQ] = useState("");
    const [saving, setSaving] = useState({});
    const [status, setStatus] = useState("");

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.listUsers(page, size, q);
            if (Array.isArray(data)) {
                setRows(data);
            } else if (data && Array.isArray(data.items)) {
                setRows(data.items);
            } else {
                setRows([]);
            }
        } catch (e) {
            setError(e?.message || "Failed to load users");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load();}, [page, size]);

    const clientFiltered = useMemo(() => {
        const term = q.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((u) =>
            (u.username || "").toLowerCase().includes(term) ||
            (u.fullname || "").toLowerCase().includes(term) ||
            String(u.id).includes(term)
        );
    }, [rows, q]);

    async function changeRole(user, newRole) {
        try {
            setSaving((s) => ({ ...s, [user.id]: true }));
            setStatus("");
            if (user.username) {
                await adminApi.updateUserRoleByUsername(user.username, newRole);
            } else {
                await adminApi.updateUserRoleById(user.id, newRole);
            }
            setRows((r) => r.map((x) => (x.id === user.id ? { ...x, role: newRole } : x)));
            setStatus(`Updated role for ${user.username ?? "#" + user.id} → ${newRole}`);
        } catch (e) {
            alert(e?.message || "Failed to update role");
        } finally {
            setSaving((s) => ({ ...s, [user.id]: false }));
        }
    }

    async function deleteUser(user) {
        if (!window.confirm(`Delete user ${user.username ?? ("#" + user.id)}? This cannot be undone.`)) return;
        try {
            setSaving((s) => ({ ...s, [user.id]: true }));
            if (user.username) {
                await adminApi.deleteUserByUsername(user.username);
            } else {
                await adminApi.deleteUserById(user.id);
            }
            setRows((r) => r.filter((x) => x.id !== user.id));
            setStatus(`Deleted ${user.username ?? ("#" + user.id)}`);
        } catch (e) {
            alert(e?.message || "Failed to delete user");
        } finally {
            setSaving((s) => ({ ...s, [user.id]: false }));
        }
    }

    return (
        <div className="container">
            <h1>Admin · Users</h1>

            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.status}>
                        {loading ? "Loading…" : error ? `Error: ${error}` : `${clientFiltered.length} users`}
                        {status ? ` · ${status}` : ""}
                    </div>

                    <div className={styles.toolbar}>
                        <div className={styles.search}>
                            <input
                                className={styles.input}
                                placeholder="Search username, full name, or ID…"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(); } }}
                            />
                            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => { setPage(1); load(); }}>
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <colgroup>
                            <col style={{ width: "90px" }} />
                            <col style={{ width: "34%" }} />
                            <col style={{ width: "22%" }} />
                            <col style={{ width: "22%" }} />
                            <col style={{ width: "22%" }} />
                        </colgroup>
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                        </thead>

                        {clientFiltered.length === 0 && !loading ? (
                            <tbody>
                            <tr className={styles.row}>
                                <td colSpan={5} className={styles.empty}>No users found.</td>
                            </tr>
                            </tbody>
                        ) : (
                            <tbody>
                            {clientFiltered.map((u) => (
                                <tr key={u.id} className={styles.row}>
                                    <td>#{u.id}</td>

                                    <td>
                                        <div className={styles.userCell}>
                                            <Avatar username={u.username} />
                                            <div>
                                                <span className={styles.username}>{u.username ?? "—"}</span>
                                                <span className={styles.fullname}>{u.fullname ?? ""}</span>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <div className={styles.roleCell}>
                                            <RoleBadge role={u.role} />
                                            <select
                                                className={styles.roleSelect}
                                                value={u.role}
                                                onChange={(e) => changeRole(u, e.target.value)}
                                                disabled={!!saving[u.id]}
                                            >
                                                {ROLE_OPTIONS.map((r) => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </td>

                                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}</td>

                                    <td>
                                        <div className={styles.actions}>
                                            <button
                                                className={`${styles.btn} ${styles.btnDanger}`}
                                                onClick={() => deleteUser(u)}
                                                disabled={!!saving[u.id]}
                                                title="Delete user"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        )}
                    </table>
                </div>

                <div className={styles.pagination}>
                    <button className={styles.btn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                        Prev
                    </button>
                    <span>Page {page}</span>
                    <button className={styles.btn} onClick={() => setPage((p) => p + 1)}>
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
