import { useMemo, useState } from "react";
import styles from "../../../styles/Ingredients.module.css";

export default function TypeForm({ initial, onSave, onCancel, busy, mode }) {
    const [name, setName] = useState(() => initial?.name ?? "");

    const canSave = useMemo(() => name.trim().length > 0, [name]);

    const submit = (e) => {
        e.preventDefault();
        if (!canSave) return;
        onSave({ name: name.trim() });
    };

    return (
        <form className={styles.form} onSubmit={submit}>
            <div className={styles.field}>
                <label>Name</label>
                <input
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Type name…"
                    required
                />
            </div>

            <div className={styles.row}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy || !canSave}>
                    {busy ? "Saving..." : (mode === "create" ? "Create" : "Save")}
                </button>
                <button className={styles.btn} type="button" onClick={onCancel} disabled={busy}>
                    Cancel
                </button>
            </div>
        </form>
    );
}
