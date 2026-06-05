import { http } from "./http";

export const ordersApi = {
    my:   (lang = "en") => http.get(`orders/my?lang=${encodeURIComponent(lang)}`),

    reorder: (orderId, lang = "en") =>
        http.post(`/orders/${orderId}/reorder?lang=${encodeURIComponent(lang)}`, {}),

    statusHistory: (orderId) => {
        return http.get(`/orders/${orderId}/statusHistory`);
  },
};
