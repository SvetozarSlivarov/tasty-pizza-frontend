import { http, tokenStore, refreshTokenStore } from "./http";

function storeAuth(res) {
  if (res?.accessToken) tokenStore.set(res.accessToken);
  if (res?.refreshToken) refreshTokenStore.set(res.refreshToken);
}

export const authApi = {
  async register(payload) {
    const res = await http.post("/auth/register", payload);
    storeAuth(res);
    return res;
  },

  async login(payload) {
    const res = await http.post("/auth/login", payload);
    storeAuth(res);
    return res;
  },

  me: () => http.get("/users/me"),

  async updateMe(payload) {
    return http.put("/users/me", payload);
  },

  logout: async () => {
    tokenStore.clear();
    refreshTokenStore.clear();
  },

  refresh: async () => {
    const refreshToken = refreshTokenStore.get();
    if (!refreshToken) throw new Error("Missing refresh token");

    const res = await http.post("/auth/refresh", { refreshToken });
    storeAuth(res);
    return res;
  },
};
