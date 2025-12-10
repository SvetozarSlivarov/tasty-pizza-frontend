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

function mapAddDrinkPayload(p) {
    return {
        productId: p.productId,
        quantity: toQty(p.quantity ?? p.qty) ?? 1,
        note: p.note ?? "",
    };
}

function mapPatchPayload(patch) {
    const out = {};

    if (patch.quantity != null || patch.qty != null) {
        out.quantity = toQty(patch.quantity ?? patch.qty);
    }
    if (patch.note != null) {
        out.note = patch.note;
    }
    if (patch.variantId != null) {
        out.variantId = patch.variantId;
    }
    if (Array.isArray(patch.addIngredientIds) || Array.isArray(patch.addIds)) {
        out.addIngredientIds = patch.addIngredientIds ?? patch.addIds;
    }
    if (Array.isArray(patch.removeIngredientIds) || Array.isArray(patch.removeIds)) {
        out.removeIngredientIds = patch.removeIngredientIds ?? patch.removeIds;
    }
    return out;
}

export const cartApi = {
    get: () => http.get("/cart"),

    addDrink: (payload) =>
        http.post("/cart/items/drink", mapAddDrinkPayload(payload)),

    addPizza: (payload) =>
        http.post("/cart/items/pizza", mapAddPizzaPayload(payload)),

    updateItem: (itemId, patch) =>
        http.patch(`/cart/items/${itemId}`, mapPatchPayload(patch)),

    removeItem: (itemId) => http.del(`/cart/items/${itemId}`),

    checkout: ({ phone, address }) =>
        http.post("/cart/checkout", { phone, address }),
};
