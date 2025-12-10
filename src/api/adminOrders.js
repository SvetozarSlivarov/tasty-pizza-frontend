import { http } from "./http";
export const adminOrdersApi = {
    list: ({ status = "all", q = "", page = 1, size = 20 } = {}) =>
        http.get(`api/admin/orders?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}&size=${size}`),
    get: (id) => http.get(`api/admin/orders/${id}`),
    startPreparing: (id) => http.post(`/api/orders/${id}/start-preparing`, {}),
    outForDelivery: (id) => http.post(`/api/orders/${id}/out-for-delivery`, {}),
    deliver:        (id) => http.post(`/api/orders/${id}/deliver`, {}),
    cancel:         (id) => http.post(`/api/orders/${id}/cancel`, {}),
};

export function nextActionsForStatus(status) {
    switch ((status || "").toUpperCase()) {
        case "ORDERED":           return ["startPreparing", "cancel"];
        case "PREPARING":         return ["outForDelivery", "cancel"];
        case "OUT_FOR_DELIVERY":  return ["deliver", "cancel"];
        case "DELIVERED":         return [];
        case "CANCELLED":         return [];
        default:                  return [];
    }
}
