import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ordersApi } from "../api/orders";
import { useCart } from "../context/CartContext";
import { ingredientsApi } from "../api/ingredients";
import EditProfileModal from "../components/EditProfileModal";
import "../styles/profile.css";

/** Enum -> UI normalization:
 *  "OUT_FOR_DELIVERY" -> "out_for_delivery"
 *  "Ordered" -> "ordered"
 */
function normStatus(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}

// Your exact statuses (normalized)
const STATUS_LABEL = {
  cart: "Cart",
  ordered: "Accepted",
  preparing: "Preparing",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Visual flow on profile
const STATUS_STEPS = ["ordered", "preparing", "out_for_delivery", "delivered", "cancelled"];

// "Active" filter = enum active states
const ACTIVE_SET = new Set(["ordered", "preparing", "out_for_delivery"]);

function money(v) {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

function StatusChip({ status }) {
  const s = normStatus(status);
  const label = STATUS_LABEL[s] ?? String(status ?? "—");
  return <span className={`chip chip--${s}`}>{label}</span>;
}

function Stage({ label, ts, done }) {
  return (
    <div className={`stage ${done ? "done" : ""}`}>
      <div className="dot" />
      <div className="meta">
        <div className="label">{label}</div>
        <div className="ts">{ts ? new Date(ts).toLocaleString() : "—"}</div>
      </div>
    </div>
  );
}

/** Build a timeline only from CURRENT status (no timestamps needed). */
function buildTimelineFromCurrentStatus(orderStatus) {
  const s = normStatus(orderStatus);

  // Special case: CANCELLED => show only cancelled as done
  if (s === "cancelled") {
    return STATUS_STEPS.map((step) => ({
      step,
      done: step === "cancelled",
      ts: null,
    }));
  }

  const idx = STATUS_STEPS.indexOf(s); // ordered=0, ... delivered=3
  return STATUS_STEPS.map((step, i) => ({
    step,
    done: idx >= 0 ? i <= idx : false,
    ts: null,
  }));
}

/** Build timeline from statusHistory endpoint (with timestamps). */
function buildTimelineFromHistory(history) {
  // Keep first timestamp per status (ascending from backend recommended)
  const byStatus = new Map();
  for (const h of history || []) {
    const key = normStatus(h?.status);
    const ts = h?.changedAt ?? h?.changed_at ?? null;
    if (key && !byStatus.has(key)) byStatus.set(key, ts);
  }

  // If cancelled exists in history, we still show all steps but cancelled will have ts.
  return STATUS_STEPS.map((step) => ({
    step,
    ts: byStatus.get(step) ?? null,
    done: byStatus.has(step),
  }));
}

export default function Profile() {
  const { user, booted } = useAuth();
  const cart = useCart();

  const [ordersRaw, setOrdersRaw] = useState([]);
  const [status, setStatus] = useState("all"); // all | active | delivered | cancelled
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

  // --- Status history state ---
  const [openHistoryFor, setOpenHistoryFor] = useState(null); // orderId | null
  const [historyByOrderId, setHistoryByOrderId] = useState(() => new Map()); // Map<number, array>
  const [historyLoadingId, setHistoryLoadingId] = useState(null);
  const [historyErrByOrderId, setHistoryErrByOrderId] = useState(() => new Map());

  useEffect(() => {
    if (!booted || !user) return;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await ordersApi.my();
        setOrdersRaw(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.message ?? "Error while loading.");
        setOrdersRaw([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [booted, user]);

  useEffect(() => {
    (async () => {
      try {
        const res = await ingredientsApi.all();
        const list = Array.isArray(res) ? res : Array.isArray(res?.content) ? res.content : [];
        setIngredients(list);
      } catch (e) {
        console.warn("Failed to load ingredients", e);
        setIngredients([]);
      }
    })();
  }, []);

  const orders = useMemo(() => {
    let list = Array.isArray(ordersRaw) ? [...ordersRaw] : [];

    if (status === "active") {
      list = list.filter((o) => ACTIVE_SET.has(normStatus(o.status)));
    } else if (status === "delivered") {
      list = list.filter((o) => normStatus(o.status) === "delivered");
    } else if (status === "cancelled") {
      list = list.filter((o) => normStatus(o.status) === "cancelled");
    }

    list.sort((a, b) => {
      const ta = a?.orderedAt ? new Date(a.orderedAt).getTime() : 0;
      const tb = b?.orderedAt ? new Date(b.orderedAt).getTime() : 0;
      return sort === "ordered_asc" ? ta - tb : tb - ta;
    });

    return list;
  }, [ordersRaw, status, sort]);

  async function handleReorder(orderId) {
  try {
    const res = await ordersApi.reorder(orderId);

    if (res?.cart) {
      cart?.applyServerCart?.(res.cart);
    }

    cart?.open?.();

    if (res?.skipped > 0) {
      const msg = Array.isArray(res?.messages) ? res.messages.join("\n") : "Some items were skipped.";
      alert(msg);
    }
  } catch (e) {
    alert("Reorder failed: " + (e?.message ?? "Error"));
  }
}

  async function toggleStatusHistory(orderId) {
    if (openHistoryFor === orderId) {
      setOpenHistoryFor(null);
      return;
    }

    setOpenHistoryFor(orderId);

    if (historyByOrderId.has(orderId)) return;

    setHistoryLoadingId(orderId);
    setHistoryErrByOrderId((prev) => {
      const next = new Map(prev);
      next.delete(orderId);
      return next;
    });

    try {
      const data = await ordersApi.statusHistory(orderId);
      const list = Array.isArray(data) ? data : [];

      const normalized = list
        .map((x) => ({
          status: x?.status,
          changedAt: x?.changedAt ?? x?.changed_at ?? null,
        }))
        .filter((x) => x.status);

      setHistoryByOrderId((prev) => {
        const next = new Map(prev);
        next.set(orderId, normalized);
        return next;
      });
    } catch (e) {
      const msg = e?.message ?? "Failed to load status history.";
      setHistoryErrByOrderId((prev) => {
        const next = new Map(prev);
        next.set(orderId, msg);
        return next;
      });
    } finally {
      setHistoryLoadingId(null);
    }
  }

  const empty = !loading && orders.length === 0;

  if (!booted) return null;

  if (!user) {
    return (
      <div className="container profile">
        <p className="muted">Please login to view your profile.</p>
      </div>
    );
  }

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
                <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
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
          {orders.map((o) => {
            const orderId = o.orderId;
            const isHistoryOpen = openHistoryFor === orderId;
            const history = historyByOrderId.get(orderId) || [];
            const historyErr = historyErrByOrderId.get(orderId);
            const isHistoryLoading = historyLoadingId === orderId;

            const timeline = isHistoryOpen && history.length > 0
              ? buildTimelineFromHistory(history)
              : buildTimelineFromCurrentStatus(o.status);

            return (
              <article key={orderId} className="order">
                <div className="order__head">
                  <div className="left">
                    <div className="code"># {orderId}</div>
                    <StatusChip status={o.status} />
                  </div>

                  <div className="right">

                    <button className="btn secondary" onClick={() => toggleStatusHistory(orderId)}>
                      {isHistoryOpen ? "Hide status history" : "Status history"}
                    </button>

                    <button onClick={() => handleReorder(orderId)} className="btn">
                      Order again
                    </button>
                  </div>
                </div>

                {/* Timeline (enum-based)
                <div className="order__timeline">
                  {timeline.map(({ step, ts, done }) => (
                    <Stage key={step} label={STATUS_LABEL[step]} ts={ts} done={done} />
                  ))}
                </div> */}

                {/* Status history panel (raw list) */}
                {isHistoryOpen && (
                  <div className="order__history">
                    {isHistoryLoading && <div className="muted">Loading status history…</div>}
                    {historyErr && <div className="alert error">{historyErr}</div>}

                    {!isHistoryLoading && !historyErr && history.length === 0 && (
                      <div className="muted">No status history.</div>
                    )}

                    {!isHistoryLoading && !historyErr && history.length > 0 && (
                      <div className="muted small" style={{ marginTop: 8 }}>
                        {history.map((h, idx) => (
                          <div key={`${h.status}-${h.changedAt ?? idx}`}>
                            <b>{STATUS_LABEL[normStatus(h.status)] ?? h.status}</b>{" "}
                            — {h.changedAt ? new Date(h.changedAt).toLocaleString() : "—"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <ul className="order__items">
                  {o.items?.map((it, idx) => (
                    <li key={idx} className="item">
                      <div className="thumb" style={{ backgroundImage: `url(${it.imageUrl || ""})` }} />
                      <div className="meta">
                        <div className="name">
                          {it.productName}
                          {it.variantLabel ? ` — ${it.variantLabel}` : ""}
                        </div>

                        {it.customizations?.length > 0 && (
                          <div className="muted small">
                            {it.customizations
                              .map((c) => {
                                const name = ingredientNameMap.get(c.ingredientId) ?? `#${c.ingredientId}`;
                                const sign = String(c.action ?? "").toLowerCase() === "add" ? "+" : "−";
                                return `${sign}${name}`;
                              })
                              .join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="qty">× {it.quantity}</div>
                      <div className="price">{money(it.unitPrice)} BGN</div>
                    </li>
                  ))}
                </ul>
                <div className="total">{money(o.total)} BGN</div>

                {(o.address || o.phoneNumber) && (
                  <div className="order__delivery muted">
                    <div>Address: {o.address || "—"}</div>
                    <div>Phone: {o.phoneNumber || "—"}</div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} initial={user} onSaved={() => {}} />
    </div>
  );
}
