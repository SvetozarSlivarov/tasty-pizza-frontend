import React, { useState } from "react";
import styles from "../../../styles/Ingredients.module.css";

export default function IngredientForm({ types, initial, onCancel, onSave, onCreateType, busy }) {
    const [name, setName] = useState(initial?.name ?? "");
    const [typeId, setTypeId] = useState(initial?.type?.id ?? "");

    const [showTypeCreator, setShowTypeCreator] = useState(false);
    const [newTypeName, setNewTypeName] = useState("");
    const [typeBusy, setTypeBusy] = useState(false);
    const [typeErr, setTypeErr] = useState(null);

    const canSave = name.trim().length >= 2 && String(typeId).length > 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSave || busy) return;
        onSave({ name: name.trim(), typeId: Number(typeId) });
    };

    const createTypeQuick = async (e) => {
        e.preventDefault();
        const nm = newTypeName.trim();
        if (!nm) return;
        setTypeBusy(true);
        setTypeErr(null);
        try {
            const created = await onCreateType(nm);
            setTypeId(String(created.id));
            setShowTypeCreator(false);
            setNewTypeName("");
        } catch (err) {
            setTypeErr(err?.message || "Failed to create type");
        } finally {
            setTypeBusy(false);
        }
    };

    return (
        <form className={styles.panel} onSubmit={handleSubmit}>
            <div className={styles.row}>
                <label className={styles.label}>Name</label>
                <input
                    type="text"
                    placeholder="Name"
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                />
            </div>

            <div className={styles.row}>
                <label className={styles.label}>Type</label>
                <div className={styles.row} style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <select
                        className={styles.input}
                        value={String(typeId)}
                        onChange={(e) => setTypeId(e.target.value)}
                        disabled={busy || typeBusy}
                    >
                        <option value="">— choose type —</option>
                        {types.map((t) => (
                            <option key={t.id} value={String(t.id)}>{t.name}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className={styles.btn}
                        onClick={() => setShowTypeCreator((s) => !s)}
                        disabled={busy || typeBusy}
                    >
                        {showTypeCreator ? "Close" : "+ New Type"}
                    </button>
                </div>

                {showTypeCreator && (
                    <div className={styles.row} style={{ marginTop: 8, gap: 8 }}>
                        <input
                            className={styles.input}
                            placeholder="Type name (e.g. meat, cheese)"
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            disabled={typeBusy}
                        />
                        <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={createTypeQuick}
                            disabled={typeBusy || !newTypeName.trim()}
                        >
                            {typeBusy ? "Creating..." : "Create"}
                        </button>
                        {typeErr && <div className={styles.error} style={{ marginLeft: 8 }}>{typeErr}</div>}
                    </div>
                )}
            </div>

            <div className={styles.row} style={{ gap: 8 }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={!canSave || busy}>
                    Save
                </button>
                <button className={styles.btn} type="button" onClick={onCancel} disabled={busy}>
                    Cancel
                </button>
            </div>
        </form>
    );
}
