import { http } from "./http";

export const ingredientsApi = {
    all: () => http.get("/api/ingredients")
};