import { http, tokenStore } from "./http";

export const authApi = {
    async register(payload) {
        const res = await http.post("/auth/register", payload);
        if (res?.token) tokenStore.set(res.token);
        return res; // { username, token }
    },
    async login(payload) {
        const res = await http.post("/auth/login", payload);
        if (res?.token) tokenStore.set(res.token);
        return res;                                                    // { username, token }
    },
    me: () => http.get("/users/me"),
    async updateMe(payload) {
        const res = await http.put("/users/me", payload);
        if (res?.token) tokenStore.set(res.token);
        return res;
    },
        logout: async () => {
            try { await http.post("/auth/logout"); } catch {}
            tokenStore.clear();
        },
};