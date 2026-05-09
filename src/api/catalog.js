import { http } from "./http";

const PIZZAS = "/pizzas";
const PASTAS = "/pastas";
const DRINKS = "/drinks";

export const catalogApi = {
    pizzas: (withVariants = false) =>
        http.get(`${PIZZAS}?withVariants=${withVariants ? "true" : "false"}`),
    pastas: (withDetails = false) =>
        http.get(`${PASTAS}?withDetails=${withDetails ? "true" : "false"}`),
    drinks: () =>
        http.get(`${DRINKS}`),
};

export const productApi = {
    pizza: (id, withVariants = true) =>
        http.get(`${PIZZAS}/${id}?withVariants=${withVariants ? "true" : "false"}`),
    pizzaIngredients: (id) => http.get(`${PIZZAS}/${id}/ingredients`),
    pizzaAllowedIngredients: (id) => http.get(`${PIZZAS}/${id}/allowed-ingredients`),
    pasta: (id) => http.get(`${PASTAS}/${id}`),
    pastaSauces: (id) => http.get(`${PASTAS}/${id}/sauces`),
    pastaAllowedIngredients: (id) => http.get(`${PASTAS}/${id}/allowed-ingredients`),
    drink: (id) => http.get(`${DRINKS}/${id}`),
};
