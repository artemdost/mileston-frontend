import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { useLang, UI } from "../context/LangContext";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, logout } = useAuth();
  const { account, balance, isConnected, signer, bindWallet, unbindWallet, connect } = useWeb3();
  const { lang, t } = useLang();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchData();
  }, [user]); // eslint-disable-line

  const fetchData = async () => {
    setLoading(true);
    try {
      // В standalone-сборке backend отсутствует — таблицы пустые,
      // история формируется on-chain (см. ProjectDetail/VotingPage).
      try { const r = await api.get("/transactions"); setTransactions(r.data || []); } catch { setTransactions([]); }
      if (user?.role === "author") {
        try { const r = await api.get("/projects?author=me"); setProjects(r.data || []); } catch { setProjects([]); }
      }
    } finally { setLoading(false); }
  };

  const kycStatus = user?.kyc?.status || (user?.kyc_verified ? "verified" : "none");

  const handleBind = async () => {
    setBinding(true);
    try {
      await bindWallet();
      toast.success(lang === "ru" ? "Кошелёк привязан" : "Wallet bound");
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Error");
    } finally { setBinding(false); }
  };

  const handleUnbind = async () => {
    setBinding(true);
    try {
      await unbindWallet();
      toast.success(lang === "ru" ? "Кошелёк отвязан" : "Wallet unbound");
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || "Error");
    } finally { setBinding(false); }
  };

  if (!user) return null;

  const roleLabel = {
    investor: { ru: "Инвестор", en: "Investor" },
    author:   { ru: "Автор",    en: "Founder" },
    admin:    { ru: "Админ",    en: "Admin" },
  }[user.role] || { ru: user.role, en: user.role };

  return (
    <div className="app-main narrow">
      <div className="mb-24">
        <div className="kicker mb-8">{lang === "ru" ? "Аккаунт" : "Account"}</div>
        <h1 style={{
          fontSize: 36, fontWeight: 500, margin: 0,
          fontFamily: "var(--font-serif)", letterSpacing: "-0.015em"
        }}>
          {lang === "ru" ? "Профиль" : "Profile"}
        </h1>
      </div>

      {/* User card */}
      <div className="card card-pad-lg mb-16">
        <div className="row mb-16" style={{ gap: 16, alignItems: "center" }}>
          <div style={{
            width: 56, height: 56,
            borderRadius: "50%",
            background: "var(--ink)", color: "var(--bg)",
            display: "grid", placeItems: "center",
            fontSize: 22, fontWeight: 500,
            fontFamily: "var(--font-mono)"
          }}>
            {user.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{user.email}</h2>
            <div className="row mt-8" style={{ gap: 6 }}>
              <span className="badge is-active">
                <span className="badge-dot" />
                {roleLabel[lang]}
              </span>
              <span className="kicker">id #{user.id}</span>
            </div>
          </div>
        </div>

        <dl className="dl">
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>{lang === "ru" ? "Роль" : "Role"}</dt>
          <dd>{roleLabel[lang]}</dd>
          <dt>{lang === "ru" ? "Регистрация" : "Joined"}</dt>
          <dd>{user.created_at ? new Date(user.created_at).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US") : "—"}</dd>
        </dl>
      </div>

      {/* KYC */}
      <div className="card card-pad-lg mb-16">
        <div className="kicker mb-8">{lang === "ru" ? "Верификация" : "Verification"}</div>
        <div className="between mb-12" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>
              KYC
            </h3>
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              {lang === "ru"
                ? "Требуется для инвестирования и создания кампаний (FR-07). В demo-сборке используется заглушка."
                : "Required to invest and create campaigns (FR-07). Demo build uses a stub."}
            </p>
          </div>
          <div className="col" style={{ alignItems: "flex-end", gap: 8 }}>
            {kycStatus === "verified" ? (
              <span className="badge is-active">
                <span className="badge-dot" />
                {lang === "ru" ? "Верифицирован" : "Verified"}
              </span>
            ) : kycStatus === "pending" ? (
              <span className="badge is-voting">
                <span className="badge-dot" />
                {lang === "ru" ? "На проверке" : "Pending"}
              </span>
            ) : (
              <span className="badge is-completed">
                <span className="badge-dot" />
                {lang === "ru" ? "Не пройден" : "Not verified"}
              </span>
            )}
            <Link to="/kyc" className="btn btn-soft btn-sm">
              {kycStatus === "verified"
                ? (lang === "ru" ? "Подробнее" : "Details")
                : (lang === "ru" ? "Пройти KYC" : "Start KYC")}
            </Link>
          </div>
        </div>
      </div>

      {/* Wallet */}
      <div className="card card-pad-lg mb-16">
        <div className="kicker mb-8">{lang === "ru" ? "Кошелёк" : "Wallet"}</div>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>
          {lang === "ru" ? "Криптовалютный кошелёк" : "Crypto wallet"}
        </h3>

        {user.wallet_address ? (
          <div>
            <div className="row mb-12">
              <span className="badge is-active">
                <span className="badge-dot" />
                {lang === "ru" ? "Привязан" : "Bound"}
              </span>
              {balance && isConnected && (
                <span className="mono" style={{ fontSize: 14 }}>
                  {parseFloat(balance).toFixed(3)} ETH
                </span>
              )}
            </div>
            <div className="addr" style={{
              display: "block", padding: "8px 12px",
              wordBreak: "break-all", fontSize: 12,
              marginBottom: 12
            }}>
              {user.wallet_address}
            </div>
            <button
              onClick={handleUnbind}
              disabled={binding || !signer}
              className="btn btn-ghost btn-sm"
            >
              {binding
                ? <span className="loading-spin" style={{ width: 12, height: 12, borderWidth: 2 }} />
                : (lang === "ru" ? "Отвязать кошелёк" : "Unbind wallet")}
            </button>
            {!isConnected && (
              <div className="kicker" style={{ marginTop: 8, color: "var(--warn)" }}>
                {lang === "ru" ? "Подключите этот кошелёк для отвязки" : "Connect this wallet to unbind"}
              </div>
            )}
          </div>
        ) : isConnected && account ? (
          <div>
            <div className="row mb-12">
              <span className="badge is-voting">
                <span className="badge-dot" />
                {lang === "ru" ? "Не привязан" : "Not bound"}
              </span>
            </div>
            <div className="addr" style={{
              display: "block", padding: "8px 12px",
              wordBreak: "break-all", fontSize: 12,
              marginBottom: 12
            }}>
              {account}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "0 0 12px" }}>
              {lang === "ru"
                ? "Нажмите кнопку и подпишите сообщение в кошельке для привязки."
                : "Press the button and sign a message in your wallet to bind it."}
            </p>
            <button
              onClick={handleBind}
              disabled={binding}
              className="btn btn-primary"
            >
              {binding
                ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "var(--bg)" }} />
                : (lang === "ru" ? "Привязать кошелёк" : "Bind wallet")}
            </button>
          </div>
        ) : (
          <div>
            <div className="row mb-12">
              <span className="badge is-completed">
                <span className="badge-dot" />
                {lang === "ru" ? "Не подключён" : "Not connected"}
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "0 0 12px" }}>
              {lang === "ru"
                ? "Подключите кошелёк MetaMask для инвестирования, голосования и создания проектов."
                : "Connect a MetaMask wallet to invest, vote and create projects."}
            </p>
            <button onClick={connect} className="btn btn-primary">
              {lang === "ru" ? "Подключить кошелёк" : "Connect wallet"}
            </button>
          </div>
        )}
      </div>

      {/* My projects */}
      {user.role === "author" && (
        <div className="card card-pad mb-16">
          <div className="section-h">
            <h2>{lang === "ru" ? "Мои проекты" : "My projects"}</h2>
            <Link to="/dashboard" className="kicker" style={{ color: "var(--accent)" }}>
              {lang === "ru" ? "Все →" : "All →"}
            </Link>
          </div>
          {loading ? (
            <div className="loading-spin" style={{ margin: "0 auto" }} />
          ) : projects.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              {lang === "ru" ? "Нет проектов" : "No projects"}
            </div>
          ) : (
            <div className="col gap-8">
              {projects.slice(0, 3).map((p) => (
                <Link
                  key={p.id}
                  to={`/project/${p.contract_address || p.id}`}
                  className="between"
                  style={{
                    padding: 12,
                    border: "1px solid var(--hair)",
                    borderRadius: "var(--radius)",
                    color: "var(--ink)"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.title}</div>
                    <div className="kicker">{p.goal_amount} ETH</div>
                  </div>
                  <span style={{ color: "var(--ink-4)" }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
      <div className="card card-pad mb-16">
        <div className="section-h">
          <h2>{lang === "ru" ? "Транзакции" : "Transactions"}</h2>
          <div className="meta">{transactions.length}</div>
        </div>
        {loading ? (
          <div className="loading-spin" style={{ margin: "0 auto" }} />
        ) : transactions.length === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            {lang === "ru" ? "История пуста" : "No history yet"}
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>{lang === "ru" ? "Тип" : "Type"}</th>
                <th>{lang === "ru" ? "Дата" : "Date"}</th>
                <th className="right">{t(UI.amount)}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((tx) => {
                const typeLabel =
                  tx.type === "investment" ? (lang === "ru" ? "Инвестиция" : "Investment") :
                  tx.type === "refund" ? (lang === "ru" ? "Возврат" : "Refund") :
                  tx.type === "milestone_payout" ? (lang === "ru" ? "Выплата" : "Payout") :
                  tx.type;
                const dir = tx.type === "investment" ? "out" : "in";
                return (
                  <tr key={tx.id}>
                    <td>
                      <span className="tx-pill">
                        <span className={`tx-arrow ${dir}`}>{dir === "in" ? "↓" : "↑"}</span>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: 11.5 }}>
                      {new Date(tx.created_at).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}
                    </td>
                    <td className="right mono">{tx.amount} ETH</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <button
        onClick={() => { logout(); navigate("/"); }}
        className="btn btn-ghost btn-block"
        style={{ borderColor: "var(--bad-soft)", color: "var(--bad)" }}
      >
        {lang === "ru" ? "Выйти из аккаунта" : "Sign out"}
      </button>
    </div>
  );
}
