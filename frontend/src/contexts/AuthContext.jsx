/**
 * AuthContext — single source of truth for authentication state.
 *
 * Access token is held only in JS memory (a ref) so it is never persisted to
 * localStorage or a cookie. On page load the context attempts a silent refresh
 * using the HttpOnly cookie; if the cookie is absent or expired the user is
 * considered signed out.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import apiClient, { setAccessToken, setSignOutCallback } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // null = not yet known
  const [ready, setReady] = useState(false);    // false until the initial refresh attempt completes
  const accessRef = useRef(null);

  const storeToken = useCallback((token) => {
    accessRef.current = token;
    setAccessToken(token);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout/");
    } catch {
      // Ignore errors on logout (token may already be invalid).
    } finally {
      storeToken(null);
      setUser(null);
    }
  }, [storeToken]);

  // Register the sign-out callback so the Axios interceptor can call it on
  // refresh failure without importing AuthContext (which would create a cycle).
  useEffect(() => {
    setSignOutCallback(signOut);
  }, [signOut]);

  // On mount: attempt a silent refresh to restore the session from the cookie.
  useEffect(() => {
    apiClient
      .post("/auth/token/refresh/")
      .then(({ data }) => {
        storeToken(data.access);
        return apiClient.get("/users/me/");
      })
      .then(({ data }) => setUser(data))
      .catch(() => {
        // No valid cookie — user is signed out. That is fine.
      })
      .finally(() => setReady(true));
  }, [storeToken]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await apiClient.post("/auth/login/", { email, password });
      storeToken(data.access);
      const me = await apiClient.get("/users/me/");
      setUser(me.data);
    },
    [storeToken],
  );

  return (
    <AuthContext.Provider value={{ user, ready, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
