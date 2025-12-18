import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin";
import TypeTable from "./components/TypeTable";
import styles from "../../styles/admin.module.css";

export default function IngredientTypes() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);

  const isEditing = editingId != null;

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const data = await adminApi.listIngredientTypes();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load ingredient types");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const editingRow = useMemo(
    () => rows.find((r) => r.id === editingId) || null,
    [rows, editingId]
  );

  useEffect(() => {
    if (editingRow) setName(editingRow.name ?? "");
  }, [editingRow]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;

    setBusy(true);
    setError(null);
    try {
      if (isEditing) {
        const updated = await adminApi.updateIngredientType(editingId, { name: n });
        setRows((prev) =>
          prev.map((r) => (r.id === editingId ? (updated ?? { ...r, name: n }) : r))
        );
      } else {
        const created = await adminApi.createIngredientType({ name: n });
        // ако backend връща новия обект
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

  const deleteType = async (id) => {
    const row = rows.find((r) => r.id === id);
    const label = row?.name ? `"${row.name}"` : `#${id}`;

    if (!window.confirm(`Delete ingredient type ${label}?`)) return;

    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteIngredientType(id);
      setRows((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) resetForm();
    } catch (e) {
      // вероятно type е in-use
      setError(e?.message || "Delete failed (type may be in use)");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>Ingredient Types</h2>
        <button className={styles.btn} disabled={busy} onClick={load}>
          Reload
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.card} onSubmit={submit}>
        <div className={styles.row}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            placeholder="e.g. CHEESE"
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.btnPrimary} disabled={busy || !name.trim()}>
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
        <TypeTable
          rows={rows}
          busy={busy}
          onEdit={(id) => setEditingId(id)}
          onDelete={deleteType}
        />
      </div>
    </div>
  );
}
