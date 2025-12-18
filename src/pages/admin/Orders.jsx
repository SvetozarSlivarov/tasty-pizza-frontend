import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminListOrders } from "../../api/adminOrders";
import styles from "../../styles/Orders.module.css";

const STATUSES = [
    { value: "all", label: "All" },
    { value: "ORDERED", label: "Ordered" },
    { value: "PREPARING", label: "Preparing" },
    { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
    { value: "DELIVERED", label: "Delivered" },
    { value: "CANCELLED", label: "Cancelled" },
];

const fmtDate = (dt) => (dt ? new Date(dt).toLocaleString() : "-");
const money = (v) => {
    if (v == null) return "0.00";
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n.toFixed(2) : String(v);
};

function statusClass(status) {
    switch (status) {
        case "ORDERED": return `${styles.status} ${styles.statusOrdered}`;
        case "PREPARING": return `${styles.status} ${styles.statusPreparing}`;
        case "OUT_FOR_DELIVERY": return `${styles.status} ${styles.statusOut}`;
        case "DELIVERED": return `${styles.status} ${styles.statusDelivered}`;
        case "CANCELLED": return `${styles.status} ${styles.statusCancelled}`;
        default: return styles.status;
    }
}

export default function Orders() {
    const navigate = useNavigate();

    const [status, setStatus] = useState("all");
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(20);

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ items: [], total: 0, page: 0, size: 20 });
    const [error, setError] = useState(null);

    const totalPages = useMemo(() => {
        const total = data?.total ?? 0;
        return Math.max(1, Math.ceil(total / size));
    }, [data, size]);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await adminListOrders({ status, q, page, size });
            setData(res);
        } catch (e) {
            setError(e?.message || "Failed to load orders");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [status, page, size]); // eslint-disable-line

    function onSearchSubmit(e) {
        e.preventDefault();
        setPage(1);
        load();
    }

    return (
        <div className={styles.page}>
            <h2 className={styles.title}>Admin Orders</h2>

            <div className={styles.card}>
                <form onSubmit={onSearchSubmit} className={styles.toolbar}>
                    <select className={styles.select} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    <input
                        className={styles.input}
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by id/username/phone/address"
                    />

                    <button className={styles.btn} type="submit" disabled={loading}>
                        {loading ? "Loading..." : "Search"}
                    </button>

                    <select className={styles.select} value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}>
                        {[10, 20, 50].map(n => <option key={n} value={n}>{n} / page</option>)}
                    </select>
                </form>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.tableWrap}>
                    <table className={styles.table} cellPadding="0" cellSpacing="0">
                        <thead>
                            <tr>
                                <th className={styles.th}>ID</th>
                                <th className={styles.th}>Status</th>
                                <th className={`${styles.th} ${styles.right}`}>Items</th>
                                <th className={`${styles.th} ${styles.right}`}>Total</th>
                                <th className={styles.th}>Customer</th>
                                <th className={styles.th}>Phone</th>
                                <th className={styles.th}>Address</th>
                                <th className={styles.th}>Created</th>
                                <th className={styles.th}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td className={styles.td} colSpan={9}>Loading...</td></tr>
                            )}

                            {!loading && (data?.items?.length ?? 0) === 0 && (
                                <tr><td className={styles.td} colSpan={9}>No orders.</td></tr>
                            )}

                            {!loading && data.items.map(o => (
                                <tr key={o.orderId}>
                                    <td className={`${styles.td} ${styles.mono}`}>#{o.orderId}</td>
                                    <td className={styles.td}>
                                        <span className={statusClass(o.status)}>
                                            <span className={styles.dot}></span>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className={`${styles.td} ${styles.right}`}>{o.itemCount ?? 0}</td>
                                    <td className={`${styles.td} ${styles.right}`}>{money(o.total)}</td>
                                    <td className={styles.td}>{o.customerUsername ?? "-"}</td>
                                    <td className={`${styles.td} ${styles.truncate}`} title={o.deliveryPhone ?? "-"}>
                                        {o.deliveryPhone ?? "-"}
                                    </td>
                                    <td className={`${styles.td} ${styles.truncate}`} title={o.deliveryAddress ?? "-"}>
                                        {o.deliveryAddress ?? "-"}
                                    </td>
                                    <td className={styles.td}>{fmtDate(o.createdAt)}</td>
                                    <td className={`${styles.td} ${styles.right}`}>
                                        <button className={styles.pagerBtn} onClick={() => navigate(`/admin/orders/${o.orderId}`)}>
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.pager}>
                    <button className={styles.pagerBtn} disabled={loading || page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                        Prev
                    </button>

                    <span className={styles.mono}>
                        Page {page} / {totalPages} · Total {data?.total ?? 0}
                    </span>

                    <button className={styles.pagerBtn} disabled={loading || page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
