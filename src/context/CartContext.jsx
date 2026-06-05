import { createContext, useContext, useEffect, useMemo, useReducer, useCallback } from "react";
import { cartApi } from "../api/cart";
import { useLanguage } from "./LanguageContext";

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
  if (t === "pasta") return "pasta";
  if (t === "drink") return "drink";
  if (it?.pizzaVariantId != null || it?.variantId != null || it?.variant) return "pizza";
  if (it?.pastaSauceId != null || it?.pastaSauceName != null || it?.pastaSauceSpicyLevel != null) return "pasta";
  return "drink";
}

function mapServerCart(data) {
  const items = (data?.items ?? []).map((it) => {
    const id = it.id ?? it.itemId ?? it.cartItemId;
    const qty = toInt(it.quantity ?? it.qty ?? 1, 1);
    const unitPrice = toNum(it.unitPrice ?? it.price ?? 0, 0);
    const name = it.productName ?? it.name ?? it.pizzaName ?? it.pastaName ?? it.drinkName ?? "Item";
    const imageUrl = it.imageUrl ?? it.photo ?? it.thumbnailUrl ?? null;
    const type = normalizeType(it);
    const productId = it.productId ?? it.pizzaId ?? it.pastaId ?? it.drinkId ?? it.product?.id ?? null;
    const pizzaVariantId = it.pizzaVariantId ?? it.variantId ?? it.variant?.id ?? null;
    const pastaSauceId = it.pastaSauceId ?? it.sauceId ?? it.pastaSauce?.id ?? null;
    const pastaSauceName = it.pastaSauceName ?? it.sauceName ?? it.pastaSauce?.name ?? it.pastaSauce?.ingredientName ?? null;
    const pastaSauceSpicyLevel = it.pastaSauceSpicyLevel ?? it.sauceSpicyLevel ?? it.pastaSauce?.spicyLevel ?? null;
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
      pastaSauceId,
      pastaSauceName,
      pastaSauceSpicyLevel,
      note,
      customizations,
      raw: it,
    };
  });

  const totalNum = toNum(data?.total, NaN);
  const subtotal = Number.isFinite(totalNum) ? totalNum : items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  return { items, subtotal, orderId: data?.id ?? data?.orderId ?? null, status: data?.status ?? null };
}

function reducer(state, action) {
  switch (action.type) {
    case "OPEN": return { ...state, isOpen: true };
    case "CLOSE": return { ...state, isOpen: false };
    case "LOADING": return { ...state, loading: true, error: null };
    case "ERROR": return { ...state, loading: false, error: action.payload || "Error" };
    case "SET_CART": return { ...state, loading: false, error: null, ...action.payload };
    default: return state;
  }
}

function getErr(e) {
  const data = e?.response?.data ?? e?.data ?? {};
  return { code: data.error, message: data.message || e?.message, details: data.details, status: e?.response?.status ?? e?.status };
}

function showError(code, message, t = (text) => text) {
  const text =
    code === "addon_unavailable" ? t("This ingredient is no longer available.") :
    code === "add_not_allowed" ? t("This ingredient is not allowed for this item.") :
    code === "cart_invalid" ? t("The cart contains invalid or unavailable items.") :
    message || t("Operation failed.");
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
  const { language, t } = useLanguage();

  const refresh = useCallback(async () => {
    try {
      dispatch({ type: "LOADING" });
      const data = await cartApi.get(language);
      dispatch({ type: "SET_CART", payload: mapServerCart(data) });
      return data;
    } catch (e) {
      const err = getErr(e);
      dispatch({ type: "ERROR", payload: err.code || err.message });
      throw e;
    }
  }, [language]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onRefresh = () => refresh();
    window.addEventListener("cart:refresh", onRefresh);
    return () => window.removeEventListener("cart:refresh", onRefresh);
  }, [refresh]);

  const safe = useCallback(async (fn, opts = { refreshOnError: false }) => {
    try { return await fn(); }
    catch (e) {
      const err = getErr(e);
      showError(err.code, err.message, t);
      if (err.code === "addon_unavailable" || err.code === "cart_invalid" || opts.refreshOnError) await refresh();
      throw e;
    }
  }, [refresh, t]);

  const api = useMemo(() => ({
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
    applyServerCart: (serverCart) => dispatch({ type: "SET_CART", payload: mapServerCart(serverCart) }),

    async addPizza({ productId, variantId = null, quantity = 1, removeIngredientIds = [], addIngredientIds = [], note = "" }) {
      await safe(async () => {
        const data = await cartApi.addPizza({ productId, variantId, quantity, removeIngredientIds, addIngredientIds, note }, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      });
      dispatch({ type: "OPEN" });
      showSuccess(t("Pizza added to cart."));
    },

    async addPasta({ productId, pastaSauceId, quantity = 1, addIngredientIds = [], note = "" }) {
      await safe(async () => {
        const data = await cartApi.addPasta({ productId, pastaSauceId, quantity, addIngredientIds, note }, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      });
      dispatch({ type: "OPEN" });
      showSuccess(t("Pasta added to cart."));
    },

    async addDrink({ productId, quantity = 1, note = "" }) {
      await safe(async () => {
        const data = await cartApi.addDrink({ productId, quantity, note }, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      });
      dispatch({ type: "OPEN" });
      showSuccess(t("Drink added to cart."));
    },

    async updateQty(itemId, qty) {
      const q = Math.max(1, Number(qty) || 1);
      await safe(async () => {
        const data = await cartApi.updateItem(itemId, { quantity: q }, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      });
      showSuccess(t("Quantity updated."));
    },

    async updateVariant(itemId, variantId) {
      await safe(async () => {
        const data = await cartApi.updateItem(itemId, { variantId }, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      });
      showSuccess(t("Variant updated."));
    },

    async updatePastaSauce(itemId, pastaSauceId) {
      await safe(async () => {
        const data = await cartApi.updateItem(itemId, { pastaSauceId }, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      });
      showSuccess(t("Sauce updated."));
    },

    async updateNote(itemId, note) {
      await safe(async () => {
        const data = await cartApi.updateItem(itemId, { note }, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      });
      showSuccess(t("Note updated."));
    },

    async updateCustomizations(itemId, { addIds = [], removeIds = [] }) {
      await safe(async () => {
        const data = await cartApi.updateItem(itemId, { addIds, removeIds }, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      });
      showSuccess(t("Customizations updated."));
    },

    async remove(itemId) {
      await safe(async () => {
        const data = await cartApi.removeItem(itemId, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      }, { refreshOnError: true });
      showSuccess(t("Item removed."));
    },

    async clear() {
      const ids = state.items.map((i) => i.id).filter((x) => x != null);
      for (const id of ids) { try { await cartApi.removeItem(id, language); } catch {} }
      await refresh();
      showSuccess(t("Cart cleared."));
    },

    async checkout({ phone, address }) {
      const res = await safe(async () => {
        const data = await cartApi.checkout({ phone, address }, language);
        dispatch({ type: "SET_CART", payload: mapServerCart(data) });
        return data;
      });
      await refresh();
      showSuccess(t("Order placed!"));
      return res;
    },
  }), [state.isOpen, state.loading, state.error, state.items, state.subtotal, state.orderId, state.status, refresh, safe, language, t]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
