// Frontend auth helpers: access token, refresh flow, logout invalidation.
export function getAuthHeaders(extra = {}) {
  if (typeof window === "undefined") {
    return extra;
  }

  const token = localStorage.getItem("accessToken");
  const headers = { ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function saveAuthSession(data) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem("user", JSON.stringify(data.user));
  if (data.accessToken) {
    localStorage.setItem("accessToken", data.accessToken);
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem("user");
  localStorage.removeItem("accessToken");
}

export async function refreshAccessToken() {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include"
  });
  if (!response.ok) {
    clearAuthSession();
    return null;
  }
  const data = await response.json();
  if (data.accessToken && data.user) {
    saveAuthSession(data);
    return data.accessToken;
  }
  clearAuthSession();
  return null;
}

export async function logoutSession() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders()
    });
  } catch {
    // Best-effort server logout.
  }
  clearAuthSession();
}

export async function authFetch(url, options = {}) {
  const doFetch = (headers) =>
    fetch(url, {
      ...options,
      credentials: "include",
      headers: { ...headers, ...(options.headers || {}) }
    });

  let response = await doFetch(getAuthHeaders());
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await doFetch(getAuthHeaders());
    }
  }
  return response;
}
