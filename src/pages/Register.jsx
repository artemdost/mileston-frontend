import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang, UI } from "../context/LangContext";
import toast from "react-hot-toast";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { lang, t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("investor");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error(lang === "ru" ? "Пароли не совпадают" : "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error(lang === "ru" ? "Минимум 6 символов" : "Min 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, role);
      navigate("/login");
    } catch {
      toast.error(lang === "ru" ? "Ошибка регистрации" : "Registration failed");
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
            {t(UI.register)}
          </h1>
          <p style={{ color: "var(--ink-3)", fontSize: 13, margin: "8px 0 0" }}>
            {lang === "ru" ? "Создайте аккаунт" : "Create your account"}
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
              />
            </div>
            <div className="mb-16">
              <label className="label">{t(UI.password)}</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={lang === "ru" ? "Мин. 6 символов" : "Min 6 chars"}
                disabled={loading}
              />
            </div>
            <div className="mb-16">
              <label className="label">{lang === "ru" ? "Подтвердите пароль" : "Confirm password"}</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div className="mb-16">
              <label className="label">{lang === "ru" ? "Роль" : "Role"}</label>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8
              }}>
                <button
                  type="button"
                  onClick={() => setRole("investor")}
                  className={`btn ${role === "investor" ? "btn-primary" : "btn-soft"}`}
                  style={{ padding: "12px 14px", flexDirection: "column", height: 60, gap: 4 }}
                >
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}>01</div>
                  {t(UI.role_investor)}
                </button>
                <button
                  type="button"
                  onClick={() => setRole("author")}
                  className={`btn ${role === "author" ? "btn-primary" : "btn-soft"}`}
                  style={{ padding: "12px 14px", flexDirection: "column", height: 60, gap: 4 }}
                >
                  <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7 }}>02</div>
                  {t(UI.role_author)}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg btn-block"
            >
              {loading
                ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "var(--bg)" }} />
                : t(UI.register)}
            </button>
          </form>

          <div style={{
            textAlign: "center", marginTop: 20,
            paddingTop: 16, borderTop: "1px solid var(--hair)"
          }}>
            <span style={{ color: "var(--ink-3)", fontSize: 13 }}>
              {lang === "ru" ? "Уже есть аккаунт? " : "Have an account? "}
            </span>
            <Link to="/login" style={{
              color: "var(--accent)", fontWeight: 500, fontSize: 13
            }}>
              {t(UI.login)}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
