import { http } from "./http";

export const ordersApi = {
    my:   ({ status = "all", sort = "ordered_desc" } = {}) =>
        http.get(`/users/me/orders?status=${encodeURIComponent(status)}&sort=${encodeURIComponent(sort)}`),

    reorder: (orderId) =>
        http.post(`api/orders/${orderId}/reorder`, {}),
};
