import { http } from "./http";

export const ordersApi = {
    my:   () => http.get(`orders/my`),

    reorder: (orderId) =>
        http.post(`/orders/${orderId}/reorder`, {}),

    statusHistory: (orderId) => {
        return http.get(`/orders/${orderId}/statusHistory`);
  },
};
