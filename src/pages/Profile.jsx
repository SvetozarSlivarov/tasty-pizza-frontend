import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ordersApi } from "../api/orders";
import { useCart } from "../context/CartContext";
import { ingredientsApi } from "../api/ingredients";
import EditProfileModal from "../components/EditProfileModal";
import "../styles/profile.css"

function StatusChip({ status }) {
    const label =
        {
            ordered: "Accepted",
            preparing: "Preparing",
            out_for_delivery: "On the way",
            delivered: "Delivered",
            cancelled: "Cancelled",
        }[String(status).toLowerCase()] ?? status;
    return <span className={`chip chip--${String(status).toLowerCase()}`}>{label}</span>;
}

function Stage({ label, ts }) {
    return (
        <div className={`stage ${ts ? "done" : ""}`}>
            <div className="dot" />
            <div className="meta">
                <div className="label">{label}</div>
                <div className="ts">{ts ? new Date(ts).toLocaleString() : "—"}</div>
            </div>
        </div>
    );
}

export default function Profile() {
    const { user } = useAuth();
    const cart = useCart();

    const [orders, setOrders] = useState([]);
    const [status, setStatus] = useState("all");
    const [sort, setSort] = useState("ordered_desc");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const [ingredients, setIngredients] = useState([]);
    const ingredientNameMap = useMemo(() => {
        const m = new Map();
        for (const ing of ingredients || []) m.set(ing.id, ing.name);
        return m;
    }, [ingredients]);

    const [editOpen, setEditOpen] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setErr("");
                const data = await ordersApi.my({ status, sort });
                setOrders(Array.isArray(data) ? data : []);
            } catch (e) {
                setErr(e?.message ?? "Error while loading.");
            } finally {
                setLoading(false);
            }
        })();
    }, [status, sort]);

    useEffect(() => {
        (async () => {
            try {
                const list = await ingredientsApi.all();
                setIngredients(Array.isArray(list) ? list : []);
            } catch (e) {
                console.warn("Failed to load ingredients", e);
            }
        })();
    }, []);

    async function handleReorder(orderId) {
        try {
            await ordersApi.reorder(orderId);
            cart?.open?.();
            cart?.refresh?.();
        } catch (e) {
            alert("Reorder failed: " + (e?.message ?? "Error"));
        }
    }

    const empty = !loading && orders.length === 0;

    return (
        <div className="container profile">
            <div className="profile-header">
                <h1>My Profile</h1>
                <button className="btn secondary" onClick={() => setEditOpen(true)}>
                    Edit
                </button>
            </div>

            <section className="profile-card">
                <h2>Details</h2>
                <div className="grid">
                    <div>
                        <div className="muted">Username:</div>
                        <div>{user?.username}</div>
                    </div>
                    <div>
                        <div className="muted">Full name:</div>
                        <div>{user?.fullname}</div>
                    </div>
                    <div>
                        <div className="muted">Role:</div>
                        <div>{user?.role}</div>
                    </div>
                    <div>
                        <div className="muted">Registered:</div>
                        <div>{user?.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}</div>
                    </div>
                </div>
            </section>

            <section className="orders">
                <header className="orders__toolbar">
                    <h2>My Orders</h2>
                    <div className="actions">
                        <div className="seg">
                            {["all", "active", "delivered", "cancelled"].map((s) => (
                                <button key={s} className= {status === s ? "active" : ""} onClick={() => setStatus(s)}>
                                    {s === "all" ? "All" : s === "active" ? "Active" : s === "delivered" ? "Delivered" : "Cancelled"}
                                </button>
                            ))}
                        </div>
                        <select value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option value="ordered_desc">Newest</option>
                            <option value="ordered_asc">Oldest</option>
                        </select>
                    </div>
                </header>

                {err && <p className="alert error">{err}</p>}
                {loading && <p className="muted">Loading…</p>}
                {empty && <p className="muted">You have no orders.</p>}

                <div className="orders__list">
                    {orders.map((o) => (
                        <article key={o.orderId} className="order">
                            <div className="order__head">
                                <div className="left">
                                    <div className="code"># {o.orderId}</div>
                                    <StatusChip status={o.status} />
                                </div>
                                <div className="right">
                                    <div className="total">
                                        {o.total?.toFixed ? o.total.toFixed(2) : o.total} BGN
                                    </div>
                                    <button onClick={() => handleReorder(o.orderId)} className="btn">
                                        Order again
                                    </button>
                                </div>
                            </div>

                            <div className="order__timeline">
                                <Stage label="Accepted" ts={o.orderedAt} />
                                <Stage label="Preparing" ts={o.preparingAt} />
                                <Stage label="On the way" ts={o.outForDeliveryAt} />
                                <Stage label="Delivered" ts={o.deliveredAt} />
                                <Stage label="Cancelled" ts={o.cancelledAt} />
                            </div>

                            <ul className="order__items">
                                {o.items?.map((it, idx) => (
                                    <li key={idx} className="item">
                                        <div className="thumb" style={{ backgroundImage: `url(${it.imageUrl || ""})` }} />
                                        <div className="meta">
                                            <div className="name">
                                                {it.name}
                                                {it.variantLabel ? ` — ${it.variantLabel}` : ""}
                                            </div>
                                            {it.customizations?.length > 0 && (
                                                <div className="muted small">
                                                    {it.customizations
                                                        .map((c) => {
                                                            const name = ingredientNameMap.get(c.ingredientId) ?? `#${c.ingredientId}`;
                                                            const sign = c.action?.toLowerCase() === "add" ? "+" : "−";
                                                            return `${sign}${name}`;
                                                        })
                                                        .join(", ")}
                                                </div>
                                            )}
                                        </div>
                                        <div className="qty">× {it.quantity}</div>
                                        <div className="price">
                                            {it.unitPrice?.toFixed ? it.unitPrice.toFixed(2) : it.unitPrice} BGN
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            {(o.deliveryAddress || o.deliveryPhone) && (
                                <div className="order__delivery muted">
                                    <div>Address: {o.deliveryAddress || "—"}</div>
                                    <div>Phone: {o.deliveryPhone || "—"}</div>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            </section>

            <EditProfileModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                initial={user}
                onSaved={() => {}}
            />
        </div>
    );
}
