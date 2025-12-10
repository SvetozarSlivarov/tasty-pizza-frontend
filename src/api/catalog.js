import { http } from "./http";

const PIZZAS = "/pizzas";
const DRINKS = "/drinks";

export const catalogApi = {
    pizzas: (withVariants = false) =>
        http.get(`${PIZZAS}?withVariants=${withVariants ? "true" : "false"}`),
    drinks: () =>
        http.get(`${DRINKS}`),
};

export const productApi = {
    pizza: (id, withVariants = true) =>
        http.get(`${PIZZAS}/${id}?withVariants=${withVariants ? "true" : "false"}`),
    pizzaIngredients:        (id) => http.get(`${PIZZAS}/${id}/ingredients`),
    pizzaAllowedIngredients: (id) => http.get(`${PIZZAS}/${id}/allowed-ingredients`),
    drink: (id) => http.get(`${DRINKS}/${id}`),
};
