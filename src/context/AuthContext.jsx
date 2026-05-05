import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import toast from "react-hot-toast";
import {
  demoCurrentUser, demoRegister, demoLogin, demoLogout,
  isStandalone as isStandaloneFn,
} from "../utils/demoStore";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const STANDALONE = isStandaloneFn();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Axios interceptor — нужен только для backend-сборки
  useEffect(() => {
    if (STANDALONE) return;
    const interceptor = api.interceptors.request.use((config) => {
      const token = localStorage.getItem("token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => api.interceptors.request.eject(interceptor);
  }, []);

  // На старте: standalone — читаем сессию из localStorage; иначе — токен + /auth/me
  useEffect(() => {
    if (STANDALONE) {
      try {
        const u = demoCurrentUser();
        setUser(u);
      } catch {}
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("token");
    if (token) {
      api.get("/auth/me")
        .then((res) => {
          const u = res.data?.user || res.data;
          // Защита от SPA-fallback: если backend нет, axios получит HTML и
          // res.data будет строкой / not-object — таких user'ов отбрасываем.
          if (u && typeof u === "object" && u.email) setUser(u);
          else { localStorage.removeItem("token"); setUser(null); }
        })
        .catch(() => { localStorage.removeItem("token"); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    if (STANDALONE) {
      try {
        const u = demoLogin({ email, password });
        setUser(u);
        toast.success("Вход выполнен (demo)");
        return u;
      } catch (err) {
        toast.error(err.message || "Ошибка входа");
        throw err;
      }
    }
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token, user: userData } = res.data;
      localStorage.setItem("token", token);
      setUser(userData);
      toast.success("Вход выполнен успешно!");
      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || "Ошибка входа";
      toast.error(msg);
      throw err;
    }
  }, []);

  const register = useCallback(async (email, password, role) => {
    if (STANDALONE) {
      try {
        const u = demoRegister({ email, password, role });
        toast.success("Регистрация (demo). Войдите.");
        return u;
      } catch (err) {
        toast.error(err.message || "Ошибка регистрации");
        throw err;
      }
    }
    try {
      const res = await api.post("/auth/register", { email, password, role });
      toast.success("Регистрация успешна! Войдите в систему.");
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || "Ошибка регистрации";
      toast.error(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    if (STANDALONE) {
      demoLogout();
      setUser(null);
      toast.success("Вы вышли из системы");
      return;
    }
    localStorage.removeItem("token");
    setUser(null);
    toast.success("Вы вышли из системы");
  }, []);

  const refreshUser = useCallback(async () => {
    if (STANDALONE) {
      try { setUser(demoCurrentUser()); } catch {}
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user || res.data);
    } catch {}
  }, []);

  const value = { user, setUser, loading, login, register, logout, refreshUser, isStandalone: STANDALONE };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
