import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Decode JWT payload without a library
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');

  function login(newToken) {
    localStorage.setItem('token', newToken);
    setToken(newToken);

    // Extract username from JWT payload (sub field)
    const payload = decodeToken(newToken);
    const uname = payload?.sub || '';
    localStorage.setItem('username', uname);
    setUsername(uname);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername('');
  }

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}