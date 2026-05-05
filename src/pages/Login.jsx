import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang, UI } from "../context/LangContext";
import toast from "react-hot-toast";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { lang, t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch {
      toast.error(lang === "ru" ? "Неверный email или пароль" : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "calc(100vh - 56px - 60px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "32px 16px"
    }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="nav-brand-mark" style={{
            width: 48, height: 48, fontSize: 22,
            margin: "0 auto 18px"
          }} />
          <div className="kicker mb-8">Mileston</div>
          <h1 style={{
            fontSize: 28, fontWeight: 500, margin: 0,
            fontFamily: "var(--font-serif)",
            letterSpacing: "-0.015em"
          }}>
            {t(UI.login)}
          </h1>
          <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "8px 0 0" }}>
            {lang === "ru" ? "Войдите в свой аккаунт" : "Sign in to your account"}
          </p>
        </div>

        <div className="card card-pad-lg">
          <form onSubmit={handleSubmit}>
            <div className="mb-16">
              <label className="label">{t(UI.email)}</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="mb-16">
              <label className="label">{t(UI.password)}</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg btn-block"
            >
              {loading
                ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "var(--bg)" }} />
                : t(UI.login)}
            </button>
          </form>

          <div style={{
            textAlign: "center", marginTop: 20,
            paddingTop: 16, borderTop: "1px solid var(--hair)"
          }}>
            <span style={{ color: "var(--ink-3)", fontSize: 13 }}>
              {lang === "ru" ? "Нет аккаунта? " : "No account? "}
            </span>
            <Link to="/register" style={{
              color: "var(--accent)", fontWeight: 500, fontSize: 13
            }}>
              {t(UI.register)}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
