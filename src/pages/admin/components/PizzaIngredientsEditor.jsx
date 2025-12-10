import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../api/admin";
import styles from "../../../styles/Pizzas.module.css";


export default function PizzaIngredientsEditor({ pizzaId }) {
    const [allIngredients, setAllIngredients] = useState([]);
    const [baseList, setBaseList] = useState([]);
    const [allowedList, setAllowedList] = useState([]);

    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState(null);
    const [search, setSearch] = useState("");

    const loadAll = async () => {
        setBusy(true); setErr(null);
        try {
            const [catalog, base, allowed] = await Promise.all([
                adminApi.listIngredients(),
                adminApi.listPizzaIngredients(pizzaId),
                adminApi.listAllowedIngredients(pizzaId),
            ]);
            setAllIngredients(catalog);
            setBaseList(base);
            setAllowedList(allowed);
        } catch (e) {
            setErr(e?.message || "Failed to load pizza ingredients");
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => { if (pizzaId) loadAll(); }, [pizzaId]);

    const baseIds = useMemo(() => new Set(baseList.map(b => b.ingredientId)), [baseList]);
    const allowedIds = useMemo(() => new Set(allowedList.map(a => a.id)), [allowedList]);

    const filteredCatalog = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return allIngredients;
        return allIngredients.filter(x =>
            x.name?.toLowerCase().includes(s) ||
            x.type?.name?.toLowerCase().includes(s)
        );
    }, [allIngredients, search]);

    const addBase = async (ingredientId, isRemovable = true) => {
        setBusy(true); setErr(null);
        try {
            await adminApi.addPizzaIngredient(pizzaId, { ingredientId, isRemovable });
            const added = allIngredients.find(i => i.id === ingredientId);
            setBaseList(prev => [...prev, {
                ingredientId,
                name: added?.name ?? `#${ingredientId}`,
                type: added?.type ?? null,
                isRemovable
            }]);
        } catch (e) {
            setErr(e?.message || "Cannot add base ingredient");
        } finally { setBusy(false); }
    };

    const toggleRemovable = async (ingredientId, next) => {
        setBusy(true); setErr(null);
        try {
            await adminApi.updatePizzaIngredient(pizzaId, ingredientId, { isRemovable: next });
            setBaseList(prev => prev.map(b => b.ingredientId === ingredientId ? { ...b, isRemovable: next } : b));
        } catch (e) {
            setErr(e?.message || "Cannot update removability");
        } finally { setBusy(false); }
    };

    const removeBase = async (ingredientId) => {
        if (!window.confirm("Remove base ingredient?")) return;
        setBusy(true); setErr(null);
        try {
            await adminApi.removePizzaIngredient(pizzaId, ingredientId);
            setBaseList(prev => prev.filter(b => b.ingredientId !== ingredientId));
        } catch (e) {
            setErr(e?.message || "Cannot remove base ingredient");
        } finally { setBusy(false); }
    };

    const allow = async (ingredientId) => {
        setBusy(true); setErr(null);
        try {
            await adminApi.allowIngredientForPizza(pizzaId, { ingredientId });
            const ing = allIngredients.find(i => i.id === ingredientId);
            setAllowedList(prev => [...prev, ing]);
        } catch (e) {
            setErr(e?.message || "Cannot allow ingredient");
        } finally { setBusy(false); }
    };

    const disallow = async (ingredientId) => {
        if (!window.confirm("Disallow ingredient?")) return;
        setBusy(true); setErr(null);
        try {
            await adminApi.disallowIngredientForPizza(pizzaId, ingredientId);
            setAllowedList(prev => prev.filter(a => a.id !== ingredientId));
        } catch (e) {
            setErr(e?.message || "Cannot disallow ingredient");
        } finally { setBusy(false); }
    };

    return (
        <div className={styles.panel}>
            <div className={styles.headerRow} style={{ marginBottom: 12 }}>
                <h2 className={styles.title} style={{ fontSize: 20 }}>Ingredients for pizza #{pizzaId}</h2>
                <div className={styles.right} style={{ gap: 8 }}>
                    <input
                        className={styles.input}
                        placeholder="Search in catalog (name or type)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        disabled={busy}
                    />
                    <button className={styles.btn} onClick={loadAll} disabled={busy}>Refresh</button>
                </div>
            </div>

            {err && <div className={`${styles.panel} ${styles.error}`}>Error: {err}</div>}

            <div className={styles.row} style={{ alignItems: "stretch" }}>
                {/* LEFT: Base ingredients */}
                <div style={{ flex: 1, minWidth: 320 }}>
                    <div className={styles.panel}>
                        <div className={styles.row} style={{ justifyContent: "space-between" }}>
                            <h3 className={styles.title} style={{ fontSize: 18 }}>Base ingredients</h3>
                        </div>

                        <table className={styles.table}>
                            <thead>
                            <tr>
                                <th className={styles.th}>Name</th>
                                <th className={styles.th} style={{ width: 140 }}>Type</th>
                                <th className={styles.th} style={{ width: 140 }}>Removable</th>
                                <th className={styles.th} style={{ width: 160 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {baseList.length ? baseList.map(b => (
                                <tr key={b.ingredientId}>
                                    <td className={styles.td}>{b.name}</td>
                                    <td className={styles.td}>{b.type ? b.type.name : "—"}</td>
                                    <td className={styles.td}>
                                        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={!!b.isRemovable}
                                                onChange={(e) => toggleRemovable(b.ingredientId, e.target.checked)}
                                                disabled={busy}
                                            />
                                            <span>{b.isRemovable ? "Yes" : "No"}</span>
                                        </label>
                                    </td>
                                    <td className={styles.td}>
                                        <button className={styles.btn} disabled={busy} onClick={() => toggleRemovable(b.ingredientId, !b.isRemovable)}>
                                            Toggle
                                        </button>
                                        <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => removeBase(b.ingredientId)}>
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td className={styles.td} colSpan={4}>No base ingredients yet.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style={{ flex: 1, minWidth: 320 }}>
                    <div className={styles.panel}>
                        <div className={styles.row} style={{ justifyContent: "space-between" }}>
                            <h3 className={styles.title} style={{ fontSize: 18 }}>Allowed ingredients</h3>
                        </div>

                        <table className={styles.table}>
                            <thead>
                            <tr>
                                <th className={styles.th}>Name</th>
                                <th className={styles.th} style={{ width: 140 }}>Type</th>
                                <th className={styles.th} style={{ width: 160 }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {allowedList.length ? allowedList.map(a => (
                                <tr key={a.id}>
                                    <td className={styles.td}>{a.name}</td>
                                    <td className={styles.td}>{a.type ? a.type.name : "—"}</td>
                                    <td className={styles.td}>
                                        <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => disallow(a.id)}>
                                            Disallow
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td className={styles.td} colSpan={3}>No allowed ingredients yet.</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className={styles.panel}>
                <h3 className={styles.title} style={{ fontSize: 18, marginBottom: 8 }}>Catalog</h3>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                        <tr>
                            <th className={styles.th} style={{ width: 80 }}>ID</th>
                            <th className={styles.th}>Name</th>
                            <th className={styles.th} style={{ width: 160 }}>Type</th>
                            <th className={styles.th} style={{ width: 260 }}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredCatalog.length ? filteredCatalog.map(i => (
                            <tr key={i.id}>
                                <td className={styles.td}>{i.id}</td>
                                <td className={styles.td}>{i.name}</td>
                                <td className={styles.td}>{i.type ? `${i.type.name}` : "—"}</td>
                                <td className={styles.td}>
                                    <button
                                        className={styles.btn}
                                        disabled={busy || baseIds.has(i.id)}
                                        onClick={() => addBase(i.id, true)}
                                        title={baseIds.has(i.id) ? "Already base" : "Add as base (removable)"}
                                    >
                                        + Base (removable)
                                    </button>
                                    <button
                                        className={styles.btn}
                                        disabled={busy || baseIds.has(i.id)}
                                        onClick={() => addBase(i.id, false)}
                                        title={baseIds.has(i.id) ? "Already base" : "Add as base (not removable)"}
                                        style={{ marginLeft: 6 }}
                                    >
                                        + Base (fixed)
                                    </button>
                                    <button
                                        className={styles.btn}
                                        disabled={busy || allowedIds.has(i.id)}
                                        onClick={() => allow(i.id)}
                                        title={allowedIds.has(i.id) ? "Already allowed" : "Allow as extra"}
                                        style={{ marginLeft: 6 }}
                                    >
                                        + Allow
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td className={styles.td} colSpan={4}>No ingredients found.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
