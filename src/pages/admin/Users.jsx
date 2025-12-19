import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/adminUsers.module.css";
import { adminApi } from "../../api/admin";
import { useAuth } from "../../context/AuthContext";

const ROLE_OPTIONS = ["USER", "ADMIN"];
const PAGE_SIZES = [2, 5, 10, 20, 50, 100];

const SHOW_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "deleted", label: "Deleted" },
  { value: "all", label: "All" },
];

export default function Users() {
  const auth = useAuth?.();
  const meId = auth?.user?.id ?? null;
  const meUsername = auth?.user?.username ?? null;

  const [q, setQ] = useState("");
  const [show, setShow] = useState("active");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const users = useMemo(() => data?.content ?? [], [data]);
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const canPrev = page > 0;
  const canNext = totalPages ? page + 1 < totalPages : false;

  async function load({ nextPage = page, nextQ = q, nextShow = show, nextSize = size } = {}) {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.listUsers({
        q: nextQ,
        show: nextShow,
        page: nextPage,
        size: nextSize,
        sort: "id,desc",
      });
      setData(res);
      setPage(nextPage);
      setSize(nextSize);
    } catch (e) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load({ nextPage: 0, nextQ: q, nextShow: show });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  async function onSearchSubmit(e) {
    e.preventDefault();
    await load({ nextPage: 0, nextQ: q, nextShow: show });
  }

  function isMe(u) {
    if (meId != null) return u.id === meId;
    if (meUsername != null) return u.username === meUsername;
    return false;
  }

  async function onChangeRole(u, newRole) {
    setError("");
    if (isMe(u)) {
      setError("You cannot change your own role.");
      return;
    }

    try {
      await adminApi.changeRole(u.id, newRole);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to change role");
    }
  }

  async function onDelete(u) {
    setError("");
    if (isMe(u)) {
      setError("You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Soft delete user "${u.username}"?`)) return;

    try {
      await adminApi.softDelete(u.id);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to delete user");
    }
  }

  async function onRestore(u) {
    setError("");
    try {
      await adminApi.restore(u.id);
      await load();
    } catch (e) {
      setError(e?.message || "Failed to restore user");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Users</h1>

        <div className={styles.headerActions}>
          <span className={styles.muted}>{totalElements ? `${totalElements} total` : ""}</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.body}>
          <div className={styles.toolbar}>
            <form onSubmit={onSearchSubmit}>
              <input
                className={styles.search}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by username / full name..."
                disabled={loading}
              />
            </form>

            <div className={styles.filter}>
              <span className={styles.filterLabel}>Show</span>
              <select
                className={styles.select}
                value={show}
                onChange={(e) => setShow(e.target.value)}
                disabled={loading}
              >
                {SHOW_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? <div className={styles.loading}>Loading...</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}

          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.zebra}`}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.colId}`}>ID</th>
                  <th className={styles.th}>Username</th>
                  <th className={styles.th}>Full name</th>
                  <th className={styles.th}>Role</th>
                  <th className={`${styles.th} ${styles.colStatus}`}>Status</th>
                  <th className={styles.th}>Token</th>
                  <th className={`${styles.th} ${styles.colActions}`}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((u) => {
                  const me = isMe(u);
                  const deleted = !!u.deleted;

                  return (
                    <tr key={u.id} style={{ opacity: deleted ? 0.65 : 1 }}>
                      <td className={styles.td}>{u.id}</td>
                      <td className={styles.td}>
                        <span className={me ? styles.muted : undefined}>{u.username}</span>
                        {me ? <span className={styles.muted}> (you)</span> : null}
                      </td>
                      <td className={`${styles.td} ${styles.ellipsis}`}>
                        {u.fullname || <span className={styles.muted}>—</span>}
                      </td>

                      <td className={styles.td}>
                        <select
                          className={styles.select}
                          value={u.role}
                          disabled={loading || deleted || me}
                          onChange={(e) => onChangeRole(u, e.target.value)}
                          title={me ? "You cannot change your own role" : ""}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className={styles.td}>
                        <span className={styles.pill}>{deleted ? "deleted" : "active"}</span>
                      </td>

                      <td className={styles.td}>{u.tokenVersion}</td>

                      <td className={styles.td}>
                        <div className={styles.rowActions}>
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            disabled={loading}
                            onClick={() => {
                              const params = new URLSearchParams();
                              params.set("userId", String(u.id));
                              if (u.username) params.set("username", u.username);
                              navigate(`/admin/orders?${params.toString()}`);
                            }}
                          >
                            Orders
                          </button>

                          {!deleted ? (
                            <button
                              className={styles.btn}
                              disabled={loading || me}
                              onClick={() => onDelete(u)}
                              title={me ? "You cannot delete your own account" : ""}
                            >
                              Delete
                            </button>
                          ) : (
                            <button
                              className={`${styles.btn} ${styles.btnSecondary}`}
                              disabled={loading}
                              onClick={() => onRestore(u)}
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && users.length === 0 ? (
                  <tr>
                    <td className={styles.empty} colSpan={7}>
                      No users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <div className={styles.pageControls}>
              <button
                className={styles.btn}
                disabled={!canPrev || loading}
                onClick={() => load({ nextPage: page - 1 })}
              >
                Prev
              </button>

              <span className={styles.pageInfo}>
                Page {page + 1}
                {totalPages ? ` / ${totalPages}` : ""}
              </span>

              <button
                className={styles.btn}
                disabled={!canNext || loading}
                onClick={() => load({ nextPage: page + 1 })}
              >
                Next
              </button>
            </div>

            <div className={styles.pageSize}>
              <span>Rows:</span>
              <select
                className={styles.select}
                value={size}
                disabled={loading}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setSize(newSize);
                  setPage(0);
                  load({ nextPage: 0, nextQ: q, nextShow: show, nextSize: newSize });
                }}
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
