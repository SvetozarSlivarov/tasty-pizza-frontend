import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin";
import IngredientTable from "./components/IngredientTable";
import IngredientForm from "./components/IngredientForm";
import Pagination from "./components/Pagination";
import styles from "../../styles/Ingredients.module.css";
import "../../styles/modal.css";

export default function IngredientsAdminPage() {
    const [rows, setRows] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    // filters
    const [showDeleted, setShowDeleted] = useState(true);
    const [query, setQuery] = useState("");

    // pagination
    const [perPage, setPerPage] = useState(10);
    const [page, setPage] = useState(1);

    // types for the form (needed for create/edit)
    const [types, setTypes] = useState([]);
    const [typesBusy, setTypesBusy] = useState(false);

    // modal state
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const editingRow = useMemo(
        () => rows.find((r) => r.id === editingId) || null,
        [rows, editingId]
    );

    useEffect(() => { setPage(1); }, [query, showDeleted]);

    const loadIngredients = async () => {
        setBusy(true);
        setError(null);
        try {
            const data = await adminApi.listIngredients();
            setRows(Array.isArray(data) ? data : data?.items || []);
        } catch (e) {
            setError(e?.message || "Failed to load ingredients");
        } finally {
            setBusy(false);
        }
    };

    const loadTypes = async () => {
        setTypesBusy(true);
        try {
            const data = await adminApi.listIngredientTypes();
            setTypes(Array.isArray(data) ? data : data?.items || []);
        } catch (e) {
            console.error(e);
        } finally {
            setTypesBusy(false);
        }
    };

    useEffect(() => {
        loadIngredients();
        loadTypes();
    }, []);

    const removeRow = async (id) => {
        if (!window.confirm("Delete ingredient?")) return;
        setBusy(true);
        setError(null);
        try {
            await adminApi.deleteIngredient(id);
            setRows((prev) =>
                prev.map((r) =>
                    r.id === id ? { ...r, deleted: true, deletedAt: new Date().toISOString() } : r
                )
            );
        } catch (e) {
            setError(e?.message || "Delete failed");
        } finally {
            setBusy(false);
        }
    };

    const restoreRow = async (id) => {
        setBusy(true);
        setError(null);
        try {
            await adminApi.restoreIngredient(id);
            setRows((prev) =>
                prev.map((r) => (r.id === id ? { ...r, deleted: false, deletedAt: null } : r))
            );
        } catch (e) {
            setError(e?.message || "Restore failed");
        } finally {
            setBusy(false);
        }
    };

    const onEdit = (id) => {
        setEditingId(id);
    };

    // client filters
    const filtered = useMemo(() => {
        let list = showDeleted ? rows : rows.filter((r) => !r.deleted);
        const q = (query || "").trim().toLowerCase();
        if (q) {
            list = list.filter(
                (r) =>
                    String(r.id).includes(q) ||
                    (r.name || "").toLowerCase().includes(q) ||
                    (r.type?.name || "").toLowerCase().includes(q)
            );
        }
        return list;
    }, [rows, showDeleted, query]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const paged = useMemo(() => filtered.slice(start, end), [filtered, start, end]);

    const handleCreateSave = async ({ name, typeId }) => {
        setBusy(true);
        try {
            const created = await adminApi.createIngredient({ name, typeId });
            setRows((prev) => [{ ...created, deleted: false }, ...prev]);
            setCreating(false);
        } catch (e) {
            alert(e?.message || "Create failed");
        } finally {
            setBusy(false);
        }
    };

    const handleEditSave = async ({ name, typeId }) => {
        if (!editingId) return;
        setBusy(true);
        try {
            const updated = await adminApi.updateIngredient(editingId, { name, typeId });
            setRows((prev) =>
                prev.map((r) => (r.id === editingId ? { ...r, ...updated } : r))
            );
            setEditingId(null);
        } catch (e) {
            alert(e?.message || "Update failed");
        } finally {
            setBusy(false);
        }
    };

    const handleCreateType = async (typeName) => {
        const res = await adminApi.createIngredientType({ name: typeName });
        setTypes((prev) => [{ id: res.id, name: res.name }, ...prev]);
        return res; // { id, name }
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.header}>
                <h1 className={styles.title}>Ingredients (Admin)</h1>
                <div className={`${styles.right} ${styles.headerButtons}`}>
                    <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => setCreating(true)}
                        disabled={busy}
                    >
                        + New Ingredient
                    </button>
                    <button className={styles.btn} onClick={loadIngredients} disabled={busy}>
                        Refresh
                    </button>
                </div>
            </div>

            <div className={styles.toolbar}>
                <input
                    className={styles.input}
                    placeholder="Search by id, name or type..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        checked={showDeleted}
                        onChange={(e) => setShowDeleted(e.target.checked)}
                    />
                    <span>Show deleted</span>
                </label>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div
                className={styles.toolbar}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0" }}
            >
                <div>
                    <label style={{ marginRight: 8 }}>Per page:</label>
                    <select
                        value={perPage}
                        onChange={(e) => setPerPage(parseInt(e.target.value, 10) || 10)}
                        disabled={busy}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
                <div>
                    {filtered.length} items • page {currentPage} / {totalPages}
                </div>
            </div>

            <IngredientTable
                rows={paged}
                busy={busy}
                onEdit={onEdit}
                onDelete={removeRow}
                onRestore={restoreRow}
            />

            <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} />

            {creating && (
                <div className="modal-backdrop" onClick={() => !busy && setCreating(false)}>
                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-title">Create ingredient</div>
                        <IngredientForm
                            types={types}
                            initial={null}
                            busy={busy || typesBusy}
                            onCancel={() => setCreating(false)}
                            onSave={handleCreateSave}
                            onCreateType={handleCreateType}
                        />
                    </div>
                </div>
            )}

            {editingId && editingRow && (
                <div className="modal-backdrop" onClick={() => !busy && setEditingId(null)}>
                    <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-title">Edit ingredient #{editingRow.id}</div>
                        <IngredientForm
                            types={types}
                            initial={editingRow}
                            busy={busy || typesBusy}
                            onCancel={() => setEditingId(null)}
                            onSave={handleEditSave}
                            onCreateType={handleCreateType}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
