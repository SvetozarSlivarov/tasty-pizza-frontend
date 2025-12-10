import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { adminOrdersApi, nextActionsForStatus } from "../../api/adminOrders";
import styles from "../../styles/adminOrders.module.css";

const StatusPill = ({ value }) => (
    <span className={styles.pill + " " + styles["st-" + String(value || "").toLowerCase()]}>
    {String(value || "").replace(/_/g, " ")}
  </span>
);

export default function AdminOrders() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const page   = Number(params.get("page")   || 1);
    const size   = Number(params.get("size")   || 20);
    const status = params.get("status") || "all";
    const q      = params.get("q") || "";

    function updateParam(name, val) {
        const p = new URLSearchParams(params);
        if (val === null || val === undefined || val === "") p.delete(name);
        else p.set(name, String(val));
        setParams(p, { replace: true });
    }

    async function load() {
        setLoading(true); setError(null);
        try {
            const res = await adminOrdersApi.list({ status, q, page, size });
            setRows(res?.items ?? res?.data ?? res?.results ?? []);
            setTotal(res?.total ?? 0);
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [status, q, page, size]);

    const pageCount = Math.max(1, Math.ceil(total / size));

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Admin · Orders</h1>
            </div>

            <div className={styles.toolbar}>
                <label className={styles.filter}>
                    <span className={styles.filterLabel}>Status:</span>
                    <select
                        className={styles.select}
                        value={status}
                        onChange={(e) => updateParam("status", e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="ordered">ORDERED</option>
                        <option value="preparing">PREPARING</option>
                        <option value="out_for_delivery">OUT_FOR_DELIVERY</option>
                        <option value="delivered">DELIVERED</option>
                        <option value="cancelled">CANCELLED</option>
                    </select>
                </label>

                <input
                    type="search"
                    placeholder="Search (username, phone, address, order #)"
                    value={q}
                    onChange={(e) => updateParam("q", e.target.value)}
                    className={styles.search}
                />
            </div>

            {error && <div className={styles.error}>⚠ {error}</div>}
            {loading && <div className={styles.loading}>Loading…</div>}

            <div className={styles.card}>
                <div className={styles.body}>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                            <tr>
                                <th className={`${styles.th} ${styles.colId}`}>#</th>
                                <th className={`${styles.th} ${styles.colStatus}`}>Status</th>
                                <th className={`${styles.th} ${styles.colTotal}`}>Total</th>
                                <th className={`${styles.th} ${styles.colItems}`}>Items</th>
                                <th className={`${styles.th} ${styles.colOrderedAt}`}>Ordered at</th>
                                <th className={`${styles.th} ${styles.colCustomer}`}>Customer</th>
                                <th className={`${styles.th} ${styles.colPhone}`}>Phone</th>
                                <th className={`${styles.th} ${styles.colAddress}`}>Address</th>
                                <th className={`${styles.th} ${styles.colActions}`}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows?.length === 0 && !loading && (
                                <tr><td colSpan="9" className={styles.empty}>No orders.</td></tr>
                            )}

                            {rows?.map((r) => {
                                const go = () => navigate(`/admin/orders/${r.orderId}`);
                                const onRowKey = (e) => {
                                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
                                };
                                return (
                                    <tr
                                        key={r.orderId}
                                        className={styles.clickableRow}
                                        onClick={go}
                                        onKeyDown={onRowKey}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`Open order ${r.orderNumber ?? r.orderId}`}
                                    >
                                        <td className={`${styles.td} ${styles.colId}`}>
                                            <Link
                                                to={`/admin/orders/${r.orderId}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className={styles.idLink}
                                            >
                                                {r.orderNumber ?? r.orderId}
                                            </Link>
                                        </td>
                                        <td className={`${styles.td} ${styles.colStatus}`}><StatusPill value={r.status} /></td>
                                        <td className={`${styles.td} ${styles.colTotal}`}>{Number(r.total).toFixed(2)} BGN</td>
                                        <td className={`${styles.td} ${styles.colItems}`}>{r.itemCount}</td>
                                        <td className={`${styles.td} ${styles.colOrderedAt}`}>{r.orderedAt ? new Date(r.orderedAt).toLocaleString() : "—"}</td>
                                        <td className={`${styles.td} ${styles.colCustomer}`}>{r.customerUsername ?? "guest"}</td>
                                        <td className={`${styles.td} ${styles.colPhone}`}>{r.deliveryPhone ?? "—"}</td>
                                        <td className={`${styles.td} ${styles.colAddress} ${styles.ellipsis}`}>{r.deliveryAddress ?? "—"}</td>
                                        <td className={`${styles.td} ${styles.colActions}`}>
                                            <RowActions row={r} onChanged={load} />
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.pagination}>
                        <div className={styles.pageControls}>
                            <button
                                className={styles.btn}
                                disabled={page <= 1}
                                onClick={() => updateParam("page", 1)}
                                aria-label="First page"
                            >
                                « First
                            </button>
                            <button
                                className={styles.btn}
                                disabled={page <= 1}
                                onClick={() => updateParam("page", page - 1)}
                                aria-label="Previous page"
                            >
                                ‹ Prev
                            </button>

                            <span className={styles.pageInfo}>Page {page} / {pageCount}</span>

                            <button
                                className={styles.btn}
                                disabled={page >= pageCount}
                                onClick={() => updateParam("page", page + 1)}
                                aria-label="Next page"
                            >
                                Next ›
                            </button>
                            <button
                                className={styles.btn}
                                disabled={page >= pageCount}
                                onClick={() => updateParam("page", pageCount)}
                                aria-label="Last page"
                            >
                                Last »
                            </button>
                        </div>

                        <label className={styles.pageSize}>
                            <span>Per page:</span>
                            <select
                                className={styles.select}
                                value={size}
                                onChange={(e) => updateParam("size", Number(e.target.value))}
                                aria-label="Page size"
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                            </select>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RowActions({ row, onChanged }) {
    const [busy, setBusy] = useState(false);

    async function run(action) {
        setBusy(true);
        try {
            await adminOrdersApi[action](row.orderId);
            await onChanged();
        } catch (e) {
            alert(e?.message ?? String(e));
        } finally {
            setBusy(false);
        }
    }

    const actions = nextActionsForStatus(row.status);
    if (actions.length === 0) return <span className={styles.muted}>—</span>;

    return (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
            {actions.map((a) => (
                <button
                    key={a}
                    className={styles.btn}
                    disabled={busy}
                    onClick={(e) => { e.stopPropagation(); run(a); }}
                >
                    {label(a)}
                </button>
            ))}
        </div>
    );
}

function label(action) {
    switch (action) {
        case "startPreparing": return "Start preparing";
        case "outForDelivery": return "Out for delivery";
        case "deliver":        return "Deliver";
        case "cancel":         return "Cancel";
        default: return action;
    }
}
