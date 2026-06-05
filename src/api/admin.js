import { http } from "./http";

function withParams(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export const adminApi = {
  async health() { return http.get("/admin/health"); },
  async listPizzas({ withVariants = true, lang = "en" } = {}) { return http.get(`/pizzas${withParams({ withVariants, lang })}`); },
  async listDeletedPizzas({ withVariants = true, lang = "en" } = {}) { return http.get(`/pizzas/deleted${withParams({ withVariants, lang })}`); },
  async getPizza(id, lang = "en") { return http.get(`/pizzas/${id}${withParams({ lang })}`); },
  async createPizza(payload) { return http.post(`/pizzas`, payload); },
  async updatePizza(id, payload) { return http.put(`/pizzas/${id}`, payload); },
  async deletePizza(id) { return http.del(`/pizzas/${id}`); },
  async restorePizza(id) { return http.post(`/pizzas/${id}/restore`); },
  async previewTranslations(payload) { return http.post(`/admin/translations/preview`, payload); },
  async getTranslations(entityType, entityId) { return http.get(`/admin/translations/${entityType}/${entityId}`); },
  async getPizzaIngredients(pizzaId, lang = "en") { return http.get(`/pizzas/${pizzaId}/ingredients${withParams({ lang })}`); },
  async setPizzaIngredients(pizzaId, items) { return http.put(`/pizzas/${pizzaId}/ingredients`, items); },
  async getPizzaAllowedIngredients(pizzaId, lang = "en") { return http.get(`/pizzas/${pizzaId}/allowed-ingredients${withParams({ lang })}`); },
  async setPizzaAllowedIngredients(pizzaId, items) { return http.put(`/pizzas/${pizzaId}/allowed-ingredients`, items); },

  async listPastas({ withDetails = true, lang = "en" } = {}) { return http.get(`/pastas${withParams({ withDetails, lang })}`); },
  async listDeletedPastas({ withDetails = true, lang = "en" } = {}) { return http.get(`/pastas/deleted${withParams({ withDetails, lang })}`); },
  async getPasta(id, lang = "en") { return http.get(`/pastas/${id}${withParams({ lang })}`); },
  async createPasta(payload) { return http.post(`/pastas`, payload); },
  async updatePasta(id, payload) { return http.put(`/pastas/${id}`, payload); },
  async deletePasta(id) { return http.del(`/pastas/${id}`); },
  async restorePasta(id) { return http.post(`/pastas/${id}/restore`); },
  async getPastaSauces(pastaId, lang = "en") { return http.get(`/pastas/${pastaId}/sauces${withParams({ lang })}`); },
  async getPastaAllowedIngredients(pastaId, lang = "en") { return http.get(`/pastas/${pastaId}/allowed-ingredients${withParams({ lang })}`); },

  async listDrinks(lang = "en") { return http.get(`/drinks${withParams({ lang })}`); },
  async listDeletedDrinks(lang = "en") { return http.get(`/drinks/deleted${withParams({ lang })}`); },
  async getDrink(id, lang = "en") { return http.get(`/drinks/${id}${withParams({ lang })}`); },
  async createDrink(payload) { return http.post(`/drinks`, payload); },
  async updateDrink(id, payload) { return http.put(`/drinks/${id}`, payload); },
  async deleteDrink(id) { return http.del(`/drinks/${id}`); },
  async restoreDrink(id) { return http.post(`/drinks/${id}/restore`); },

  async listIngredientTypes(lang = "en") { return http.get(`/ingredient-type${withParams({ lang })}`); },
  async createIngredientType(payload) { return http.post("/ingredient-type", payload); },
  async updateIngredientType(id, payload) { return http.put(`/ingredient-type/${id}`, payload); },
  async deleteIngredientType(id) { return http.del(`/ingredient-type/${id}`); },
  async deleteIngredientTypeByName(name) { return http.del("/ingredient-type", { name }); },
  async listIngredientsWithType(show = "all", lang = "en") { return http.get(`/ingredients/with-type${withParams({ show, lang })}`); },
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
