import React from "react";
import styles from "../../../styles/Ingredients.module.css";

export default function TypeTable({ rows, busy, onEdit, onDelete }) {
    return (
        <table className={styles.table}>
            <thead>
            <tr>
                <th className={styles.th} style={{ width: 100 }}>ID</th>
                <th className={styles.th}>Name</th>
                <th className={styles.th} style={{ width: 220 }}>Actions</th>
            </tr>
            </thead>
            <tbody>
            {rows.length ? rows.map(r => (
                <tr key={r.id}>
                    <td className={styles.td}>{r.id}</td>
                    <td className={styles.td}>{r.name}</td>
                    <td className={styles.td}>
                        <button className={styles.btn} disabled={busy} onClick={() => onEdit(r.id)}>Edit</button>
                        <button className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={() => onDelete(r.id)}>Delete</button>
                    </td>
                </tr>
            )) : (
                <tr><td className={styles.td} colSpan={3}>No types.</td></tr>
            )}
            </tbody>
        </table>
    );
}
