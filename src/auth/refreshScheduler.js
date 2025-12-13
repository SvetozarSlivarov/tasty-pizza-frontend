// src/auth/refreshScheduler.js
import { tokenStore } from "../api/http";
import { authApi } from "../api/auth";

let refreshTimer = null;
let inFlightRefresh = null;

function clearTimer() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

async function doRefresh() {
  // anti-duplicate: ако таймер + 401 interceptor ударят едновременно
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    try {
      // refresh token е в HttpOnly cookie -> браузърът го праща автоматично
      const res = await authApi.refresh({ skipAuthRefresh: true });
      if (res?.accessToken) tokenStore.set(res.accessToken);

      // след успешен refresh -> планирай пак
      scheduleRefresh(15_000);
      return res;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
}

export function scheduleRefresh(earlyMs = 15_000) {
  clearTimer();

  const at = tokenStore.get?.() ?? tokenStore.value ?? null;
  if (!at) return;

  const decoded = decodeJwt(at);
  const expSec = decoded?.exp;
  if (!expSec) return;

  const expMs = expSec * 1000;
  const delay = Math.max(0, expMs - Date.now() - earlyMs);

  refreshTimer = setTimeout(() => {
    doRefresh().catch(() => {
      // refresh cookie е изтекъл/невалиден -> спираш да циклиш
      clearTimer();
      // по желание: logout/redirect
      // tokenStore.clear?.(); tokenStore.set(null);
    });
  }, delay);
}

export function startRefreshScheduler(earlyMs = 15_000) {
  // initial schedule (например при app boot)
  scheduleRefresh(earlyMs);

  // автоматично рескедюлване при login/refresh/logout
  const onToken = () => scheduleRefresh(earlyMs);
  window.addEventListener("auth:token", onToken);

  return () => {
    window.removeEventListener("auth:token", onToken);
    clearTimer();
  };
}

export function stopRefreshScheduler() {
  clearTimer();
}
