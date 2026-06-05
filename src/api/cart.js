import { http } from "./http";

function toQty(val) {
    if (val == null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
}

function mapAddPizzaPayload(p) {
    return {
        productId: p.productId,
        variantId: p.variantId ?? null,
        quantity: toQty(p.quantity ?? p.qty) ?? 1,
        note: p.note ?? "",
        removeIngredientIds: p.removeIngredientIds ?? p.removeIds ?? [],
        addIngredientIds: p.addIngredientIds ?? p.addIds ?? [],
    };
}

function mapAddPastaPayload(p) {
    return {
        productId: p.productId,
        pastaSauceId: p.pastaSauceId ?? p.sauceId ?? null,
        quantity: toQty(p.quantity ?? p.qty) ?? 1,
        note: p.note ?? "",
        addIngredientIds: p.addIngredientIds ?? p.addIds ?? [],
    };
}

function mapAddDrinkPayload(p) {
    return {
        productId: p.productId,
        quantity: toQty(p.quantity ?? p.qty) ?? 1,
        note: p.note ?? "",
    };
}

function mapPatchPayload(patch) {
    const out = {};
    if (patch.quantity != null || patch.qty != null) out.quantity = toQty(patch.quantity ?? patch.qty);
    if (patch.note != null) out.note = patch.note;
    if (patch.variantId != null) out.variantId = patch.variantId;
    if (patch.pastaSauceId != null || patch.sauceId != null) out.pastaSauceId = patch.pastaSauceId ?? patch.sauceId;
    if (Array.isArray(patch.addIngredientIds) || Array.isArray(patch.addIds)) out.addIngredientIds = patch.addIngredientIds ?? patch.addIds;
    if (Array.isArray(patch.removeIngredientIds) || Array.isArray(patch.removeIds)) out.removeIngredientIds = patch.removeIngredientIds ?? patch.removeIds;
    return out;
}

function withLang(lang) {
    return lang ? `?lang=${encodeURIComponent(lang)}` : "";
}

export const cartApi = {
    get: (lang = "en") => http.get(`/cart${withLang(lang)}`),
    addDrink: (payload, lang = "en") => http.post(`/cart/items/drink${withLang(lang)}`, mapAddDrinkPayload(payload)),
    addPizza: (payload, lang = "en") => http.post(`/cart/items/pizza${withLang(lang)}`, mapAddPizzaPayload(payload)),
    addPasta: (payload, lang = "en") => http.post(`/cart/items/pasta${withLang(lang)}`, mapAddPastaPayload(payload)),
    updateItem: (itemId, patch, lang = "en") => http.patch(`/cart/items/${itemId}${withLang(lang)}`, mapPatchPayload(patch)),
    removeItem: (itemId, lang = "en") => http.del(`/cart/items/${itemId}${withLang(lang)}`),
    checkout: ({ phone, address }, lang = "en") => http.post(`/cart/checkout${withLang(lang)}`, { phone, address }),
};
