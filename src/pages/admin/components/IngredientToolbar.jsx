import React from "react";
import styles from "../../../styles/Ingredients.module.css";

export default function IngredientToolbar({
                                              types,
                                              search, onSearch,
                                              typeFilterId, onTypeFilter,
                                              sortKey, sortDir, onSortKey, onSortDir,
                                              pageSize, onPageSize,
                                              disabled
                                          }) {
    return (
        <div className={styles.panel} style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr 1fr", alignItems: "center" }}>
            <div className={styles.row}>
                <label className={styles.label}>Search</label>
                <input
                    className={styles.input}
                    placeholder="Search by name or type"
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    disabled={disabled}
                />
            </div>

            <div className={styles.row}>
                <label className={styles.label}>Type</label>
                <select
                    className={styles.input}
                    value={String(typeFilterId)}
                    onChange={(e) => onTypeFilter(e.target.value)}
                    disabled={disabled}
                >
                    <option value="">All</option>
                    {types.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                </select>
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
                    <option value="type">Type</option>
                    <option value="id">ID</option>
                </select>
            </div>

            <div className={styles.row}>
                <label className={styles.label}>Direction</label>
                <select
                    className={styles.input}
                    value={sortDir}
                    onChange={(e) => onSortDir(e.target.value)}
                    disabled={disabled}
                >
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                </select>

                <label className={styles.label} style={{ marginLeft: 8 }}>Page size</label>
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
