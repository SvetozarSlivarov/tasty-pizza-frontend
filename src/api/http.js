const API_BASE = process.env.REACT_APP_API_BASE ?? "";

const TOKEN_KEY = "tp_token";
export const tokenStore = {
    get:   () => localStorage.getItem(TOKEN_KEY),
    set:   (t) => localStorage.setItem(TOKEN_KEY, t),
    clear: () => localStorage.removeItem(TOKEN_KEY),
};

const DEFAULT_TIMEOUT_MS = 15000;

function ensureLeadingSlash(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return path.startsWith("/") ? path : `/${path}`;
}

function buildUrl(path) {
    const p = ensureLeadingSlash(path);
    if (!API_BASE) return p;
    return API_BASE.replace(/\/+$/, "") + p;
}

function isCrossOrigin(url) {
    try {
        const u = new URL(url, window.location.origin);
        return u.origin !== window.location.origin;
    } catch {
        return false;
    }
}

function isJsonResponse(res) {
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json");
}

function makeHeaders(body, extra) {
    const base = {};
    if (body != null && !(body instanceof FormData)) {
        base["Content-Type"] = "application/json";
    }
    const token = tokenStore.get();
    if (token) base["Authorization"] = `Bearer ${token}`;
    return { ...base, ...(extra || {}) };
}

export async function request(path, { method = "GET", body, headers, signal, timeoutMs } = {}) {
    const url = buildUrl(path);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const hasBody = body != null;
    const payload =
        hasBody && !(body instanceof FormData) && typeof body !== "string"
            ? JSON.stringify(body)
            : body ?? undefined;

    const res = await fetch(url, {
        method,
        credentials: isCrossOrigin(url) ? "include" : "same-origin",
        headers: makeHeaders(body, headers),
        body: payload,
        signal: signal ?? controller.signal,
        cache: "no-store",
    }).finally(() => clearTimeout(timeout));

    if (res.status === 204) {
        if (!res.ok) {
            const err = new Error(`${res.status} ${res.statusText}`);
            err.status = res.status;
            throw err;
        }
        return null;
    }

    let data = null;
    try {
        data = isJsonResponse(res) ? await res.json() : await res.text();
    } catch {
    }
    if (!res.ok) {
        const msg =
            (data && (data.message || data.error)) ||
            `${res.status} ${res.statusText}` ||
            "Request failed";
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        err.url = url;
        err.method = method;
        throw err;
    }

    return data;
}

export const http = {
    get:   (p,   opt) => request(p,             { ...opt, method: "GET" }),
    post:  (p,b, opt) => request(p,             { ...opt, method: "POST",  body: b }),
    put:   (p,b, opt) => request(p,             { ...opt, method: "PUT",   body: b }),
    patch: (p,b, opt) => request(p,             { ...opt, method: "PATCH", body: b }),
    del:   (p,   opt) => request(p,             { ...opt, method: "DELETE" }),
};
