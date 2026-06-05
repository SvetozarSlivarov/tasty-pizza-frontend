import { useEffect, useMemo, useState } from "react";
import styles from "../../styles/Drinks.module.css";
import { adminApi } from "../../api/admin";
import { useLanguage } from "../../context/LanguageContext";
import { fileToBase64 } from "../../utils/fileToBase64";
import DrinkForm, { normalizeDrink } from "./components/DrinkForm";
import Modal from "./components/Modal";

export default function DrinksAdmin() {
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
          ? await adminApi.listDeletedDrinks(language)
          : await adminApi.listDrinks(language);

      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message ?? String(e));
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
      const full = await adminApi.getDrink(row.id, language);
      setEditing({ id: full?.id ?? row.id, ...normalizeDrink(full) });
    } catch (_) {
      setEditing({ id: row.id, ...normalizeDrink(row) });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm(t("Delete this drink? (soft delete)"))) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteDrink(id);
      setView("active");
      await load("active");
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(id) {
    setBusy(true);
    setError(null);
    try {
      await adminApi.restoreDrink(id);
      await load(view);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(payload, imageFile) {
    setBusy(true);
    setError(null);
    try {
      let imageBase64 = null;
      if (imageFile) {
        const { base64 } = await fileToBase64(imageFile);
        imageBase64 = base64;
      }

      await adminApi.createDrink({
        name: payload.name,
        description: payload.description,
        basePrice: payload.basePrice,
        imageBase64,
        translations: payload.translations,
      });

      setCreating(false);
      setView("active");
      await load("active");
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onUpdate(id, payload, imageFile) {
    setBusy(true);
    setError(null);
    try {
      let imageBase64 = null;
      if (imageFile) {
        const { base64 } = await fileToBase64(imageFile);
        imageBase64 = base64;
      }

      await adminApi.updateDrink(id, {
        name: payload.name,
        description: payload.description,
        basePrice: payload.basePrice,
        imageBase64,
      });

      setEditing(null);
      await load(view);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.h1}>{t("Drinks")}</h1>

      {error && <div className={`${styles.panel} ${styles.error}`}>{error}</div>}

      <div className={styles.panel}>
        <div className={styles.row}>
          <button
            className={styles.btn}
            onClick={() => setView("active")}
            disabled={busy || view === "active"}
            title={t("Show active drinks")}
          >
            {t("Active")}
          </button>
          <button
            className={styles.btn}
            onClick={() => setView("deleted")}
            disabled={busy || view === "deleted"}
            title={t("Show deleted drinks")}
          >
            {t("Deleted")}
          </button>

          {/* Search input */}
          <input
            className={styles.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search by name...")}
            disabled={busy || loading}
            style={{ maxWidth: 260 }}
          />

          {view === "active" && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setCreating(true)}
              disabled={busy || loading}
            >
              + {t("New drink")}
            </button>
          )}

          <button
            className={styles.btn}
            onClick={() => load(view)}
            disabled={busy || loading}
          >
            {t("Reload")}
          </button>
        </div>
      </div>

      <div className={styles.panel}>
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
              ) : filteredRows.length ? (
                filteredRows.map((r) => (
                  <tr
                    key={r.id}
                    className={view === "deleted" ? styles.rowMuted : undefined}
                  >
                    <td className={styles.td}>{r.id}</td>
                    <td className={styles.td}>
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt={r.name || "drink"}
                          className={styles.img}
                        />
                      ) : (
                        <span className={styles.badge}>{t("no image")}</span>
                      )}
                    </td>
                    <td className={styles.td}>{r.name}</td>
                    <td className={styles.td}>
                      EUR {Number(r.basePrice ?? 0).toFixed(2)}
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
                    {q.trim() ? t("No matching drinks.") : t("No records.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title={t("New drink")} isOpen={creating} onClose={() => setCreating(false)}>
        <DrinkForm
          initial={normalizeDrink()}
          onSubmit={(payload, img) => onCreate(payload, img)}
          onCancel={() => setCreating(false)}
        />
      </Modal>

      <Modal
        title={t("Edit drink")}
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <DrinkForm
            initial={editing}
            onSubmit={(payload, img) => onUpdate(editing.id, payload, img)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
