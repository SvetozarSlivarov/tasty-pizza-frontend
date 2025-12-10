import { http } from "./http";

const PIZZAS = "/api/pizzas";
const DRINKS = "/api/drinks";
const INGREDIENTS = "/api/ingredients";
const INGREDIENT_TYPES = "/api/ingredient-types";
const USERS = "/users";
const HEALTH = "/health";

export const adminApi = {
    // Health
    health: () => http.get(HEALTH),

    // Pizzas
    listPizzas: (withVariants = false, all = true) =>
        http.get(`${PIZZAS}?withVariants=${withVariants ? "true" : "false"}&all=${all ? "true" : "false"}`),
    getPizza: (id, withVariants = true) =>
        http.get(`/api/pizzas/${id}?withVariants=${withVariants ? "true" : "false"}`),

    createPizza: (payload) => http.post(PIZZAS, payload),
    updatePizza: (id, payload) => http.patch(`${PIZZAS}/${id}`, payload),
    deletePizza: (id) => http.del(`${PIZZAS}/${id}`),

    uploadPizzaImageBase64: (id, { filename, contentType, dataBase64 }) =>
        http.post(`${PIZZAS}/${id}/image`, { filename, contentType, dataBase64 }),

    // Drinks
    listDrinks: (all = true) => http.get(`/api/drinks?availableOnly=${all ? "false" : "true"}`),
    createDrink: (payload) => http.post("/api/drinks", payload),
    updateDrink: (id, payload) => http.patch(`/api/drinks/${id}`, payload),
    uploadDrinkImageBase64: (id, { filename, contentType, dataBase64 }) =>
        http.post(`${DRINKS}/${id}/image`, { filename, contentType, dataBase64 }),


    // Ingredients
    listIngredients: () => http.get(INGREDIENTS),
    createIngredient: (payload) => http.post(INGREDIENTS, payload),
    updateIngredient: (id, payload) => http.patch(`${INGREDIENTS}/${id}`, payload),
    deleteIngredient: (id) => http.del(`${INGREDIENTS}/${id}`),
    restoreIngredient: (id) => http.patch(`${INGREDIENTS}/${id}/restore`),


    // Ingredient types
    listIngredientTypes: () => http.get(INGREDIENT_TYPES),
    createIngredientType: (payload) => http.post(INGREDIENT_TYPES, payload),
    updateIngredientType: (id, payload) => http.patch(`${INGREDIENT_TYPES}/${id}`, payload),


    // Pizza ingredient
    listPizzaIngredients: (pizzaId) =>
        http.get(`/api/pizzas/${pizzaId}/ingredients`),

    addPizzaIngredient: (pizzaId, payload) =>
        http.post(`/api/pizzas/${pizzaId}/ingredients`, payload), // { ingredientId, isRemovable }

    updatePizzaIngredient: (pizzaId, ingredientId, payload) =>
        http.patch(`/api/pizzas/${pizzaId}/ingredients/${ingredientId}`, payload), // { isRemovable }

    removePizzaIngredient: (pizzaId, ingredientId) =>
        http.del(`/api/pizzas/${pizzaId}/ingredients/${ingredientId}`),

    // Pizza allowed ingredients
    listAllowedIngredients: (pizzaId) =>
        http.get(`/api/pizzas/${pizzaId}/allowed-ingredients`),

    allowIngredientForPizza: (pizzaId, payload) =>
        http.post(`/api/pizzas/${pizzaId}/allowed-ingredients`, payload),

    disallowIngredientForPizza: (pizzaId, ingredientId) =>
        http.del(`/api/pizzas/${pizzaId}/allowed-ingredients/${ingredientId}`),

    // Users
    listUsers: (page = 1, size = 50, q) => {
        const qs = new URLSearchParams({ page: String(page), size: String(size) });
        if (q && q.trim()) qs.set("q", q.trim());
        return http.get(`/api/admin/users?${qs.toString()}`);
    },
    updateUserRoleById: (id, role) => http.put(`${USERS}/${id}/role`, { role }),
    updateUserRoleByUsername: (username, role) =>
        http.put(`${USERS}/by-username/${encodeURIComponent(username)}/role`, { role }),
    deleteUserById: (id) => http.del(`${USERS}/${id}`),
    deleteUserByUsername: (username) =>
        http.del(`${USERS}/by-username/${encodeURIComponent(username)}`),
};
