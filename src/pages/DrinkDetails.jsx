import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { productApi } from "../api/catalog";
import { useCart } from "../context/CartContext";
import styles from "../styles/DrinkDetails.module.css";

function money(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function DrinkDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();

  const [drink, setDrink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await productApi.drink(id);

        if (cancelled) return;
        setDrink(res);
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to load drink.";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const price = useMemo(() => money(drink?.basePrice ?? drink?.price), [drink]);

  const isAvailable = useMemo(() => {
    if (drink == null) return false;
    if (typeof drink.isAvailable === "boolean") return drink.isAvailable;
    if (typeof drink.available === "boolean") return drink.available;
    if (typeof drink.deleted === "boolean") return !drink.deleted;
    return true;
  }, [drink]);

  async function onAddToCart() {
    try {
      setError(null);
      if (!drink) return;

      await cart.addDrink({
        productId: Number(drink.id),
        quantity: 1,
        note: "",
      });

      cart.open();
      navigate("/menu");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to add drink to cart.";
      setError(msg);
    }
  }

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!drink) return null;

  return (
    <div className={styles.container}>
      {drink.imageUrl ? (
        <img src={drink.imageUrl} alt={drink.name} className={styles.image} />
      ) : (
        <div className={styles.imagePlaceholder} aria-hidden>
          🥤
        </div>
      )}

      <div className={styles.content}>
        <h1 className={styles.title}>{drink.name}</h1>
        <p className={styles.desc}>{drink.description}</p>

        <p className={styles.price}>Price: {price.toFixed(2)} BGN</p>

        <button className={styles.btn} onClick={onAddToCart} disabled={!isAvailable}>
          {isAvailable ? "Add to cart" : "Unavailable"}
        </button>

        <div className={styles.linkRow}>
          <Link className={styles.link} to="/menu">
            ← Back to menu
          </Link>
        </div>
      </div>
    </div>
  );
}
