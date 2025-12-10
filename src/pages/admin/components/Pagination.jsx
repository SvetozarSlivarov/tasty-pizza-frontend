import React, { useMemo } from "react";
import styles from "../../../styles/Ingredients.module.css";

export default function Pagination({ page, totalPages, onPage }) {
    const pages = useMemo(() => {
        const arr = [];
        const maxAround = 2;
        const start = Math.max(1, page - maxAround);
        const end = Math.min(totalPages, page + maxAround);
        if (start > 1) arr.push(1);
        for (let p = start; p <= end; p++) arr.push(p);
        if (end < totalPages) arr.push(totalPages);
        return arr;
    }, [page, totalPages]);

    const go = (p) => onPage(Math.min(Math.max(1, p), totalPages));

    if (!totalPages || totalPages <= 1) return null;

    const visual = [];
    for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        visual.push(p);
        const next = pages[i + 1];
        if (next && next > p + 1) visual.push("…");
    }

    return (
        <div className={styles.pagination}>
            <button className={styles.btn} onClick={() => go(1)} disabled={page === 1}>« First</button>
            <button className={styles.btn} onClick={() => go(page - 1)} disabled={page === 1}>‹ Prev</button>

            <div className={styles.pageList}>
                {visual.map((p, i) => p === "…" ? (
                    <span key={`dots-${i}`} className={styles.ellipsis}>…</span>
                ) : (
                    <button
                        key={p}
                        className={`${styles.btn} ${p === page ? styles.pageActive : ""}`}
                        onClick={() => go(p)}
                    >
                        {p}
                    </button>
                ))}
            </div>

            <button className={styles.btn} onClick={() => go(page + 1)} disabled={page === totalPages}>Next ›</button>
            <button className={styles.btn} onClick={() => go(totalPages)} disabled={page === totalPages}>Last »</button>
        </div>
    );
}