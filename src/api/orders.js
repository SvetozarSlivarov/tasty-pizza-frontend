import { http } from "./http";

export const ordersApi = {
    my:   () => http.get(`orders/my`),

    reorder: (orderId) =>
        http.post(`api/orders/${orderId}/reorder`, {}),
};
