import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminOrdersApi, nextActionsForStatus } from "../../api/adminOrders";
import styles from "../../styles/adminOrders.module.css";

const StatusPill = ({ value }) => (
    <span className={styles.pill + " " + styles["st-" + String(value || "").toLowerCase()]}>{value}</span>
);

export default function AdminOrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    async function load() {
        setLoading(true); setError(null);
        try {
            const res = await adminOrdersApi.get(id);
            setData(res);
        } catch (e) {
            setError(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [id]);

    if (loading) return <div className={styles.page}><div className={styles.loading}>Loading…</div></div>;
    if (error)   return <div className={styles.page}><div className={styles.error}>⚠ {error}</div></div>;
    if (!data)   return null;

    const actions = nextActionsForStatus(data.status);

    async function run(action) {
        setBusy(true);
        try {
            await adminOrdersApi[action](data.orderId);
            await load();
        } catch (e) {
            alert(e?.message ?? String(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Order {data.orderNumber ?? data.orderId}</h1>
                <div className={styles.headerActions}>
                    <Link to="/admin/orders" className={styles.btnSecondary}>Back to list</Link>
                    {actions.map((a) => (
                        <button className={styles.btnPrimary} key={a} disabled={busy} onClick={() => run(a)}>
                            {label(a)}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.grid2}>
                <div className={styles.card}>
                    <div className={styles.body}>
                        <div className={styles.kv}><span>Status</span><StatusPill value={data.status} /></div>
                        <div className={styles.kv}><span>Total</span><b>{Number(data.total).toFixed(2)} лв</b></div>
                        <div className={styles.kv}><span>Ordered</span><span>{data.orderedAt ? new Date(data.orderedAt).toLocaleString() : "—"}</span></div>
                        <div className={styles.kv}><span>Preparing</span><span>{data.preparingAt ? new Date(data.preparingAt).toLocaleString() : "—"}</span></div>
                        <div className={styles.kv}><span>Out for delivery</span><span>{data.outForDeliveryAt ? new Date(data.outForDeliveryAt).toLocaleString() : "—"}</span></div>
                        <div className={styles.kv}><span>Delivered</span><span>{data.deliveredAt ? new Date(data.deliveredAt).toLocaleString() : "—"}</span></div>
                        <div className={styles.kv}><span>Cancelled</span><span>{data.cancelledAt ? new Date(data.cancelledAt).toLocaleString() : "—"}</span></div>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.body}>
                        <h2 className={styles.sectionTitle}>Customer & Delivery</h2>
                        <div className={styles.kv}><span>Username</span><span>{data.customerUsername ?? "guest"}</span></div>
                        <div className={styles.kv}><span>Phone</span><span>{data.deliveryPhone ?? "—"}</span></div>
                        <div className={styles.kv}><span>Address</span><span>{data.deliveryAddress ?? "—"}</span></div>
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.body}>
                    <h2 className={styles.sectionTitle}>Items ({data.items?.length ?? 0})</h2>
                    <div className={styles.tableWrap}>
                        <table className={`${styles.table} ${styles.itemsTable}`}>
                            <thead>
                            <tr>
                                <th className={styles.colProduct}>Product</th>
                                <th className={styles.colQty}>Qty</th>
                                <th className={styles.colMoney}>Unit price</th>
                                <th className={styles.colMoney}>Total</th>
                            </tr>
                            </thead>
                            <tbody>
                            {data.items?.map((it) => (
                                <tr key={it.id}>
                                    <td className={`${styles.td} ${styles.itemCell}`}>
                                        {it.imageUrl && <img alt="" src={it.imageUrl} className={styles.thumb} />}
                                        <div>
                                            <div className={styles.itemName}>
                                                {it.name ?? `${it.type || ""} ${it.productId || ""}`}
                                            </div>
                                            {it.variantLabel && <div className={styles.muted} style={{ marginTop: 2 }}>{it.variantLabel}</div>}
                                            {Array.isArray(it.customizations) && it.customizations.length > 0 && (
                                                <div className={styles.customizations}>
                                                    {it.customizations.map((c, idx) => {
                                                        const text = c.label || [c.action?.toUpperCase(), c.ingredientName || (c.ingredientId ? `ingredient#${c.ingredientId}` : "")].filter(Boolean).join(" ");
                                                        return <span key={idx} className={styles.tag}>{text}</span>;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`${styles.td} ${styles.qty}`}>{it.quantity}</td>
                                    <td className={`${styles.td} ${styles.money}`}>{Number(it.unitPrice).toFixed(2)} BGN</td>
                                    <td className={`${styles.td} ${styles.money}`}>{Number(it.lineTotal).toFixed(2)} BGN</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
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
