import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { productApi } from "../api/catalog";
import { cartApi } from "../api/cart";
import styles from "../styles/PizzaDetails.module.css";

function money(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function toInt(n, fallback = null) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

export default function PastaDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { language, t, enumLabel } = useLanguage();

  const editItemId = searchParams.get("editItemId");
  const isEditMode = !!editItemId;

  const [pasta, setPasta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sauceId, setSauceId] = useState(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [addedIds, setAddedIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await productApi.pasta(id, language);
        const sauces = (res.sauces ?? []).map((s) => ({
          id: s.id,
          ingredientId: s.ingredientId,
          name: s.ingredientName,
          extraPrice: money(s.extraPrice),
          spicyLevel: s.spicyLevel,
        }));
        const allowedIngredients = (res.allowedIngredients ?? []).map((x) => ({
          id: x.ingredientId,
          name: x.ingredientName,
          extraPrice: money(x.extraPrice),
        }));

        const normalized = {
          ...res,
          basePrice: money(res.basePrice),
          imageUrl: res.imageUrl ?? null,
          sauces,
          allowedIngredients,
        };

        if (cancelled) return;

        setPasta(normalized);
        setSauceId(sauces[0]?.id ?? null);
        setQty(1);
        setNote("");
        setAddedIds(new Set());

        if (isEditMode) {
          if (!cart.items || cart.items.length === 0) await cart.refresh();
          const itemIdNum = Number(editItemId);
          const item = (cart.items ?? []).find((x) => Number(x.id) === itemIdNum);
          if (!item) {
            setError(t("Edit item not found in cart."));
            return;
          }
          setQty(toInt(item.qty, 1) ?? 1);
          setNote(item.note ?? "");
          if (item.pastaSauceId != null) setSauceId(Number(item.pastaSauceId));

          const adds = new Set();
          (item.customizations ?? []).forEach((c) => {
            const action = String(c.action || "").toUpperCase();
            const ingId = toInt(c.ingredientId, null);
            if (ingId != null && action === "ADD") adds.add(ingId);
          });
          setAddedIds(adds);
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || t("Failed to load pasta.");
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id, isEditMode, editItemId, language]);

  const selectedSauce = useMemo(() => {
    if (!pasta?.sauces?.length) return null;
    return pasta.sauces.find((s) => s.id === sauceId) ?? pasta.sauces[0];
  }, [pasta, sauceId]);

  const totalPrice = useMemo(() => {
    if (!pasta) return 0;
    const extrasSum = (pasta.allowedIngredients ?? [])
      .filter((x) => addedIds.has(x.id))
      .reduce((sum, x) => sum + money(x.extraPrice), 0);
    const q = Math.max(1, toInt(qty, 1) ?? 1);
    return (money(pasta.basePrice) + money(selectedSauce?.extraPrice) + extrasSum) * q;
  }, [pasta, selectedSauce, addedIds, qty]);

  function toggleAdd(ingredientId) {
    setAddedIds((prev) => {
      const next = new Set(prev);
      next.has(ingredientId) ? next.delete(ingredientId) : next.add(ingredientId);
      return next;
    });
  }

  async function onSubmit() {
    try {
      setError(null);
      if (!pasta) return;
      if (!sauceId) {
        setError(t("Please select a sauce."));
        return;
      }
      const addIngredientIds = Array.from(addedIds).map(Number);
      const safeQty = Math.max(1, toInt(qty, 1) ?? 1);

      if (isEditMode) {
        await cartApi.updateItem(editItemId, { quantity: safeQty, note, pastaSauceId: sauceId, addIngredientIds, removeIngredientIds: [] }, language);
        await cart.refresh();
        cart.open();
        navigate("/menu");
        return;
      }

      await cart.addPasta({ productId: Number(pasta.id), pastaSauceId: sauceId, quantity: safeQty, note, addIngredientIds });
      navigate("/menu");
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || (isEditMode ? t("Failed to save changes.") : t("Failed to add to cart."));
      setError(msg);
    }
  }

  function onCancel() {
    cart.open();
    navigate("/menu");
  }

  if (loading) return <p className={styles.loading}>{t("Loading...")}</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!pasta) return null;

  return (
    <div className={styles.pd}>
      <div className={styles.grid}>
        <div>
          <div className={styles.hero}>
            {pasta.imageUrl ? <img src={pasta.imageUrl} alt={pasta.name} className={styles.heroImg} /> : <div className={styles.card}><div className={styles.cardBody}><p className={styles.desc}>{t("No image.")}</p></div></div>}
          </div>

          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{pasta.name}</h1>
                <span className={styles.badge}>{isEditMode ? t("Editing") : t("Customize")}</span>
              </div>
              <p className={styles.desc}>{pasta.description}</p>
            </div>
          </div>

          {pasta.allowedIngredients?.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardBody}>
                <h3 className={styles.sectionTitle}>{t("Add-ons")}</h3>
                <ul className={styles.list}>
                  {pasta.allowedIngredients.map((ing) => {
                    const checked = addedIds.has(ing.id);
                    return (
                      <li key={ing.id} className={styles.item}>
                        <input className={styles.check} type="checkbox" checked={checked} onChange={() => toggleAdd(ing.id)} />
                        <div className={styles.itemTitle}><span className={styles.itemName}>{ing.name}</span></div>
                        <span className={styles.itemPrice}>{ing.extraPrice > 0 ? `+${ing.extraPrice.toFixed(2)} EUR` : t("Free")}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className={styles.summary}>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <h3 className={styles.sectionTitle}>{t("Options")}</h3>

              <div className={styles.field} style={{ marginBottom: 12 }}>
                <div className={styles.fieldLabel}>{t("Sauce")}</div>
                <select className={styles.select} value={sauceId ?? ""} onChange={(e) => setSauceId(Number(e.target.value))}>
                  {pasta.sauces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} / {enumLabel(s.spicyLevel)}{s.extraPrice > 0 ? ` (+${s.extraPrice.toFixed(2)} EUR)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.row}>
                <div className={styles.field} style={{ minWidth: 140 }}>
                  <div className={styles.fieldLabel}>{t("Quantity")}</div>
                  <input className={styles.input} type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} />
                </div>
                <div className={`${styles.field} ${styles.note}`}>
                  <div className={styles.fieldLabel}>{t("Note")}</div>
                  <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Optional note...")} />
                </div>
              </div>

              <div className={styles.total}>
                <div><div className={styles.totalLabel}>{t("Total")}</div><div className={styles.itemHint}>{t("Preview price")}</div></div>
                <div className={styles.totalValue}>{totalPrice.toFixed(2)} EUR</div>
              </div>

              <div className={styles.actions}>
                <button className={styles.btn} onClick={onSubmit}>{isEditMode ? t("Save changes") : t("Add to cart")}</button>
                {isEditMode && <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel} type="button">{t("Cancel")}</button>}
              </div>
              <div className={styles.tip}>{t("The server calculates the final cart price.")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
