import { createContext, useContext, useEffect, useMemo, useReducer, useCallback } from "react";
import { cartApi } from "../api/cart";

let notify;

const CartContext = createContext(null);

const initialState = {
  isOpen: false,
  loading: false,
  items: [],
  subtotal: 0,
  orderId: null,
  status: null,
  error: null,
};

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalizeType(it) {
  const raw = it?.productType ?? it?.type ?? "";
  const t = String(raw).toLowerCase();

  if (t === "pizza") return "pizza";
  if (t === "drink") return "drink";

  // fallback guess (older payloads)
  if (it?.pizzaVariantId != null || it?.variantId != null || it?.variant) return "pizza";
  return "drink";
}

function mapServerCart(data) {
  const items = (data?.items ?? []).map((it) => {
    const id = it.id ?? it.itemId ?? it.cartItemId;

    const qty = toInt(it.quantity ?? it.qty ?? 1, 1);
    const unitPrice = toNum(it.unitPrice ?? it.price ?? 0, 0);

    const name = it.productName ?? it.name ?? it.pizzaName ?? it.drinkName ?? "Item";
    const imageUrl = it.imageUrl ?? it.photo ?? it.thumbnailUrl ?? null;

    const type = normalizeType(it);

    const productId = it.productId ?? it.pizzaId ?? it.drinkId ?? it.product?.id ?? null;
    const pizzaVariantId = it.pizzaVariantId ?? it.variantId ?? it.variant?.id ?? null;

    const variantLabel =
      it.variantLabel ??
      it.variantName ??
      it.variant?.label ??
      it.variant?.name ??
      (it.size || it.dough ? `${it.size ?? ""}${it.size && it.dough ? " / " : ""}${it.dough ?? ""}` : null);

    const note = it.note ?? "";

    const customizations = Array.isArray(it.customizations)
      ? it.customizations.map((c) => ({
          ingredientId: c.ingredientId ?? c.ingredientID ?? c.id ?? c.ingredient?.id ?? null,
          action: String(c.action ?? c.type ?? "").toUpperCase(),
          ingredientName: c.ingredientName ?? c.ingredient?.name ?? null,
        }))
      : [];

    return {
      id,
      name,
      imageUrl,
      qty,
      unitPrice,
      type,
      variantLabel,
      productId,
      pizzaVariantId,
      note,
      customizations,
      raw: it,
    };
  });

  // ✅ critical: total from server is often a STRING ("23.50")
  const totalNum = toNum(data?.total, NaN);
  const subtotal = Number.isFinite(totalNum) ? totalNum : items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  return {
    items,
    subtotal,
    orderId: data?.id ?? data?.orderId ?? null,
    status: data?.status ?? null,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case "OPEN":
      return { ...state, isOpen: true };
    case "CLOSE":
      return { ...state, isOpen: false };
    case "LOADING":
      return { ...state, loading: true, error: null };
    case "ERROR":
      return { ...state, loading: false, error: action.payload || "Error" };
    case "SET_CART":
      return { ...state, loading: false, error: null, ...action.payload };
    default:
      return state;
  }
}

function getErr(e) {
  const data = e?.response?.data ?? e?.data ?? {};
  return {
    code: data.error,
    message: data.message || e?.message,
    details: data.details,
    status: e?.response?.status ?? e?.status,
  };
}

function showError(code, message) {
  const text =
    code === "addon_unavailable"
      ? "This ingredient is no longer available."
      : code === "add_not_allowed"
      ? "This ingredient is not allowed for this pizza."
      : code === "cart_invalid"
      ? "The cart contains invalid or unavailable items."
      : message || "Operation failed.";

  if (notify?.notify?.error) notify.notify.error(text);
  else if (notify?.error) notify.error(text);
  else alert(text);
}

