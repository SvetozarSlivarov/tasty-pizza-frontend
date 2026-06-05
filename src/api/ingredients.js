import { http } from "./http";

export const ingredientsApi = {
    all: (lang = "en") => http.get(`/ingredients?lang=${encodeURIComponent(lang)}`)
};
