import React from "react";
import styles from "../../../styles/Ingredients.module.css";

export default function TypeToolbar({
                                        search, onSearch,
                                        sortKey, sortDir, onSortKey, onSortDir,
                                        pageSize, onPageSize,
                                        disabled
                                    }) {
    return (
        <div className={styles.panel} style={{ display: "grid", gap: 12, gridTemplateColumns: "2fr 1fr 1fr", alignItems: "center" }}>
            <div className={styles.row}>
                <label className={styles.label}>Search</label>
                <input
                    className={styles.input}
                    placeholder="Search by name"
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    disabled={disabled}
                />
            </div>

            <div className={styles.row}>
                <label className={styles.label}>Sort</label>
                <select
                    className={styles.input}
                    value={sortKey}
                    onChange={(e) => onSortKey(e.target.value)}
                    disabled={disabled}
                >
                    <option value="name">Name</option>
                    <option value="id">ID</option>
                </select>

                <select
                    className={styles.input}
                    value={sortDir}
                    onChange={(e) => onSortDir(e.target.value)}
                    disabled={disabled}
                >
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                </select>
            </div>

            <div className={styles.row}>
                <label className={styles.label}>Page size</label>
                <select
                    className={styles.input}
                    value={String(pageSize)}
                    onChange={(e) => onPageSize(Number(e.target.value))}
                    disabled={disabled}
                >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                </select>
            </div>
        </div>
    );
}
