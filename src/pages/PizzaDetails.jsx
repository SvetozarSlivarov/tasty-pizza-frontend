import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
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

export default function PizzaDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cart = useCart();

  const editItemId = searchParams.get("editItemId");
  const isEditMode = !!editItemId;

  const [pizza, setPizza] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [variantId, setVariantId] = useState(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const [removedIds, setRemovedIds] = useState(() => new Set());
  const [addedIds, setAddedIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await productApi.pizza(id, true);

        const baseIngredients = (res.ingredients ?? []).map((x) => ({
          id: x.ingredientId,
          name: x.ingredientName,
          removable: !!x.removable,
        }));

        const allowedIngredients = (res.allowedIngredients ?? []).map((x) => ({
          id: x.ingredientId,
          name: x.ingredientName,
          extraPrice: money(x.extraPrice),
        }));

        const variants = (res.variants ?? []).map((v) => ({
          id: v.id,
          size: v.size,
          dough: v.dough,
          extraPrice: money(v.extraPrice),
        }));

        const normalized = {
          ...res,
          basePrice: money(res.basePrice),
          imageUrl: res.imageUrl ?? null,
          baseIngredients,
          allowedIngredients,
          variants,
        };

        if (cancelled) return;

        setPizza(normalized);

        const defaultVariantId = variants[0]?.id ?? null;
        setVariantId(defaultVariantId);
        setQty(1);
        setNote("");
        setRemovedIds(new Set());
        setAddedIds(new Set());

        if (isEditMode) {
          if (!cart.items || cart.items.length === 0) {
            await cart.refresh();
          }

          const itemIdNum = Number(editItemId);
          const item = (cart.items ?? []).find((x) => Number(x.id) === itemIdNum);

          if (!item) {
            setError("Edit item not found in cart.");
            return;
          }

          setQty(toInt(item.qty, 1) ?? 1);
          setNote(item.note ?? "");

          const itemVariantId = item.pizzaVariantId != null ? Number(item.pizzaVariantId) : null;
          if (itemVariantId != null) setVariantId(itemVariantId);

          const adds = new Set();
          const removes = new Set();

          (item.customizations ?? []).forEach((c) => {
            const action = String(c.action || "").toUpperCase();
            const ingId = toInt(c.ingredientId, null);
            if (ingId == null) return;

            if (action === "ADD") adds.add(ingId);
            if (action === "REMOVE") removes.add(ingId);
          });

          setAddedIds(adds);
          setRemovedIds(removes);
        }
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to load pizza.";
        setError(msg);
        console.error("PizzaDetails load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEditMode, editItemId]); // ok

  const selectedVariant = useMemo(() => {
    if (!pizza?.variants?.length) return null;
    return pizza.variants.find((v) => v.id === variantId) ?? pizza.variants[0];
  }, [pizza, variantId]);

  const totalPrice = useMemo(() => {
    if (!pizza) return 0;

    const base = money(pizza.basePrice);
    const variantExtra = money(selectedVariant?.extraPrice);

    const extrasSum = (pizza.allowedIngredients ?? [])
      .filter((x) => addedIds.has(x.id))
      .reduce((sum, x) => sum + money(x.extraPrice), 0);

    const q = Math.max(1, toInt(qty, 1) ?? 1);
    return (base + variantExtra + extrasSum) * q;
  }, [pizza, selectedVariant, addedIds, qty]);

  function toggleRemove(ingredientId, removable) {
    if (!removable) return;

    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.has(ingredientId) ? next.delete(ingredientId) : next.add(ingredientId);
      return next;
    });
  }

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
      if (!pizza) return;

      const removeIngredientIds = Array.from(removedIds).map(Number);
      const addIngredientIds = Array.from(addedIds).map(Number);

      const safeQty = Math.max(1, toInt(qty, 1) ?? 1);

      if (!variantId) {
        setError("Please select a variant.");
        return;
      }

      if (isEditMode) {
        await cartApi.updateItem(editItemId, {
          quantity: safeQty,
          note,
          variantId: variantId,
          addIngredientIds,
          removeIngredientIds,
        });

        await cart.refresh();
        cart.open();
        navigate("/menu");
        return;
      }

      await cart.addPizza({
        productId: Number(pizza.id),
        variantId: variantId,
        quantity: safeQty,
        note,
        addIngredientIds,
        removeIngredientIds,
      });

      navigate("/menu");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        (isEditMode ? "Failed to save changes." : "Failed to add to cart.");
      setError(msg);
      console.error("Submit error:", e);
    }
  }

  function onCancel() {
    cart.open();
    navigate("/menu");
  }

  if (loading) return <p className={styles.loading}>Loading…</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!pizza) return null;

  return (
    <div className={styles.pd}>
      <div className={styles.grid}>
        {/* LEFT */}
        <div>
          <div className={styles.hero}>
            {pizza.imageUrl ? (
              <img src={pizza.imageUrl} alt={pizza.name} className={styles.heroImg} />
            ) : (
              <div className={styles.card}>
                <div className={styles.cardBody}>
                  <p className={styles.desc}>No image.</p>
                </div>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>{pizza.name}</h1>
                <span className={styles.badge}>{isEditMode ? "Editing" : "Customize"}</span>
              </div>
              <p className={styles.desc}>{pizza.description}</p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardBody}>
              <h3 className={styles.sectionTitle}>Base ingredients</h3>

              <ul className={styles.list}>
                {pizza.baseIngredients.map((ing) => {
                  const checked = !removedIds.has(ing.id);
                  return (
                    <li
                      key={ing.id}
                      className={`${styles.item} ${!ing.removable ? styles.itemDisabled : ""}`}
                    >
                      <input
                        className={styles.check}
                        type="checkbox"
                        disabled={!ing.removable}
                        checked={checked}
                        onChange={() => toggleRemove(ing.id, ing.removable)}
                      />
                      <div className={styles.itemTitle}>
                        <span className={styles.itemName}>{ing.name}</span>
                        {!ing.removable && <span className={styles.itemHint}>Required</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {pizza.allowedIngredients?.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardBody}>
                <h3 className={styles.sectionTitle}>Extras</h3>

                <ul className={styles.list}>
                  {pizza.allowedIngredients.map((ing) => {
                    const checked = addedIds.has(ing.id);
                    return (
                      <li key={ing.id} className={styles.item}>
                        <input
                          className={styles.check}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAdd(ing.id)}
                        />

                        <div className={styles.itemTitle}>
                          <span className={styles.itemName}>{ing.name}</span>
                        </div>

                        <span className={styles.itemPrice}>
                          {ing.extraPrice > 0 ? `+${ing.extraPrice.toFixed(2)} BGN` : "Free"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className={styles.summary}>
          <div className={styles.card}>
            <div className={styles.cardBody}>
              <h3 className={styles.sectionTitle}>Options</h3>

              {pizza.variants?.length > 0 && (
                <div className={styles.field} style={{ marginBottom: 12 }}>
                  <div className={styles.fieldLabel}>Variant</div>
                  <select
                    className={styles.select}
                    value={variantId ?? ""}
                    onChange={(e) => setVariantId(Number(e.target.value))}
                  >
                    {pizza.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.size} / {v.dough}
                        {v.extraPrice > 0 ? ` (+${v.extraPrice.toFixed(2)} BGN)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.row}>
                <div className={styles.field} style={{ minWidth: 140 }}>
                  <div className={styles.fieldLabel}>Quantity</div>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value) || 1)}
                  />
                </div>

                <div className={`${styles.field} ${styles.note}`}>
                  <div className={styles.fieldLabel}>Note</div>
                  <input
                    className={styles.input}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note…"
                  />
                </div>
              </div>

              <div className={styles.total}>
                <div>
                  <div className={styles.totalLabel}>Total</div>
                  <div className={styles.itemHint}>Preview price</div>
                </div>
                <div className={styles.totalValue}>{totalPrice.toFixed(2)} BGN</div>
              </div>

              <div className={styles.actions}>
                <button className={styles.btn} onClick={onSubmit}>
                  {isEditMode ? "Save changes" : "Add to cart"}
                </button>

                {isEditMode && (
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel} type="button">
                    Cancel
                  </button>
                )}
              </div>

              <div className={styles.tip}>
                Tip: The cart price is calculated by the server (so it always matches checkout).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
