import { useEffect, useMemo, useState } from "react";
import styles from "../../styles/Pizzas.module.css";
import { adminApi } from "../../api/admin";
import { useLanguage } from "../../context/LanguageContext";
import PizzaForm, { normalizePizza } from "./components/PizzaForm";
import Modal from "./components/Modal";

export default function PizzasAdmin() {
  const { language, t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const [view, setView] = useState("active");

  const [q, setQ] = useState("");

  async function load(nextView = view) {
    setLoading(true);
    setError(null);
    try {
      const list =
        nextView === "deleted"
          ? await adminApi.listDeletedPizzas({ withVariants: true, lang: language })
          : await adminApi.listPizzas({ withVariants: true, lang: language });

      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || t("Failed to load pizzas"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setQ("");
    load(view);
  }, [view, language]);

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((r) =>
      String(r?.name ?? "").toLowerCase().includes(query)
    );
  }, [rows, q]);

  async function onEditClick(row) {
    setBusy(true);
    try {
      const full = await adminApi.getPizza(row.id, language);
      setEditing({ id: full?.id ?? row.id, ...normalizePizza(full) });
    } catch (_) {
      setEditing({ id: row.id, ...normalizePizza(row) });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm(t("Delete this pizza? (soft delete)"))) return;
    setBusy(true);
    try {
      await adminApi.deletePizza(id);
      setView("active");
      await load("active");
    } catch (e) {
      alert(e?.message || t("Delete failed"));
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(id) {
    setBusy(true);
    try {
      await adminApi.restorePizza(id);
      await load(view);
    } catch (e) {
      alert(e?.message || t("Restore failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(payload) {
    setBusy(true);
    try {
      await adminApi.createPizza(payload);
      setCreating(false);
      setView("active");
      await load("active");
    } catch (e) {
      alert(e?.message || t("Create failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(id, payload) {
    setBusy(true);
    try {
      await adminApi.updatePizza(id, payload);
      setEditing(null);
      await load(view);
    } catch (e) {
      alert(e?.message || t("Update failed"));
    } finally {
      setBusy(false);
    }
  }

  function toggleView(next) {
    setView(next);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.title}>{t("Pizzas")}</div>

        <div className={styles.actions}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={styles.btn}
              onClick={() => toggleView("active")}
              disabled={busy || view === "active"}
              title={t("Show active pizzas")}
            >
              {t("Active")}
            </button>
            <button
              className={styles.btn}
              onClick={() => toggleView("deleted")}
              disabled={busy || view === "deleted"}
              title={t("Show deleted pizzas")}
            >
              {t("Deleted")}
            </button>
          </div>

          <input
            className={styles.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search by name...")}
            disabled={busy || loading}
            style={{ maxWidth: 200 }}
          />

          {view === "active" && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setCreating(true)}
              disabled={busy}
            >
              + {t("New pizza")}
            </button>
          )}
        </div>
      </div>

      {error && <div className={`${styles.panel} ${styles.error}`}>{t("Error")}: {error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>{t("Image")}</th>
              <th className={styles.th}>{t("Name")}</th>
              <th className={styles.th}>{t("Price")}</th>
              <th className={styles.th}>{t("Actions")}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className={styles.td} colSpan={5}>
                  {t("Loading...")}
                </td>
              </tr>
            ) : filteredRows?.length ? (
              filteredRows.map((r) => (
                <tr
                  key={r.id}
                  className={view === "deleted" ? styles.rowMuted : undefined}
                >
                  <td className={styles.td}>{r.id}</td>

                  <td className={styles.td}>
                    {r.imageUrl ? (
                      <img className={styles.img} src={r.imageUrl} alt={r.name} />
                    ) : (
                      <span className={styles.note}>{t("no image")}</span>
                    )}
                  </td>

                  <td className={styles.td}>{r.name}</td>

                  <td className={styles.td}>
                    {typeof r.basePrice === "number"
                      ? r.basePrice.toFixed(2)
                      : r.basePrice}
                  </td>

                  <td className={styles.td}>
                    <div className={styles.row}>
                      {view === "active" ? (
                        <>
                          <button
                            className={styles.btn}
                            onClick={() => onEditClick(r)}
                            disabled={busy}
                          >
                            {t("Edit")}
                          </button>
                          <button
                            className={styles.btn}
                            onClick={() => onDelete(r.id)}
                            disabled={busy}
                          >
                            {t("Delete")}
                          </button>
                        </>
                      ) : (
                        <button
                          className={styles.btn}
                          onClick={() => onRestore(r.id)}
                          disabled={busy}
                        >
                          {t("Restore")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className={styles.td} colSpan={5}>
                  {q.trim() ? t("No matching pizzas.") : t("No records.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title={t("Create pizza")} isOpen={creating} onClose={() => setCreating(false)}>
        <PizzaForm
          mode="create"
          busy={busy}
          onCancel={() => setCreating(false)}
          onSubmit={handleCreate}
          language={language}
        />
      </Modal>

      <Modal title={t("Edit pizza")} isOpen={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing && (
          <PizzaForm
            mode="edit"
            busy={busy}
            initial={editing}
            pizzaId={editing.id}
            onCancel={() => setEditing(null)}
            onSubmit={(payload) => handleUpdate(editing.id, payload)}
            language={language}
          />
        )}
      </Modal>
    </div>
  );
}
