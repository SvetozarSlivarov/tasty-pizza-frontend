import { http } from "./http";

export const adminApi = {
  // ---- PIZZAS ----
  async listPizzas({ withVariants = true } = {}) {
    const qs = new URLSearchParams();
    qs.set("withVariants", String(withVariants));
    return http.get(`/pizzas?${qs.toString()}`);
  },
  async listDeletedPizzas({ withVariants = true } = {}) {
    const qs = new URLSearchParams();
    qs.set("withVariants", String(withVariants));
    return http.get(`/pizzas/deleted?${qs.toString()}`);
  },

  async getPizza(id) {
    return http.get(`/pizzas/${id}`);
  },

  async createPizza(payload) {
    return http.post(`/pizzas`, payload);
  },

  async updatePizza(id, payload) {
    return http.put(`/pizzas/${id}`, payload);
  },

  async deletePizza(id) {
    return http.del(`/pizzas/${id}`);
  },

  async restorePizza(id) {
    return http.post(`/pizzas/${id}/restore`);
  },

  // ---- INGREDIENTS (WITH TYPE) ----
  async listIngredientsWithType(show = "active") {
    const qs = new URLSearchParams();
    if (show) qs.set("show", show); // active|all|deleted
    return http.get(`/ingredients/with-type?${qs.toString()}`);
  },

  // ---- PIZZA BASE INGREDIENTS ----
  async getPizzaIngredients(pizzaId) {
    return http.get(`/pizzas/${pizzaId}/ingredients`);
  },

  // body: [{ ingredientId, removable }]
  async setPizzaIngredients(pizzaId, items) {
    return http.put(`/pizzas/${pizzaId}/ingredients`, items);
  },

  // ---- PIZZA ALLOWED INGREDIENTS ----
  async getPizzaAllowedIngredients(pizzaId) {
    return http.get(`/pizzas/${pizzaId}/allowed-ingredients`);
  },

  async setPizzaAllowedIngredients(pizzaId, items) {
    return http.put(`/pizzas/${pizzaId}/allowed-ingredients`, items);
  },
  async listDrinks() {
    return http.get(`/drinks`);
  },

  async listDeletedDrinks() {
    return http.get(`/drinks/deleted`);
  },

  async getDrink(id) {
    return http.get(`/drinks/${id}`);
  },

  async createDrink(payload) {
    return http.post(`/drinks`, payload);
  },

  async updateDrink(id, payload) {
    return http.put(`/drinks/${id}`, payload);
  },

  async deleteDrink(id) {
    return http.del(`/drinks/${id}`);
  },

  async restoreDrink(id) {
    return http.post(`/drinks/${id}/restore`);
  },
};
