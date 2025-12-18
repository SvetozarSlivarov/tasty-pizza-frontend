import { useEffect, useMemo, useState } from "react";
import styles from "../../styles/Pizzas.module.css";
import { adminApi } from "../../api/admin";
import PizzaForm, { normalizePizza } from "./components/PizzaForm";
import Modal from "./components/Modal";

export default function PizzasAdmin() {
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
          ? await adminApi.listDeletedPizzas({ withVariants: true })
          : await adminApi.listPizzas({ withVariants: true });

      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message || "Failed to load pizzas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setQ("");
    load(view);
  }, [view]);

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
      const full = await adminApi.getPizza(row.id);
      setEditing({ id: full?.id ?? row.id, ...normalizePizza(full) });
    } catch (_) {
      setEditing({ id: row.id, ...normalizePizza(row) });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!window.confirm("Delete this pizza? (soft delete)")) return;
    setBusy(true);
    try {
      await adminApi.deletePizza(id);
      setView("active");
      await load("active");
    } catch (e) {
      alert(e?.message || "Delete failed");
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
      alert(e?.message || "Restore failed");
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
      alert(e?.message || "Create failed");
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
      alert(e?.message || "Update failed");
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
        <div className={styles.title}>Pizzas</div>

        <div className={styles.actions}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={styles.btn}
              onClick={() => toggleView("active")}
              disabled={busy || view === "active"}
              title="Show active pizzas"
            >
              Active
            </button>
            <button
              className={styles.btn}
              onClick={() => toggleView("deleted")}
              disabled={busy || view === "deleted"}
              title="Show deleted pizzas"
            >
              Deleted
            </button>
          </div>

          <input
            className={styles.input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            disabled={busy || loading}
            style={{ maxWidth: 200 }}
          />

          {view === "active" && (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setCreating(true)}
              disabled={busy}
            >
              + New pizza
            </button>
          )}
        </div>
      </div>

      {error && <div className={`${styles.panel} ${styles.error}`}>Error: {error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Image</th>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Price</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className={styles.td} colSpan={5}>
                  Loading…
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
                      <span className={styles.note}>no image</span>
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
                            Edit
                          </button>
                          <button
                            className={styles.btn}
                            onClick={() => onDelete(r.id)}
                            disabled={busy}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          className={styles.btn}
                          onClick={() => onRestore(r.id)}
                          disabled={busy}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className={styles.td} colSpan={5}>
                  {q.trim() ? "No matching pizzas." : "No records."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal title="Create pizza" isOpen={creating} onClose={() => setCreating(false)}>
        <PizzaForm
          mode="create"
          busy={busy}
          onCancel={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal title="Edit pizza" isOpen={Boolean(editing)} onClose={() => setEditing(null)}>
        {editing && (
          <PizzaForm
            mode="edit"
            busy={busy}
            initial={editing}
            pizzaId={editing.id}
            onCancel={() => setEditing(null)}
            onSubmit={(payload) => handleUpdate(editing.id, payload)}
          />
        )}
      </Modal>
    </div>
  );
}
