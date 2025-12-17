import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
        await adminApi.listPizzas({ withVariants: false });
        setHealth("OK");
      } catch (e) {
        setError(e?.message || "API check failed");
      }
    })();
  }, []);

  const status = error ? "err" : String(health).toUpperCase().includes("OK") ? "ok" : "warn";

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
                <Link className={styles.item} to="/admin/pizzas" role="listitem">
                  <span>Catalog → Pizzas</span>
                </Link>
                <Link className={styles.item} to="/admin/drinks" role="listitem">
                  <span>Catalog → Drinks</span>
                </Link>
                <Link className={styles.item} to="/admin/ingredients" role="listitem">
                  <span>Ingredients</span>
                </Link>
                <Link className={styles.item} to="/admin/ingredient-types" role="listitem">
                  <span>Ingredient Types</span>
                </Link>

                {/* временно ги скриваме, докато няма backend */}
                {/* <Link className={styles.item} to="/admin/orders" role="listitem">
                  <span>Orders (transitions)</span>
                </Link>
                <Link className={styles.item} to="/admin/users" role="listitem">
                  <span>Users (roles)</span>
                </Link> */}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}