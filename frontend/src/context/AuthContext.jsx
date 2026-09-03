/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

// Decode JWT payload without a library
function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const payload = decodeToken(token);
  return Boolean(
    payload?.sub && (!payload.exp || payload.exp * 1000 > Date.now()),
  );
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem("token");
    return storedToken && isTokenValid(storedToken) ? storedToken : null;
  });
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || "",
  );

  useEffect(() => {
    function handleUnauthorized() {
      logout();
    }

    window.addEventListener("moviechat:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("moviechat:unauthorized", handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    const payload = decodeToken(token);
    if (!payload?.exp) return undefined;
    const remaining = payload.exp * 1000 - Date.now();
    const timer = window.setTimeout(logout, Math.max(remaining, 0));
    return () => window.clearTimeout(timer);
  }, [token]);

  function login(newToken) {
    localStorage.setItem("token", newToken);
    setToken(newToken);

    // Extract username from JWT payload (sub field)
    const payload = decodeToken(newToken);
    const uname = payload?.sub || "";
    localStorage.setItem("username", uname);
    setUsername(uname);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername("");
  }

  return (
    <AuthContext.Provider
      value={{ token, username, login, logout, isLoggedIn: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
