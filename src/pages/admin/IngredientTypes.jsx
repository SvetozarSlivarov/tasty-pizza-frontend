import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin";
import styles from "../../styles/Ingredients.module.css";
import TypeForm from "./components/TypeForm";
import TypeToolbar from "./components/TypeToolbar";
import TypeTable from "./components/TypeTable";
import Pagination from "./components/Pagination";

export default function IngredientTypes() {
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    // UI state
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // controls
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState("name");
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const refresh = async () => {
        setBusy(true); setError(null);
        try {
            const types = await adminApi.listIngredientTypes();
            setRows(types);
        } catch (e) {
            setError(e?.message || "Failed to load types");
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => { refresh(); }, []);
    
    const saveCreate = async ({ name }) => {
        setBusy(true); setError(null);
        try {
            const created = await adminApi.createIngredientType({ name });
            setRows(prev => [created, ...prev]);
            setCreating(false);
            setPage(1);
        } catch (e) {
            setError(e?.message || "Create failed");
        } finally {
            setBusy(false);
        }
    };

    const saveEdit = async (id, { name }) => {
        setBusy(true); setError(null);
        try {
            const updated = await adminApi.updateIngredientType(id, { name });
            setRows(prev => prev.map(r => (r.id === id ? updated : r)));
            setEditingId(null);
        } catch (e) {
            setError(e?.message || "Update failed");
        } finally {
            setBusy(false);
        }
    };

    const filteredSorted = useMemo(() => {
        const s = search.trim().toLowerCase();
        const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

        let list = rows;
        if (s) list = list.filter(r => r.name?.toLowerCase().includes(s));

        const dir = sortDir === "asc" ? 1 : -1;
        list = [...list].sort((a, b) => {
            if (sortKey === "id") return (a.id - b.id) * dir;
            return collator.compare(a.name || "", b.name || "") * dir;
        });

        return list;
    }, [rows, search, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paged = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredSorted.slice(start, start + pageSize);
    }, [filteredSorted, currentPage, pageSize]);

    useEffect(() => { setPage(1); }, [search]);

    return (
        <div className={styles.page}>
            <div className={styles.headerRow}>
                <h1 className={styles.title}>Ingredient Types</h1>
                <div className={styles.right} style={{ gap: 8 }}>
                    <button className={styles.btn} onClick={refresh} disabled={busy}>Refresh</button>
                    <button className={styles.btn} disabled={busy} onClick={() => setCreating(true)}>+ New Type</button>
                </div>
            </div>

            <TypeToolbar
                search={search}
                onSearch={setSearch}
                sortKey={sortKey}
                sortDir={sortDir}
                onSortKey={setSortKey}
                onSortDir={setSortDir}
                pageSize={pageSize}
                onPageSize={setPageSize}
                disabled={busy}
            />

            {error && <div className={`${styles.panel} ${styles.error}`}>Error: {error}</div>}

            {creating && (
                <TypeForm
                    onCancel={() => setCreating(false)}
                    onSave={saveCreate}
                    busy={busy}
                    mode="create"
                />
            )}

            {editingId && (
                <TypeForm
                    initial={rows.find(r => r.id === editingId)}
                    onCancel={() => setEditingId(null)}
                    onSave={(payload) => saveEdit(editingId, payload)}
                    busy={busy}
                    mode="edit"
                />
            )}

            <div className={styles.panel}>
                <div className={styles.tableWrap}>
                    <TypeTable
                        rows={paged}
                        busy={busy}
                        onEdit={(id) => setEditingId(id)}
                        onDelete={null}
                    />
                </div>
                <Pagination page={currentPage} totalPages={totalPages} onPage={setPage} />
            </div>
        </div>
    );
}
