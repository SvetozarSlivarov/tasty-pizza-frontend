import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  adminCancel,
  adminDeliver,
  adminGetOrder,
  adminOutForDelivery,
  adminStartPreparing,
} from "../../api/adminOrders";
import styles from "../../styles/OrderDetails.module.css";

const fmtDate = (dt) => (dt ? new Date(dt).toLocaleString() : "-");
const money = (v) => {
  if (v == null) return "0.00";
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
};

export default function OrderDetails() {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOrder(await adminGetOrder(orderId));
    } catch (e) {
      setError(e?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (Number.isFinite(orderId)) load(); }, [orderId]); // eslint-disable-line

  async function runAction(fn) {
    setActing(true);
    setError(null);
    try {
      await fn(orderId);
      await load();
    } catch (e) {
      setError(e?.message || "Action failed");
    } finally {
      setActing(false);
    }
  }

  const status = order?.status;
  const canStart = status === "ORDERED";
  const canOut = status === "PREPARING";
  const canDeliver = status === "OUT_FOR_DELIVERY";
  const canCancel = status && status !== "DELIVERED" && status !== "CANCELLED" && status !== "CART";

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <button className={styles.backBtn} onClick={() => navigate("/admin/orders")}>← Back</button>
      </div>

      <h2 className={styles.title}>Order #{orderId}</h2>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div>Loading...</div>}

      {!loading && order && (
        <>
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.kv}><div className={styles.key}>Status</div><div className={styles.value}>{order.status}</div></div>
              <div className={styles.kv}><div className={styles.key}>Customer</div><div className={styles.value}>{order.customerUsername ?? "(guest)"}</div></div>
              <div className={styles.kv}><div className={styles.key}>Phone</div><div className={styles.value}>{order.deliveryPhone ?? "-"}</div></div>
              <div className={styles.kv}><div className={styles.key}>Address</div><div className={styles.value}>{order.deliveryAddress ?? "-"}</div></div>
              <div className={styles.kv}><div className={styles.key}>Created</div><div className={styles.value}>{fmtDate(order.createdAt)}</div></div>
              <div className={styles.kv}><div className={styles.key}>Updated</div><div className={styles.value}>{fmtDate(order.updatedAt)}</div></div>

              <div className={styles.actions}>
                <button className={styles.actionBtn} disabled={!canStart || acting} onClick={() => runAction(adminStartPreparing)}>
                  Start preparing
                </button>
                <button className={styles.actionBtn} disabled={!canOut || acting} onClick={() => runAction(adminOutForDelivery)}>
                  Out for delivery
                </button>
                <button className={styles.actionBtn} disabled={!canDeliver || acting} onClick={() => runAction(adminDeliver)}>
                  Deliver
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.dangerBtn}`}
                  disabled={!canCancel || acting}
                  onClick={() => window.confirm("Cancel this order?") && runAction(adminCancel)}
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}>Status history</div>
              <ul className={styles.historyList}>
                {(order.statusHistory ?? []).length ? (
                  order.statusHistory.map((h, idx) => (
                    <li key={idx}>
                      <b>{h.status}</b> — <span className={styles.subtle}>{fmtDate(h.changedAt)}</span>
                    </li>
                  ))
                ) : (
                  <li>No history</li>
                )}
              </ul>
            </div>
          </div>

          <div className={styles.sectionTitle}>Items</div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Item</th>
                  <th className={styles.th}>Variant</th>
                  <th className={`${styles.th} ${styles.right}`}>Qty</th>
                  <th className={`${styles.th} ${styles.right}`}>Unit</th>
                  <th className={`${styles.th} ${styles.right}`}>Line</th>
                  <th className={styles.th}>Notes</th>
                  <th className={styles.th}>Customizations</th>
                </tr>
              </thead>
              <tbody>
                {(order.items ?? []).map((it) => (
                  <tr key={it.id}>
                    <td className={styles.td}>
                      <div className={styles.itemCell}>
                        {it.imageUrl ? <img className={styles.thumb} src={it.imageUrl} alt="" /> : <div className={styles.thumb} />}
                        <div>
                          <div><b>{it.name}</b></div>
                          <div className={styles.subtle}>{it.type ?? ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>{it.variantLabel ?? "-"}</td>
                    <td className={`${styles.td} ${styles.right}`}>{it.quantity}</td>
                    <td className={`${styles.td} ${styles.right}`}>{money(it.unitPrice)}</td>
                    <td className={`${styles.td} ${styles.right}`}>{money(it.lineTotal)}</td>
                    <td className={styles.td}>{it.note ?? "-"}</td>
                    <td className={styles.td}>
                      {it.customizations?.length ? (
                        <ul className={styles.customList}>
                          {it.customizations.map((c, idx) => (
                            <li key={idx}><b>{c.type}</b>: {c.ingredientName}</li>
                          ))}
                        </ul>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td className={styles.td} colSpan={4} style={{ textAlign: "right" }}>Total:</td>
                  <td className={`${styles.td} ${styles.right}`}>{money(order.total)}</td>
                  <td className={styles.td} colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
