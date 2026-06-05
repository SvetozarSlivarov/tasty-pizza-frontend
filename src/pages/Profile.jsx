import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
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

// "Active" filter = enum active states
const ACTIVE_SET = new Set(["ordered", "preparing", "out_for_delivery"]);

function money(v) {
  if (v == null) return "â€”";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(v);
}

function StatusChip({ status }) {
  const { t } = useLanguage();
  const s = normStatus(status);
  const label = STATUS_LABEL[s] ?? String(status ?? "-");
  return <span className={`chip chip--${s}`}>{t(label)}</span>;
}

export default function Profile() {
  const { user, booted } = useAuth();
  const { language, t } = useLanguage();
  const cart = useCart();

  const [ordersRaw, setOrdersRaw] = useState([]);
  const [status, setStatus] = useState("all"); // all | active | delivered | cancelled
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
        const data = await ordersApi.my(language);
        setOrdersRaw(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e?.message ?? t("Error while loading."));
        setOrdersRaw([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [booted, user, language, t]);

  useEffect(() => {
    (async () => {
      try {
        const res = await ingredientsApi.all(language);
        const list = Array.isArray(res) ? res : Array.isArray(res?.content) ? res.content : [];
        setIngredients(list);
      } catch (e) {
        console.warn("Failed to load ingredients", e);
        setIngredients([]);
      }
    })();
  }, [language]);

  const orders = useMemo(() => {
    let list = Array.isArray(ordersRaw) ? [...ordersRaw] : [];

    if (status === "active") {
      list = list.filter((o) => ACTIVE_SET.has(normStatus(o.status)));
    } else if (status === "delivered") {
      list = list.filter((o) => normStatus(o.status) === "delivered");
    } else if (status === "cancelled") {
      list = list.filter((o) => normStatus(o.status) === "cancelled");
    }

    return list;
  }, [ordersRaw, status]);

  async function handleReorder(orderId) {
  try {
    const res = await ordersApi.reorder(orderId, language);

    if (res?.cart) {
      cart?.applyServerCart?.(res.cart);
    }

    cart?.open?.();

    if (res?.skipped > 0) {
      const msg = Array.isArray(res?.messages) ? res.messages.join("\n") : t("Some items were skipped.");
      alert(msg);
    }
  } catch (e) {
    alert(`${t("Reorder failed")}: ${e?.message ?? t("Error")}`);
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
      const msg = e?.message ?? t("Failed to load status history.");
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
        <p className="muted">{t("Please login to view your profile.")}</p>
      </div>
    );
  }

  return (
    <div className="container profile">
      <div className="profile-header">
        <h1>{t("My Profile")}</h1>
        <button className="btn secondary" onClick={() => setEditOpen(true)}>
          {t("Edit")}
        </button>
      </div>

      <section className="profile-card">
        <h2>{t("Details")}</h2>
        <div className="grid">
          <div>
            <div className="muted">{t("Username")}:</div>
            <div>{user?.username}</div>
          </div>
          <div>
            <div className="muted">{t("Full name")}:</div>
            <div>{user?.fullname}</div>
          </div>
          <div>
            <div className="muted">{t("Role")}:</div>
            <div>{t(user?.role, user?.role)}</div>
          </div>
          <div>
            <div className="muted">{t("Registered")}:</div>
            <div>{user?.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</div>
          </div>
        </div>
      </section>

      <section className="orders">
        <header className="orders__toolbar">
          <h2>{t("My Orders")}</h2>
          <div className="actions">
            <div className="seg">
              {["all", "active", "delivered", "cancelled"].map((s) => (
                <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
                  {s === "all" ? t("All") : s === "active" ? t("Active") : s === "delivered" ? t("Delivered") : t("Cancelled")}
                </button>
              ))}
            </div>

          </div>
        </header>

        {err && <p className="alert error">{err}</p>}
        {loading && <p className="muted">{t("Loading...")}</p>}
        {empty && <p className="muted">{t("You have no orders.")}</p>}

        <div className="orders__list">
          {orders.map((o) => {
            const orderId = o.orderId;
            const isHistoryOpen = openHistoryFor === orderId;
            const history = historyByOrderId.get(orderId) || [];
            const historyErr = historyErrByOrderId.get(orderId);
            const isHistoryLoading = historyLoadingId === orderId;

            return (
              <article key={orderId} className="order">
                <div className="order__head">
                  <div className="left">
                    <div className="code"># {orderId}</div>
                    <StatusChip status={o.status} />
                  </div>

                  <div className="right order-actions">
                    <button
                      className={`order-action-btn order-action-btn--ghost ${isHistoryOpen ? "active" : ""}`}
                      onClick={() => toggleStatusHistory(orderId)}
                      type="button"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 8v5l3 2" />
                        <path d="M3.5 12a8.5 8.5 0 1 0 2.3-5.8" />
                        <path d="M3.5 4.5v4h4" />
                      </svg>
                      <span>{isHistoryOpen ? t("Hide status history") : t("Status history")}</span>
                    </button>

                    <button
                      onClick={() => handleReorder(orderId)}
                      className="order-action-btn order-action-btn--primary"
                      type="button"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 8h12l-1 11H7L6 8Z" />
                        <path d="M9 8a3 3 0 0 1 6 0" />
                        <path d="M8 13h8" />
                      </svg>
                      <span>{t("Order again")}</span>
                    </button>
                  </div>
                </div>

                {/* Status history panel (raw list) */}
                {isHistoryOpen && (
                  <div className="order__history">
                    {isHistoryLoading && <div className="muted">{t("Loading status history...")}</div>}
                    {historyErr && <div className="alert error">{historyErr}</div>}

                    {!isHistoryLoading && !historyErr && history.length === 0 && (
                      <div className="muted">{t("No status history.")}</div>
                    )}

                    {!isHistoryLoading && !historyErr && history.length > 0 && (
                      <div className="muted small" style={{ marginTop: 8 }}>
                        {history.map((h, idx) => (
                          <div key={`${h.status}-${h.changedAt ?? idx}`}>
                            <b>{t(STATUS_LABEL[normStatus(h.status)] ?? h.status)}</b>{" "}
                            {" - "}{h.changedAt ? new Date(h.changedAt).toLocaleString() : "-"}
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
                          {it.variantLabel ? ` - ${it.variantLabel}` : ""}
                          {it.pastaSauceName ? ` - ${it.pastaSauceName}${it.pastaSauceSpicyLevel ? " / " + it.pastaSauceSpicyLevel : ""}` : ""}
                        </div>

                        {it.customizations?.length > 0 && (
                          <div className="muted small">
                            {it.customizations
                              .map((c) => {
                                const name = c.ingredientName ?? ingredientNameMap.get(c.ingredientId) ?? `#${c.ingredientId}`;
                                const sign = String(c.action ?? "").toLowerCase() === "add" ? "+" : "-";
                                return `${sign}${name}`;
                              })
                              .join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="qty">x {it.quantity}</div>
                      <div className="price">{money(it.unitPrice)} EUR</div>
                    </li>
                  ))}
                </ul>
                <div className="total">{money(o.total)} EUR</div>

                {(o.address || o.phoneNumber) && (
                  <div className="order__delivery muted">
                    <div>{t("Address")}: {o.address || "â€”"}</div>
                    <div>{t("Phone")}: {o.phoneNumber || "â€”"}</div>
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

