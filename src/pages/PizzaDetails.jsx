import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../context/CartContext";

import { productApi } from "../api/catalog";
import { cartApi } from "../api/cart";

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

  const editItemId = searchParams.get("editItemId"); // <-- from CartDrawer link
  const isEditMode = !!editItemId;

  const [pizza, setPizza] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // form state
  const [variantId, setVariantId] = useState(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  // ingredientId sets (after you fixed backend mapping, ingredientId is correct)
  const [removedIds, setRemovedIds] = useState(() => new Set());
  const [addedIds, setAddedIds] = useState(() => new Set());

  // ---- Load pizza + (optionally) cart item for prefill
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // 1) Load pizza details
        const res = await productApi.pizza(id, true);

        const baseIngredients =
          (res.ingredients ?? []).map((x) => ({
            id: x.ingredientId,
            name: x.ingredientName,
            removable: !!x.removable,
          }));

        const allowedIngredients =
          (res.allowedIngredients ?? []).map((x) => ({
            id: x.ingredientId,
            name: x.ingredientName,
            extraPrice: money(x.extraPrice),
          }));

        const variants =
          (res.variants ?? []).map((v) => ({
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

        // defaults
        const defaultVariantId = variants[0]?.id ?? null;
        setVariantId(defaultVariantId);
        setQty(1);
        setNote("");
        setRemovedIds(new Set());
        setAddedIds(new Set());

        // 2) If edit mode -> fetch cart and prefill from the item
        if (isEditMode) {
          const cart = await cartApi.get(); // expects your http.get to return cart object
          const itemIdNum = Number(editItemId);
          const item = (cart?.items ?? []).find((x) => Number(x.id) === itemIdNum);

          if (!item) {
            setError("Edit item not found in cart.");
            return;
          }

          // basic fields
          setQty(toInt(item.qty, 1) ?? 1);
          setNote(item.note ?? "");

          // variant (only if present)
          if (item.variantId != null) setVariantId(toInt(item.variantId, defaultVariantId));

          // customizations -> sets
          const adds = new Set();
          const removes = new Set();

          (item.customizations ?? []).forEach((c) => {
            const action = String(c.action || "").toLowerCase();
            const ingId = toInt(c.ingredientId, null);
            if (ingId == null) return;
            if (action === "add") adds.add(ingId);
            if (action === "remove") removes.add(ingId);
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
  }, [id, isEditMode, editItemId]);

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

      if (isEditMode) {
        await cartApi.updateItem(editItemId, {
          qty: Math.max(1, toInt(qty, 1) ?? 1),
          note,
          variantId: variantId ?? null,
          addIngredientIds,
          removeIngredientIds,
        });

        navigate("/menu");
        cart.open();
        return;
      }

      await cartApi.addPizza({
        productId: Number(pizza.id),
        variantId: variantId ?? null,
        quantity: Math.max(1, toInt(qty, 1) ?? 1),
        note,
        addIngredientIds,
        removeIngredientIds,
      });

      navigate("/cart");
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
    navigate("/cart");
  }

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!pizza) return null;

  return (
    <div>
      <h1>{pizza.name}</h1>

      {pizza.imageUrl && (
        <img
          src={pizza.imageUrl}
          alt={pizza.name}
          style={{ maxWidth: 520, width: "100%", borderRadius: 12 }}
        />
      )}

      <p>{pizza.description}</p>

      {/* Variant */}
      {pizza.variants?.length > 0 && (
        <>
          <h3>Variant</h3>
          <select
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
        </>
      )}

      {/* Quantity + Note */}
      <h3>Options</h3>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Quantity{" "}
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 1)}
            style={{ width: 90 }}
          />
        </label>

        <label style={{ flex: 1, minWidth: 240 }}>
          Note{" "}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note…"
            style={{ width: "100%" }}
          />
        </label>
      </div>

      {/* Price */}
      <p>
        <strong>Total:</strong> {totalPrice.toFixed(2)} BGN
      </p>

      {/* Base ingredients */}
      <h3>Base ingredients</h3>
      <ul>
        {pizza.baseIngredients.map((ing) => (
          <li key={ing.id}>
            <label style={{ opacity: ing.removable ? 1 : 0.7 }}>
              <input
                type="checkbox"
                disabled={!ing.removable}
                checked={!removedIds.has(ing.id)}
                onChange={() => toggleRemove(ing.id, ing.removable)}
              />
              {ing.name}
              {!ing.removable ? " (required)" : ""}
            </label>
          </li>
        ))}
      </ul>

      {/* Extras */}
      {pizza.allowedIngredients?.length > 0 && (
        <>
          <h3>Extras</h3>
          <ul>
            {pizza.allowedIngredients.map((ing) => (
              <li key={ing.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={addedIds.has(ing.id)}
                    onChange={() => toggleAdd(ing.id)}
                  />
                  {ing.name}
                  {ing.extraPrice > 0 ? ` (+${ing.extraPrice.toFixed(2)} BGN)` : ""}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onSubmit}>
          {isEditMode ? "Save changes" : "Add to cart"}
        </button>
        {isEditMode && (
          <button onClick={onCancel} type="button">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
