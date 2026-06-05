import { http } from "./http";

const PIZZAS = "/pizzas";
const PASTAS = "/pastas";
const DRINKS = "/drinks";

function withLang(params = {}, lang) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => qs.set(key, String(value)));
    if (lang) qs.set("lang", lang);
    const query = qs.toString();
    return query ? `?${query}` : "";
}

export const catalogApi = {
    pizzas: (withVariants = false, lang = "en") =>
        http.get(`${PIZZAS}${withLang({ withVariants: withVariants ? "true" : "false" }, lang)}`),
    pastas: (withDetails = false, lang = "en") =>
        http.get(`${PASTAS}${withLang({ withDetails: withDetails ? "true" : "false" }, lang)}`),
    drinks: (lang = "en") =>
        http.get(`${DRINKS}${withLang({}, lang)}`),
};

export const productApi = {
    pizza: (id, withVariants = true, lang = "en") =>
        http.get(`${PIZZAS}/${id}${withLang({ withVariants: withVariants ? "true" : "false" }, lang)}`),
    pizzaIngredients: (id) => http.get(`${PIZZAS}/${id}/ingredients`),
    pizzaAllowedIngredients: (id) => http.get(`${PIZZAS}/${id}/allowed-ingredients`),
    pasta: (id, lang = "en") => http.get(`${PASTAS}/${id}${withLang({}, lang)}`),
    pastaSauces: (id) => http.get(`${PASTAS}/${id}/sauces`),
    pastaAllowedIngredients: (id) => http.get(`${PASTAS}/${id}/allowed-ingredients`),
    drink: (id, lang = "en") => http.get(`${DRINKS}/${id}${withLang({}, lang)}`),
};
