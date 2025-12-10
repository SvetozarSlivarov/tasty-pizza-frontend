import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { adminApi } from "../../api/admin";
import styles from "../../styles/admin.module.css";

export default function AdminHome() {
    const { user } = useAuth();
    const [health, setHealth] = useState("…");
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await adminApi.health();
                setHealth(typeof res === "string" ? res : "OK");
            } catch (e) {
                setError(e?.message || "Health check failed");
            }
        })();
    }, []);

    const status = error
        ? "err"
        : String(health).toUpperCase().includes("OK")
            ? "ok"
            : "warn";

    const healthLabel = useMemo(() => {
        if (error) return `Error: ${error}`;
        return typeof health === "string" ? health : "OK";
    }, [health, error]);

    return (
        <div className={styles.page}>
            <div className={styles.header} />
            <div className={styles.wrap}>
                <div className={styles.title}>
                    <span>Admin Dashboard</span>
                    <span className={styles.badge}>v0.1</span>
                </div>

                <div className={styles.grid}>
                    <div>
                        <section className={styles.card}>
                            <div className={styles.body}>
                                <h2 className={styles.sectionTitle}>Your session</h2>
                                {user ? (
                                    <dl className={styles.kv} aria-label="Current user">
                                        <dt className={styles.kvKey}>Username</dt>
                                        <dd className={styles.kvVal}>{user.username}</dd>

                                        <dt className={styles.kvKey}>Full name</dt>
                                        <dd className={styles.kvVal}>{user.fullname || "-"}</dd>

                                        <dt className={styles.kvKey}>Role</dt>
                                        <dd className={styles.kvVal}>{user.role}</dd>
                                    </dl>
                                ) : (
                                    <p>You are not logged in. Use the Login page.</p>
                                )}
                            </div>
                        </section>

                        <section className={styles.card} style={{ marginTop: 12 }}>
                            <div className={styles.body}>
                                <h2 className={styles.sectionTitle}>System health</h2>
                                <div className={`${styles.health} ${styles[status]}`} role="status" aria-live="polite">
                                    <span className={styles.pulse} aria-hidden />
                                    {healthLabel}
                                </div>
                            </div>
                        </section>
                    </div>

                    <section className={styles.card}>
                        <div className={styles.body}>
                            <h2 className={styles.sectionTitle}>Quick links</h2>
                            <div className={styles.links} role="list">
                                <a className={styles.item} href="/admin/pizzas" role="listitem">
                                    <span>Catalog → Pizzas</span>
                                </a>
                                <a className={styles.item} href="/admin/drinks" role="listitem">
                                    <span>Catalog → Drinks</span>
                                </a>
                                <a className={styles.item} href="/admin/ingredients" role="listitem">
                                    <span>Ingredients</span>
                                </a>
                                <a className={styles.item} href="/admin/ingredient-types" role="listitem">
                                    <span>Ingredient Types</span>
                                </a>
                                <a className={styles.item} href="/admin/orders" role="listitem">
                                    <span>Orders (transitions)</span>
                                </a>
                                <a className={styles.item} href="/admin/users" role="listitem">
                                    <span>Users (roles)</span>
                                </a>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
