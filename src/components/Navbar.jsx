import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { useLang, NAV_LABELS } from "../context/LangContext";
import { useTheme } from "../context/ThemeContext";

function Wallet({ account, balance }) {
  const short = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "—";
  return (
    <div className="wallet" title={account || ""}>
      <span className="wallet-dot" />
      <span className="wallet-eth">
        <strong>{balance ? Number(balance).toFixed(3) : "0.000"}</strong> ETH
      </span>
      <span style={{ color: "var(--ink-4)" }}>·</span>
      <span>{short}</span>
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { account, balance, connect } = useWeb3();
  const { lang, toggle: toggleLang, t } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const path = location.pathname;
  const isActive = (p) => path === p || (p !== "/" && path.startsWith(p));

  const isStandalone = import.meta.env?.VITE_STANDALONE === "true";

  const tabs = [
    { id: "home", to: "/", label: NAV_LABELS.home, show: true },
    // В standalone-сборке поддерживаем оба сценария:
    //   • анонимный — кампания доступна любому подключившему кошелёк;
    //   • авторизованный — приоритет за ролью аккаунта.
    { id: "create", to: "/create", label: NAV_LABELS.create,
      show: isStandalone
        ? (!!account || (user && user.role === "author"))
        : (user && user.role === "author") },
    { id: "dashboard", to: "/dashboard", label: NAV_LABELS.dashboard,
      show: user && user.role === "author" },
    { id: "profile", to: "/profile", label: NAV_LABELS.profile,
      show: !!user },
  ];

  return (
    <nav className="nav">
      <Link to="/" className="nav-brand">
        <span className="nav-brand-mark" />
        <span>Mileston</span>
        <span style={{
          color: "var(--ink-4)", fontWeight: 400, fontSize: 12,
          marginLeft: 6, fontFamily: "var(--font-mono)"
        }}>
          v0.4 · sepolia
        </span>
      </Link>

      <div className="nav-tabs">
        {tabs.filter(tb => tb.show).map(tb => (
          <Link
            key={tb.id}
            to={tb.to}
            className={`nav-tab ${isActive(tb.to) ? "is-active" : ""}`}
          >
            {t(tb.label)}
          </Link>
        ))}
      </div>

      <div className="nav-actions">
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleLang}
          title="Язык / Language"
        >
          {lang === "ru" ? "RU" : "EN"} ▾
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleTheme}
          title="Тема / Theme"
          style={{ minWidth: 32 }}
        >
          {theme === "light" ? "◐" : "◑"}
        </button>

        {account ? (
          <Wallet account={account} balance={balance} />
        ) : (isStandalone || user) ? (
          <button className="btn btn-primary btn-sm" onClick={connect}>
            {lang === "ru" ? "Подключить кошелёк" : "Connect wallet"}
          </button>
        ) : null}

        {user ? (
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            title={user.email}
          >
            {lang === "ru" ? "Выйти" : "Sign out"}
          </button>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">
              {lang === "ru" ? "Войти" : "Sign in"}
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              {lang === "ru" ? "Регистрация" : "Sign up"}
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
