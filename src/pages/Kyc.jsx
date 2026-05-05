import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { demoSubmitKyc, demoApproveKyc, demoResetKyc } from "../utils/demoStore";
import toast from "react-hot-toast";

/**
 * KYC-заглушка для demo-режима. Имитирует двухшаговый флоу:
 *   submit → pending → verified
 * В production-сборке этот компонент замещается интеграцией с
 * сертифицированным KYC-провайдером (Сумсаб, IDX) — см. NFR-06, FR-07.
 */
export default function Kyc() {
  const { user, refreshUser, isStandalone } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [docType, setDocType] = useState("passport_rf");
  const [docNumber, setDocNumber] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  const status = user.kyc?.status || "none";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || docNumber.length < 4) {
      toast.error(lang === "ru" ? "Заполните все поля" : "Fill all fields");
      return;
    }
    setBusy(true);
    try {
      if (isStandalone) {
        demoSubmitKyc(user.email, {
          full_name: fullName.trim(),
          doc_type: docType,
          doc_number: docNumber,
        });
        // demo-провайдер: автоодобрение через 1.2 с
        await new Promise((r) => setTimeout(r, 1200));
        demoApproveKyc(user.email);
        await refreshUser();
        toast.success(lang === "ru" ? "Верификация пройдена (demo)" : "Verification approved (demo)");
        navigate("/profile");
      } else {
        toast.error(lang === "ru" ? "Backend KYC недоступен в этой сборке" : "Backend KYC unavailable");
      }
    } catch (err) {
      toast.error(err.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    if (!isStandalone) return;
    demoResetKyc(user.email);
    refreshUser();
    toast.success(lang === "ru" ? "KYC сброшен" : "KYC cleared");
  };

  return (
    <div className="app-main narrow">
      <div className="mb-24">
        <div className="kicker mb-8">{lang === "ru" ? "Верификация" : "Verification"}</div>
        <h1 style={{
          fontSize: 36, fontWeight: 500, margin: 0,
          fontFamily: "var(--font-serif)", letterSpacing: "-0.015em"
        }}>
          KYC
        </h1>
        <p className="muted" style={{ fontSize: 13, margin: "10px 0 0", maxWidth: 520 }}>
          {lang === "ru"
            ? "Прохождение KYC требуется для инвестирования и создания кампаний (FR-07). В demo-сборке используется заглушка; в production интегрируется сертифицированный KYC-провайдер (Сумсаб, IDX)."
            : "KYC is required for investing and creating campaigns (FR-07). This is a demo stub; production integrates a certified KYC provider (Sumsub, IDX)."}
        </p>
      </div>

      {status === "verified" ? (
        <div className="card card-pad-lg mb-16">
          <div className="kicker mb-8">{lang === "ru" ? "Статус" : "Status"}</div>
          <div className="row mb-12" style={{ gap: 8 }}>
            <span className="badge is-active">
              <span className="badge-dot" />
              {lang === "ru" ? "Верифицирован" : "Verified"}
            </span>
            <span className="kicker">demo</span>
          </div>
          <dl className="dl">
            <dt>{lang === "ru" ? "ФИО" : "Full name"}</dt>
            <dd>{user.kyc?.full_name || "—"}</dd>
            <dt>{lang === "ru" ? "Документ" : "Document"}</dt>
            <dd>{user.kyc?.doc_type} ····{user.kyc?.doc_last4 || "----"}</dd>
            <dt>{lang === "ru" ? "Дата проверки" : "Verified at"}</dt>
            <dd>{user.kyc?.verified_at ? new Date(user.kyc.verified_at).toLocaleString(lang === "ru" ? "ru-RU" : "en-US") : "—"}</dd>
          </dl>
          <div className="row mt-16" style={{ gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/profile")}>
              {lang === "ru" ? "← В профиль" : "← Back to profile"}
            </button>
            {isStandalone && (
              <button className="btn btn-ghost btn-sm" onClick={handleReset}
                style={{ borderColor: "var(--bad-soft)", color: "var(--bad)" }}>
                {lang === "ru" ? "Сбросить (demo)" : "Reset (demo)"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card card-pad-lg mb-16">
          <div className="kicker mb-8">{lang === "ru" ? "Шаг 1 — анкета" : "Step 1 — form"}</div>
          <div className="mb-16">
            <label className="label">{lang === "ru" ? "Фамилия Имя Отчество" : "Full name"}</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder={lang === "ru" ? "Иванов Иван Иванович" : "John Doe"} disabled={busy} autoFocus />
          </div>
          <div className="mb-16">
            <label className="label">{lang === "ru" ? "Тип документа" : "Document type"}</label>
            <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)} disabled={busy}>
              <option value="passport_rf">{lang === "ru" ? "Паспорт РФ" : "Passport RF"}</option>
              <option value="passport_intl">{lang === "ru" ? "Загранпаспорт" : "International passport"}</option>
              <option value="id_card">{lang === "ru" ? "ID-карта" : "ID card"}</option>
            </select>
          </div>
          <div className="mb-16">
            <label className="label">{lang === "ru" ? "Серия и номер документа" : "Document number"}</label>
            <input className="input" value={docNumber} onChange={(e) => setDocNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
              placeholder="1234567890" disabled={busy} inputMode="numeric" />
            <p className="muted" style={{ fontSize: 11.5, margin: "6px 0 0" }}>
              {lang === "ru"
                ? "В demo-сборке хранятся только последние 4 цифры. Реальные данные не передаются никуда."
                : "Demo only stores last 4 digits. No data leaves the browser."}
            </p>
          </div>

          <button type="submit" disabled={busy} className="btn btn-primary btn-lg btn-block">
            {busy
              ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "var(--bg)" }} />
              : (lang === "ru" ? "Отправить на верификацию" : "Submit for verification")}
          </button>
          {status === "pending" && (
            <p className="kicker" style={{ marginTop: 10, color: "var(--warn)" }}>
              {lang === "ru" ? "Заявка в обработке" : "Pending"}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
