import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin";
import styles from "../../styles/admin.module.css";

export default function Ingredients() {
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [show, setShow] = useState("all"); // active | all | deleted

  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");

  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId != null;

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [ingData, typeData] = await Promise.all([
        adminApi.listIngredientsWithType(show),
        adminApi.listIngredientTypes(),
      ]);

      setRows(Array.isArray(ingData) ? ingData : []);
      setTypes(Array.isArray(typeData) ? typeData : []);
    } catch (e) {
      setError(e?.message || "Failed to load ingredients");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const editingRow = useMemo(
    () => rows.find((r) => r.id === editingId) || null,
    [rows, editingId]
  );

  useEffect(() => {
    if (!editingRow) return;
    setName(editingRow.name ?? "");
    // при теб type може да е: type: {id,name}
    const tid = editingRow?.type?.id ?? editingRow?.typeId ?? "";
    setTypeId(tid ? String(tid) : "");
  }, [editingRow]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setTypeId("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const n = name.trim();
    const tid = Number(typeId);

    if (!n || !Number.isFinite(tid)) return;

    setBusy(true);
    setError(null);
    try {
      if (isEditing) {
        const updated = await adminApi.updateIngredient(editingId, {
          name: n,
          typeId: tid,
        });
        setRows((prev) =>
          prev.map((r) => (r.id === editingId ? (updated ?? r) : r))
        );
      } else {
        const created = await adminApi.createIngredient({ name: n, typeId: tid });
        if (created?.id != null) setRows((prev) => [created, ...prev]);
        else await load();
      }
      resetForm();
    } catch (e2) {
      setError(e2?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const softDelete = async (id) => {
    if (!window.confirm(`Delete ingredient #${id}?`)) return;

    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteIngredient(id);
      // ако сме на deleted view, reload; иначе махаме от list-а
      if (show === "deleted") await load();
      else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, deleted: true } : r)));
      if (editingId === id) resetForm();
    } catch (e) {
      setError(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const restore = async (id) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.restoreIngredient(id);
      if (show === "deleted") {
        // на deleted view -> махаме го
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        await load();
      }
    } catch (e) {
      setError(e?.message || "Restore failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Ingredients</h2>

        <div className={styles.headerRight}>
          <select
            className={styles.input}
            value={show}
            onChange={(e) => setShow(e.target.value)}
            disabled={busy}
          >
            <option value="active">Active</option>
            <option value="all">All</option>
            <option value="deleted">Deleted</option>
          </select>

          <button className={styles.btn} disabled={busy} onClick={load}>
            Reload
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.card} onSubmit={submit}>
        <div className={styles.grid2}>
          <div className={styles.row}>
            <label className={styles.label}>Name</label>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              placeholder="e.g. Mozzarella"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Type</label>
            <select
              className={styles.input}
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              disabled={busy}
            >
              <option value="">Select type…</option>
              {types.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btnPrimary}
            disabled={busy || !name.trim() || !typeId}
          >
            {isEditing ? "Update" : "Create"}
          </button>

          {isEditing && (
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Type</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={styles.td}>{r.id}</td>
                <td className={styles.td}>{r.name}</td>
                <td className={styles.td}>{r?.type?.name ?? "-"}</td>
                <td className={styles.td}>
                  {r.deleted ? "DELETED" : "ACTIVE"}
                </td>
                <td className={styles.td}>
                  <button
                    className={styles.btn}
                    disabled={busy}
                    onClick={() => setEditingId(r.id)}
                  >
                    Edit
                  </button>

                  {!r.deleted ? (
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      disabled={busy}
                      onClick={() => softDelete(r.id)}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      className={styles.btn}
                      disabled={busy}
                      onClick={() => restore(r.id)}
                    >
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td className={styles.td} colSpan={5}>
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