function showSuccess(message) {
  if (notify?.notify?.success) notify.notify.success(message);
  else if (notify?.success) notify.success(message);
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refresh = useCallback(async () => {
    try {
      dispatch({ type: "LOADING" });
      const data = await cartApi.get();
      dispatch({ type: "SET_CART", payload: mapServerCart(data) });
      return data;
    } catch (e) {
      const err = getErr(e);
      dispatch({ type: "ERROR", payload: err.code || err.message });
      throw e;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onRefresh = () => refresh();
    window.addEventListener("cart:refresh", onRefresh);
    return () => window.removeEventListener("cart:refresh", onRefresh);
  }, [refresh]);

  async function safe(fn, opts = { refreshOnError: false }) {
    try {
      const res = await fn();
      return res;
    } catch (e) {
      const err = getErr(e);

      if (err.code === "addon_unavailable") {
        showError(err.code);
        await refresh();
      } else if (err.code === "add_not_allowed") {
        showError(err.code);
        if (opts.refreshOnError) await refresh();
      } else if (err.code === "cart_invalid") {
        showError(err.code);
        await refresh();
      } else {
        showError(err.code, err.message);
        if (opts.refreshOnError) await refresh();
      }

      throw e;
    }
  }

  const api = useMemo(
    () => ({
      isOpen: state.isOpen,
      open: () => dispatch({ type: "OPEN" }),
      close: () => dispatch({ type: "CLOSE" }),
      toggle: () => dispatch({ type: state.isOpen ? "CLOSE" : "OPEN" }),

      loading: state.loading,
      error: state.error,
      items: state.items,
      subtotal: state.subtotal,
      count: state.items.reduce((s, i) => s + (Number(i.qty) || 0), 0),
      orderId: state.orderId,
      status: state.status,

      refresh,

      async addPizza({
        productId,
        variantId = null,
        quantity = 1,
        removeIngredientIds = [],
        addIngredientIds = [],
        note = "",
      }) {
        await safe(async () => {
          const data = await cartApi.addPizza({
            productId,
            variantId,
            quantity,
            removeIngredientIds,
            addIngredientIds,
            note,
          });
          dispatch({ type: "SET_CART", payload: mapServerCart(data) });
          return data;
        });

        dispatch({ type: "OPEN" });
        showSuccess("Pizza added to cart.");
      },

      async addDrink({ productId, quantity = 1, note = "" }) {
        await safe(async () => {
          const data = await cartApi.addDrink({ productId, quantity, note });
          dispatch({ type: "SET_CART", payload: mapServerCart(data) });
          return data;
        });

        dispatch({ type: "OPEN" });
        showSuccess("Drink added to cart.");
      },

      async updateQty(itemId, qty) {
        const q = Math.max(1, Number(qty) || 1);

        await safe(async () => {
          const data = await cartApi.updateItem(itemId, { quantity: q });
          dispatch({ type: "SET_CART", payload: mapServerCart(data) });
          return data;
        });

        showSuccess("Quantity updated.");
      },

      async updateVariant(itemId, variantId) {
        await safe(async () => {
          const data = await cartApi.updateItem(itemId, { variantId });
          dispatch({ type: "SET_CART", payload: mapServerCart(data) });
          return data;
        });

        showSuccess("Variant updated.");
      },

      async updateNote(itemId, note) {
        await safe(async () => {
          const data = await cartApi.updateItem(itemId, { note });
          dispatch({ type: "SET_CART", payload: mapServerCart(data) });
          return data;
        });

        showSuccess("Note updated.");
      },

      async updateCustomizations(itemId, { addIds = [], removeIds = [] }) {
        await safe(async () => {
          const data = await cartApi.updateItem(itemId, { addIds, removeIds });
          dispatch({ type: "SET_CART", payload: mapServerCart(data) });
          return data;
        });

        showSuccess("Customizations updated.");
      },

      async remove(itemId) {
        await safe(async () => {
          const data = await cartApi.removeItem(itemId);
          dispatch({ type: "SET_CART", payload: mapServerCart(data) });
          return data;
        }, { refreshOnError: true });

        showSuccess("Item removed.");
      },

      async clear() {
        // няма server endpoint за clear -> remove all items one by one
        const ids = state.items.map((i) => i.id).filter((x) => x != null);

        for (const id of ids) {
          try {
            await cartApi.removeItem(id);
          } catch {
            // ignore (we'll refresh afterwards)
          }
        }

        await refresh();
        showSuccess("Cart cleared.");
      },

      async checkout({ phone, address }) {
        const res = await safe(async () => {
          const data = await cartApi.checkout({ phone, address });
          // server returns cart (now ORDERED) - refresh anyway to sync
          dispatch({ type: "SET_CART", payload: mapServerCart(data) });
          return data;
        });

        // optional: ensure UI shows empty/new cart after checkout
        await refresh();

        showSuccess("Order placed 🎉");
        return res;
      },
    }),
    [
      state.isOpen,
      state.loading,
      state.error,
      state.items,
      state.subtotal,
      state.orderId,
      state.status,
      refresh,
    ]
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
