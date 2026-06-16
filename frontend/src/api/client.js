/**
 * Axios instance for all API calls.
 *
 * Token transport contract:
 *   - Access token: stored in JS memory (via AuthContext), sent as Authorization: Bearer.
 *   - Refresh token: lives in an HttpOnly cookie; the browser sends it automatically
 *     to the refresh endpoint. We never read or write it from JS.
 *
 * On 401, the interceptor calls the refresh endpoint once. If that succeeds the
 * original request is retried with the new access token. If it fails the user is
 * signed out.
 */

import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api/v1",
  withCredentials: true, // send the HttpOnly refresh cookie on cross-origin requests
  headers: { "Content-Type": "application/json" },
});

// Populated by AuthContext after login / refresh.
let _accessToken = null;
let _onSignOut = null;

export function setAccessToken(token) {
  _accessToken = token;
}

export function setSignOutCallback(fn) {
  _onSignOut = fn;
}

// Attach the access token to every request.
apiClient.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers["Authorization"] = `Bearer ${_accessToken}`;
  }
  return config;
});

// On 401: attempt a silent refresh, then retry once.
let _refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Don't try to refresh on a non-401, an already-retried request, or the
    // refresh call itself (its own 401 must not trigger another refresh).
    if (
      error.response?.status !== 401 ||
      original._retried ||
      original.url?.includes("/auth/token/refresh/")
    ) {
      return Promise.reject(error);
    }

    original._retried = true;

    // Deduplicate concurrent 401s: only one refresh call in flight at a time.
    if (!_refreshPromise) {
      _refreshPromise = apiClient
        .post("/auth/token/refresh/")
        .finally(() => {
          _refreshPromise = null;
        });
    }

    try {
      const { data } = await _refreshPromise;
      setAccessToken(data.access);
      original.headers["Authorization"] = `Bearer ${data.access}`;
      return apiClient(original);
    } catch {
      _accessToken = null;
      _onSignOut?.();
      return Promise.reject(error);
    }
  },
);

export default apiClient;
