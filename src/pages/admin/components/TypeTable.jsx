import styles from "../../../styles/table.module.css";

export default function TypeTable({ rows = [], busy = false, onEdit, onDelete }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.th}>ID</th>
          <th className={styles.th}>Name</th>
          <th className={styles.th}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={styles.td}>{r.id}</td>
            <td className={styles.td}>{r.name}</td>

            <td className={styles.td}>
              <button
                className={styles.btn}
                disabled={busy}
                onClick={() => onEdit?.(r.id)}
              >
                Edit
              </button>

              {onDelete && (
                <button
                  className={`${styles.btn} ${styles.btnDanger}`}
                  disabled={busy}
                  onClick={() => onDelete(r.id)}
                >
                  Delete
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
