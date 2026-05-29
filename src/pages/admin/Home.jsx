import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { adminApi } from "../../api/admin";
import { adminListOrders } from "../../api/adminOrders";
import styles from "../../styles/admin.module.css";

function getDbStatus(health) {
  return health?.components?.db?.status ?? health?.details?.db?.status ?? null;
}

function healthText(health) {
  if (!health || typeof health !== "object") return "API DOWN: invalid health response";
  const status = health?.status || "UNKNOWN";
  const db = getDbStatus(health);
  return db ? `API ${status} / DB ${db}` : `API ${status}`;
}

const quickLinks = [
  { to: "/admin/pizzas", title: "Pizzas", text: "Manage pizza catalog, variants, images, and ingredients.", tag: "Catalog" },
  { to: "/admin/pastas", title: "Pastas", text: "Manage pasta catalog, sauces, and add-ons.", tag: "Catalog" },
  { to: "/admin/drinks", title: "Drinks", text: "Manage drink names, prices, and images.", tag: "Catalog" },
  { to: "/admin/ingredients", title: "Ingredients", text: "Create, edit, delete, and restore ingredients.", tag: "Kitchen" },
  { to: "/admin/ingredient-types", title: "Ingredient Types", text: "Organize ingredients for forms and menus.", tag: "Kitchen" },
  { to: "/admin/orders", title: "Orders", text: "Review orders and update fulfillment status.", tag: "Operations" },
  { to: "/admin/users", title: "Users", text: "Manage user roles and deleted accounts.", tag: "Access" },
];

function countList(result) {
  return result.status === "fulfilled" && Array.isArray(result.value) ? result.value.length : null;
}

export default function AdminHome() {
  const { user } = useAuth();
  const [health, setHealth] = useState({ status: "CHECKING" });
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    pizzas: null,
    pastas: null,
    drinks: null,
    orders: null,
    users: null,
  });

  useEffect(() => {
    (async () => {
      setError(null);
      const results = await Promise.allSettled([
        adminApi.health(),
        adminApi.listPizzas({ withVariants: false }),
        adminApi.listPastas({ withDetails: false }),
        adminApi.listDrinks(),
        adminListOrders({ status: "all", page: 1, size: 1 }),
        adminApi.listUsers({ show: "active", page: 0, size: 1 }),
      ]);

      setStats({
        pizzas: countList(results[1]),
        pastas: countList(results[2]),
        drinks: countList(results[3]),
        orders: results[4].status === "fulfilled" ? results[4].value?.total ?? null : null,
        users: results[5].status === "fulfilled" ? results[5].value?.totalElements ?? null : null,
      });

      const healthResult = results[0];
      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value || { status: "UNKNOWN" });
      } else {
        setHealth({ status: "DOWN", error: healthResult.reason?.message || "Health check failed" });
      }

      const failed = results.slice(1).find((result) => result.status === "rejected");
      if (failed) {
        setError(failed.reason?.message || "Some admin data failed to load");
      }
    })();
  }, []);

  const status = String(health?.status).toUpperCase() === "UP" ? "ok" : "warn";
  const healthLabel = useMemo(() => {
    if (health?.error) return `API DOWN: ${health.error}`;
    return healthText(health);
  }, [health]);

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <section className={styles.dashboardHero}>
          <div>
            <div className={styles.eyebrow}>Admin workspace</div>
            <h1 className={styles.heroTitle}>Dashboard</h1>
            <p className={styles.subtitle}>
              Manage catalog content, order flow, ingredients, and user access from one place.
            </p>
          </div>

          <div className={`${styles.health} ${styles[status]}`} role="status" aria-live="polite">
            <span className={styles.pulse} aria-hidden />
            {healthLabel}
          </div>
        </section>

        {error && <div className={styles.error}>Dashboard data: {error}</div>}

        <section className={styles.statsGrid} aria-label="Admin summary">
          <div className={styles.statCard}><span>Pizzas</span><strong>{stats.pizzas ?? "-"}</strong></div>
          <div className={styles.statCard}><span>Pastas</span><strong>{stats.pastas ?? "-"}</strong></div>
          <div className={styles.statCard}><span>Drinks</span><strong>{stats.drinks ?? "-"}</strong></div>
          <div className={styles.statCard}><span>Orders</span><strong>{stats.orders ?? "-"}</strong></div>
          <div className={styles.statCard}><span>Users</span><strong>{stats.users ?? "-"}</strong></div>
        </section>

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
                  <p className={styles.subtitle}>You are not logged in.</p>
                )}
              </div>
            </section>

            <section className={styles.card} style={{ marginTop: 12 }}>
              <div className={styles.body}>
                <h2 className={styles.sectionTitle}>Admin notes</h2>
                <p className={styles.subtitle}>
                  Check deleted views before recreating products. Restoring keeps product IDs and order references intact.
                </p>
              </div>
            </section>
          </div>

          <section className={styles.card}>
            <div className={styles.body}>
              <h2 className={styles.sectionTitle}>Quick links</h2>
              <div className={styles.links} role="list">
                {quickLinks.map((link) => (
                  <Link className={styles.item} to={link.to} role="listitem" key={link.to}>
                    <span>
                      <strong>{link.title}</strong>
                      <small>{link.text}</small>
                    </span>
                    <span className={styles.tag}>{link.tag}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
