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

  async logout() {
    try {
      await http.post("/auth/logout");
    } finally {
      tokenStore.clear();
    }
  },

  async refresh(opt = {}) {
  const res = await http.post("/auth/refresh", undefined, { ...opt, skipAuthRefresh: true });
  storeAuth(res);
  return res;
},
  updateFullName: (payload) => http.patch("/users/me/fullname", payload),
  updateUsername: (payload) => http.patch("/users/me/username", payload),
  changePassword: (payload) => http.patch("/users/me/password", payload),
};
