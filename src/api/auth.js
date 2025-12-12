import { http, tokenStore } from "./http";

function storeAuth(res) {
  if (res?.accessToken) tokenStore.set(res.accessToken);
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

  async logout() {
    try {
      await http.post("/auth/logout");
    } finally {
      tokenStore.clear();
    }
  },

  async refresh() {
    const res = await http.post("/auth/refresh");
    storeAuth(res);
    return res;
  },
};
