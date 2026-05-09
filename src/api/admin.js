import { http } from "./http";

export const adminApi = {
  async listPizzas({ withVariants = true } = {}) { const qs = new URLSearchParams(); qs.set("withVariants", String(withVariants)); return http.get(`/pizzas?${qs}`); },
  async listDeletedPizzas({ withVariants = true } = {}) { const qs = new URLSearchParams(); qs.set("withVariants", String(withVariants)); return http.get(`/pizzas/deleted?${qs}`); },
  async getPizza(id) { return http.get(`/pizzas/${id}`); },
  async createPizza(payload) { return http.post(`/pizzas`, payload); },
  async updatePizza(id, payload) { return http.put(`/pizzas/${id}`, payload); },
  async deletePizza(id) { return http.del(`/pizzas/${id}`); },
  async restorePizza(id) { return http.post(`/pizzas/${id}/restore`); },
  async getPizzaIngredients(pizzaId) { return http.get(`/pizzas/${pizzaId}/ingredients`); },
  async setPizzaIngredients(pizzaId, items) { return http.put(`/pizzas/${pizzaId}/ingredients`, items); },
  async getPizzaAllowedIngredients(pizzaId) { return http.get(`/pizzas/${pizzaId}/allowed-ingredients`); },
  async setPizzaAllowedIngredients(pizzaId, items) { return http.put(`/pizzas/${pizzaId}/allowed-ingredients`, items); },

  async listPastas({ withDetails = true } = {}) { const qs = new URLSearchParams(); qs.set("withDetails", String(withDetails)); return http.get(`/pastas?${qs}`); },
  async listDeletedPastas({ withDetails = true } = {}) { const qs = new URLSearchParams(); qs.set("withDetails", String(withDetails)); return http.get(`/pastas/deleted?${qs}`); },
  async getPasta(id) { return http.get(`/pastas/${id}`); },
  async createPasta(payload) { return http.post(`/pastas`, payload); },
  async updatePasta(id, payload) { return http.put(`/pastas/${id}`, payload); },
  async deletePasta(id) { return http.del(`/pastas/${id}`); },
  async restorePasta(id) { return http.post(`/pastas/${id}/restore`); },
  async getPastaSauces(pastaId) { return http.get(`/pastas/${pastaId}/sauces`); },
  async getPastaAllowedIngredients(pastaId) { return http.get(`/pastas/${pastaId}/allowed-ingredients`); },

  async listDrinks() { return http.get(`/drinks`); },
  async listDeletedDrinks() { return http.get(`/drinks/deleted`); },
  async getDrink(id) { return http.get(`/drinks/${id}`); },
  async createDrink(payload) { return http.post(`/drinks`, payload); },
  async updateDrink(id, payload) { return http.put(`/drinks/${id}`, payload); },
  async deleteDrink(id) { return http.del(`/drinks/${id}`); },
  async restoreDrink(id) { return http.post(`/drinks/${id}/restore`); },

  async listIngredientTypes() { return http.get("/ingredient-type"); },
  async createIngredientType(payload) { return http.post("/ingredient-type", payload); },
  async updateIngredientType(id, payload) { return http.put(`/ingredient-type/${id}`, payload); },
  async deleteIngredientType(id) { return http.del(`/ingredient-type/${id}`); },
  async deleteIngredientTypeByName(name) { return http.del("/ingredient-type", { name }); },
  async listIngredientsWithType(show = "all") { return http.get(`/ingredients/with-type?show=${encodeURIComponent(show)}`); },
  async createIngredient(payload) { return http.post("/ingredients", payload); },
  async updateIngredient(id, payload) { return http.put(`/ingredients/${id}`, payload); },
  async deleteIngredient(id) { return http.del(`/ingredients/${id}`); },
  async restoreIngredient(id) { return http.post(`/ingredients/${id}/restore`, {}); },

  async listUsers({ q = "", show = "active", page = 0, size = 20, sort = "id,desc" } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (show) params.set("show", show);
    params.set("page", String(page));
    params.set("size", String(size));
    if (sort) params.set("sort", sort);
    return http.get(`/admin/users?${params}`);
  },
  async changeRole(userId, role) { return http.patch(`/admin/users/${userId}/role`, { role }); },
  async softDelete(userId) { return http.del(`/admin/users/${userId}`); },
  async restore(userId) { return http.post(`/admin/users/${userId}/restore`); },
};
