import React from "react";
import styles from "../../../styles/Ingredients.module.css";

export default function IngredientTable({
                                            rows,
                                            busy,
                                            onEdit,
                                            onDelete,
                                            onRestore,
                                        }) {
    return (
        <div className={styles.tableWrap}>
            <table className={styles.table}>
                <thead>
                <tr>
                    <th className={styles.th} style={{ width: 80 }}>ID</th>
                    <th className={styles.th}>Name</th>
                    <th className={styles.th}>Type</th>
                    <th className={styles.th} style={{ width: 100 }}>Status</th>
                    <th className={styles.th} style={{ width: 220 }}>Actions</th>
                </tr>
                </thead>
                <tbody>
                {rows?.length ? rows.map((row) => (
                    <tr key={row.id}>
                        <td className={styles.td}>#{row.id}</td>
                        <td className={styles.td}>
                <span
                    title={row.deletedAt ? `Deleted at: ${row.deletedAt}` : ""}
                >
                  {row.name || "—"}
                </span>
                        </td>
                        <td className={styles.td}>
                            {row.type ? `${row.type.name} (#${row.type.id})` : "—"}
                        </td>
                        <td className={styles.td}>
                            {row.deleted ? (
                                <span className={styles.badgeDeleted}>Deleted</span>
                            ) : (
                                <span className={styles.badgeActive}>Active</span>
                            )}
                        </td>
                        <td className={styles.td}>
                            <div className={styles.actions}>
                                <button
                                    className={styles.btn}
                                    disabled={busy}
                                    onClick={() => onEdit?.(row.id)}
                                >
                                    Edit
                                </button>
                                {row.deleted ? (
                                    <button
                                        className={`${styles.btn} ${styles.btnRestore}`}
                                        disabled={busy}
                                        onClick={() => onRestore?.(row.id)}
                                        title="Restore ingredient"
                                    >
                                        Restore
                                    </button>
                                ) : (
                                    <button
                                        className={`${styles.btn} ${styles.btnDanger}`}
                                        disabled={busy}
                                        onClick={() => onDelete?.(row.id)}
                                        title="Soft delete ingredient"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </td>
                    </tr>
                )) : (
                    <tr>
                        <td className={styles.td} colSpan={5}>No ingredients.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}
