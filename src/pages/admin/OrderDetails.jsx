import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import {
  adminCancel,
  adminDeliver,
  adminGetOrder,
  adminOutForDelivery,
  adminStartPreparing,
} from "../../api/adminOrders";
import styles from "../../styles/OrderDetails.module.css";

const DATE_LOCALES = {
  en: "en-US",
  bg: "bg-BG",
  de: "de-DE",
  fr: "fr-FR",
};

const fmtDate = (dt, language) =>
  dt ? new Date(dt).toLocaleString(DATE_LOCALES[language] || DATE_LOCALES.en) : "-";

function translateVariantLabel(label, enumLabel) {
  if (!label) return "-";
  return String(label)
    .split(" - ")
    .map((part) => enumLabel(part.trim()))
    .join(" - ");
}

function money(v) {
  if (v == null) return "0.00";
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}

export default function OrderDetails() {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();
  const { language, t, enumLabel } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOrder(await adminGetOrder(orderId, language));
    } catch (e) {
      setError(e?.message || t("Failed to load order"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (Number.isFinite(orderId)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, language]);

  async function runAction(fn) {
    setActing(true);
    setError(null);
    try {
      await fn(orderId);
      await load();
    } catch (e) {
      setError(e?.message || t("Action failed"));
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
        <button className={styles.backBtn} onClick={() => navigate("/admin/orders")}>{t("Back")}</button>
      </div>

      <h2 className={styles.title}>{t("Order")} #{orderId}</h2>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div>{t("Loading...")}</div>}

      {!loading && order && (
        <>
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.kv}><div className={styles.key}>{t("Status")}</div><div className={styles.value}>{enumLabel(order.status)}</div></div>
              <div className={styles.kv}><div className={styles.key}>{t("Customer")}</div><div className={styles.value}>{order.customerUsername ?? t("(guest)")}</div></div>
              <div className={styles.kv}><div className={styles.key}>{t("Phone")}</div><div className={styles.value}>{order.deliveryPhone ?? "-"}</div></div>
              <div className={styles.kv}><div className={styles.key}>{t("Address")}</div><div className={styles.value}>{order.deliveryAddress ?? "-"}</div></div>
              <div className={styles.kv}><div className={styles.key}>{t("Created")}</div><div className={styles.value}>{fmtDate(order.createdAt, language)}</div></div>
              <div className={styles.kv}><div className={styles.key}>{t("Updated")}</div><div className={styles.value}>{fmtDate(order.updatedAt, language)}</div></div>

              <div className={styles.actions}>
                <button className={styles.actionBtn} disabled={!canStart || acting} onClick={() => runAction(adminStartPreparing)}>
                  {t("Start preparing")}
                </button>
                <button className={styles.actionBtn} disabled={!canOut || acting} onClick={() => runAction(adminOutForDelivery)}>
                  {t("Out for delivery")}
                </button>
                <button className={styles.actionBtn} disabled={!canDeliver || acting} onClick={() => runAction(adminDeliver)}>
                  {t("Deliver")}
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.dangerBtn}`}
                  disabled={!canCancel || acting}
                  onClick={() => window.confirm(t("Cancel this order?")) && runAction(adminCancel)}
                >
                  {t("Cancel")}
                </button>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionTitle}>{t("Status history")}</div>
              <ul className={styles.historyList}>
                {(order.statusHistory ?? []).length ? (
                  order.statusHistory.map((h, idx) => (
                    <li key={idx}>
                      <b>{enumLabel(h.status)}</b> - <span className={styles.subtle}>{fmtDate(h.changedAt, language)}</span>
                    </li>
                  ))
                ) : (
                  <li>{t("No history")}</li>
                )}
              </ul>
            </div>
          </div>

          <div className={styles.sectionTitle}>{t("Items")}</div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>{t("Item")}</th>
                  <th className={styles.th}>{t("Variant")}</th>
                  <th className={`${styles.th} ${styles.right}`}>{t("Qty")}</th>
                  <th className={`${styles.th} ${styles.right}`}>{t("Unit")}</th>
                  <th className={`${styles.th} ${styles.right}`}>{t("Line")}</th>
                  <th className={styles.th}>{t("Notes")}</th>
                  <th className={styles.th}>{t("Customizations")}</th>
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
                          <div className={styles.subtle}>{enumLabel(it.type ?? "")}</div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.td}>{translateVariantLabel(it.variantLabel, enumLabel)}</td>
                    <td className={`${styles.td} ${styles.right}`}>{it.quantity}</td>
                    <td className={`${styles.td} ${styles.right}`}>{money(it.unitPrice)}</td>
                    <td className={`${styles.td} ${styles.right}`}>{money(it.lineTotal)}</td>
                    <td className={styles.td}>{it.note ?? "-"}</td>
                    <td className={styles.td}>
                      {it.customizations?.length ? (
                        <ul className={styles.customList}>
                          {it.customizations.map((c, idx) => (
                            <li key={idx}><b>{enumLabel(c.type ?? c.action ?? "")}</b>: {c.ingredientName}</li>
                          ))}
                        </ul>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td className={styles.td} colSpan={4} style={{ textAlign: "right" }}>{t("Total")}:</td>
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
