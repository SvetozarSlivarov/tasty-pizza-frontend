// src/api/adminOrders.js
import { http } from "./http";

function toQuery(params = {}) {
  const usp = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    usp.set(k, String(v));
  });

  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export async function adminListOrders({ status = "all", q = "", userId = null, page = 1, size = 20 } = {}) {
  const backendPage = Math.max(0, (page ?? 1) - 1);

  const query = toQuery({
    status,
    q: q ?? "",
    userId: userId ?? undefined,
    page: backendPage,
    size,
  });

  return http.get(`/admin/orders${query}`);
}

export async function adminGetOrder(id) {
  return http.get(`/admin/orders/${id}`);
}

export async function adminStartPreparing(id) {
  return http.post(`/orders/${id}/start-preparing`);
}

export async function adminOutForDelivery(id) {
  return http.post(`/orders/${id}/out-for-delivery`);
}

export async function adminDeliver(id) {
  return http.post(`/orders/${id}/deliver`);
}

export async function adminCancel(id) {
  return http.post(`/orders/${id}/cancel`);
}
