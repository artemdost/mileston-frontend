import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useWeb3 } from "../context/Web3Context";
import { useAuth } from "../context/AuthContext";
import { useLang, UI } from "../context/LangContext";
import { getFactoryContract } from "../utils/contracts";

const STANDALONE = import.meta.env?.VITE_STANDALONE === "true";

function saveLocalProject(meta) {
  try {
    const key = "mileston.demo.projects";
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(meta);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

function emptyMilestone() {
  return { description: "", budget: "", duration: "" };
}

export default function CreateProject() {
  const navigate = useNavigate();
  const { signer, canTransact } = useWeb3();
  const { user } = useAuth();
  const { lang, t } = useLang();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [duration, setDuration] = useState("30");
  const [milestones, setMilestones] = useState([emptyMilestone()]);
  const [loading, setLoading] = useState(false);

  const updateMilestone = (i, field, val) => {
    setMilestones(prev => {
      const u = [...prev];
      u[i] = { ...u[i], [field]: val };
      return u;
    });
  };

  const addMilestone = () => setMilestones(prev => [...prev, emptyMilestone()]);
  const removeMilestone = (i) => {
    if (milestones.length <= 1) {
      toast.error(lang === "ru" ? "Нужен хотя бы один этап" : "Need at least one milestone");
      return;
    }
    setMilestones(prev => prev.filter((_, idx) => idx !== i));
  };

  const budgetSum = milestones.reduce((s, m) => s + (parseFloat(m.budget) || 0), 0);
  const goalNum = parseFloat(goal) || 0;
  const budgetMatch = goalNum > 0 && Math.abs(budgetSum - goalNum) < 0.0001;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(lang === "ru" ? "Введите название" : "Enter title"); return;
    }
    if (!description.trim()) {
      toast.error(lang === "ru" ? "Введите описание" : "Enter description"); return;
    }
    if (!goal || parseFloat(goal) <= 0) {
      toast.error(lang === "ru" ? "Укажите цель" : "Enter goal"); return;
    }
    if (!duration || parseInt(duration) <= 0) {
      toast.error(lang === "ru" ? "Укажите длительность" : "Enter duration"); return;
    }
    for (let i = 0; i < milestones.length; i++) {
      const ms = milestones[i];
      if (!ms.description.trim()) {
        toast.error(lang === "ru" ? `Описание этапа ${i + 1}` : `Milestone ${i + 1} description`); return;
      }
      if (!ms.budget || parseFloat(ms.budget) <= 0) {
        toast.error(lang === "ru" ? `Бюджет этапа ${i + 1}` : `Milestone ${i + 1} budget`); return;
      }
      if (!ms.duration || parseInt(ms.duration) <= 0) {
        toast.error(lang === "ru" ? `Длительность этапа ${i + 1}` : `Milestone ${i + 1} duration`); return;
      }
    }
    if (!budgetMatch) {
      toast.error(lang === "ru"
        ? `Сумма ${budgetSum.toFixed(3)} ETH ≠ цель ${goalNum.toFixed(3)} ETH`
        : `Sum ${budgetSum.toFixed(3)} ETH ≠ goal ${goalNum.toFixed(3)} ETH`);
      return;
    }
    if (!canTransact) {
      toast.error(lang === "ru" ? "Подключите кошелёк" : "Connect wallet"); return;
    }
    // FR-07: создание кампании автором требует пройденного KYC.
    if (user && !user.kyc_verified) {
      toast.error(lang === "ru" ? "Пройдите KYC перед созданием кампании" : "Complete KYC first");
      navigate("/kyc"); return;
    }

    setLoading(true);
    try {
      let projectData = null;
      if (!STANDALONE) {
        const apiPayload = {
          title: title.trim(),
          description: description.trim(),
          goal_amount: parseFloat(goal),
          duration_days: parseInt(duration),
          milestones: milestones.map(ms => ({
            description: ms.description.trim(),
            budget: parseFloat(ms.budget),
            duration_days: parseInt(ms.duration),
          })),
        };
        toast.loading(lang === "ru" ? "Сохранение…" : "Saving…", { id: "cp" });
        const res = await api.post("/projects", apiPayload);
        projectData = res.data.project || res.data;
      }

      toast.loading(lang === "ru" ? "Транзакция в блокчейне…" : "Sending tx…", { id: "cp" });
      const factory = await getFactoryContract(signer);
      const goalWei = ethers.parseEther(goal);
      const durationDays = parseInt(duration);
      const msDesc = milestones.map(ms => ms.description.trim());
      const msBudg = milestones.map(ms => ethers.parseEther(ms.budget));
      const msDur = milestones.map(ms => BigInt(parseInt(ms.duration)));
      const platformFee = 2;

      const tx = await factory.createCampaign(goalWei, durationDays, msDesc, msBudg, msDur, platformFee);
      toast.loading(lang === "ru" ? "Подтверждение…" : "Confirming…", { id: "cp" });
      const receipt = await tx.wait();

      let campaignAddress = null;
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
          if (parsed && parsed.name === "CampaignCreated") {
            campaignAddress = parsed.args.campaignAddress;
            break;
          }
        } catch {}
      }

      if (!STANDALONE && campaignAddress && projectData?._id) {
        try {
          await api.put(`/projects/${projectData._id}`, {
            contractAddress: campaignAddress, txHash: receipt.hash,
          });
        } catch {}
      }

      // В standalone-режиме сохраняем метаданные кампании локально, чтобы Home
      // мог показать её без backend (см. utils/demoStore — storage-only).
      if (STANDALONE && campaignAddress) {
        saveLocalProject({
          contract_address: campaignAddress,
          title: title.trim(),
          description: description.trim(),
          goal_amount: parseFloat(goal),
          duration_days: parseInt(duration),
          tx_hash: receipt.hash,
          created_at: new Date().toISOString(),
          author_email: user?.email || null,
          milestones: milestones.map(ms => ({
            description: ms.description.trim(),
            budget: parseFloat(ms.budget),
            duration_days: parseInt(ms.duration),
          })),
        });
      }

      toast.success(lang === "ru" ? "Проект создан" : "Project created", { id: "cp" });
      navigate(`/project/${campaignAddress || projectData?._id}`);
    } catch (err) {
      const reason = err.reason || err.response?.data?.message || err.message || "Error";
      toast.error(reason, { id: "cp" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-main narrow">
      <div className="mb-24">
        <div className="kicker mb-8">
          {lang === "ru" ? "Новая кампания" : "New campaign"}
        </div>
        <h1 style={{
          fontSize: 36, fontWeight: 500, margin: 0,
          fontFamily: "var(--font-serif)", letterSpacing: "-0.015em"
        }}>
          {lang === "ru" ? "Создать проект" : "Create project"}
        </h1>
      </div>

      <div className="steps mb-24">
        <div className={`step ${step === 1 ? "is-current" : step > 1 ? "is-done" : ""}`}>
          <span className="step-dot">1</span>
          {lang === "ru" ? "Описание" : "Description"}
        </div>
        <div className="step-divider" />
        <div className={`step ${step === 2 ? "is-current" : step > 2 ? "is-done" : ""}`}>
          <span className="step-dot">2</span>
          {lang === "ru" ? "Этапы" : "Milestones"}
        </div>
        <div className="step-divider" />
        <div className={`step ${step === 3 ? "is-current" : ""}`}>
          <span className="step-dot">3</span>
          {lang === "ru" ? "Подтверждение" : "Review"}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="card card-pad-lg">
            <div className="section-h">
              <h2>{lang === "ru" ? "Основная информация" : "Basic info"}</h2>
            </div>

            <div className="mb-16">
              <label className="label">{t(UI.title)}</label>
              <input
                className="input" type="text"
                value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={lang === "ru" ? "Например: «Электрический скейтборд»" : "e.g. Electric skateboard"}
                disabled={loading}
              />
            </div>

            <div className="mb-16">
              <label className="label">{t(UI.description)}</label>
              <textarea
                className="textarea"
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder={lang === "ru" ? "Расскажите о проекте…" : "Tell about the project…"}
                rows={5}
                disabled={loading}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="label">{lang === "ru" ? "Цель сбора (ETH)" : "Goal (ETH)"}</label>
                <input
                  className="input mono" type="number" step="0.001" min="0"
                  value={goal} onChange={(e) => setGoal(e.target.value)}
                  placeholder="1.0" disabled={loading}
                />
              </div>
              <div>
                <label className="label">{lang === "ru" ? "Дней на сбор" : "Funding days"}</label>
                <input
                  className="input mono" type="number" min="1"
                  value={duration} onChange={(e) => setDuration(e.target.value)}
                  placeholder="30" disabled={loading}
                />
              </div>
            </div>

            <div className="row mt-24" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (!title.trim() || !description.trim() || !goal || !duration) {
                    toast.error(lang === "ru" ? "Заполните все поля" : "Fill all fields");
                    return;
                  }
                  setStep(2);
                }}
              >
                {t(UI.next)} →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card card-pad-lg">
            <div className="section-h">
              <h2>{t(UI.milestones)}</h2>
              <div className="meta">
                {budgetSum.toFixed(3)} / {goalNum.toFixed(3)} ETH
                {budgetMatch ? " ✓" : ""}
              </div>
            </div>

            <div className="col gap-16">
              {milestones.map((ms, i) => (
                <div key={i} className="card card-pad" style={{ background: "var(--bg-2)" }}>
                  <div className="between mb-8">
                    <div className="kicker">
                      {lang === "ru" ? "Этап" : "Milestone"} #{i + 1}
                    </div>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeMilestone(i)}
                        disabled={loading}
                      >
                        {t(UI.delete)}
                      </button>
                    )}
                  </div>

                  <div className="mb-8">
                    <label className="label">{t(UI.description)}</label>
                    <input
                      className="input" type="text"
                      value={ms.description}
                      onChange={(e) => updateMilestone(i, "description", e.target.value)}
                      placeholder={lang === "ru" ? "Что будет сделано на этом этапе" : "What will be done in this milestone"}
                      disabled={loading}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label className="label">{lang === "ru" ? "Бюджет (ETH)" : "Budget (ETH)"}</label>
                      <input
                        className="input mono" type="number" step="0.001" min="0"
                        value={ms.budget}
                        onChange={(e) => updateMilestone(i, "budget", e.target.value)}
                        placeholder="0.5" disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="label">{lang === "ru" ? "Дней" : "Days"}</label>
                      <input
                        className="input mono" type="number" min="1"
                        value={ms.duration}
                        onChange={(e) => updateMilestone(i, "duration", e.target.value)}
                        placeholder="30" disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-soft mt-16"
              onClick={addMilestone}
              disabled={loading}
            >
              + {lang === "ru" ? "Добавить этап" : "Add milestone"}
            </button>

            <div className="row mt-24" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                ← {t(UI.back)}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(3)}
                disabled={loading || !budgetMatch}
              >
                {t(UI.next)} →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card card-pad-lg">
            <div className="section-h">
              <h2>{lang === "ru" ? "Проверьте и подтвердите" : "Review and submit"}</h2>
            </div>

            <dl className="dl mb-16">
              <dt>{t(UI.title)}</dt><dd>{title}</dd>
              <dt>{t(UI.goal)}</dt><dd>{goalNum.toFixed(3)} ETH</dd>
              <dt>{lang === "ru" ? "Срок сбора" : "Funding period"}</dt><dd>{duration} {lang === "ru" ? "дней" : "days"}</dd>
              <dt>{t(UI.milestones)}</dt><dd>{milestones.length}</dd>
              <dt>{lang === "ru" ? "Сумма этапов" : "Sum of milestones"}</dt>
              <dd style={{ color: budgetMatch ? "var(--good)" : "var(--bad)" }}>
                {budgetSum.toFixed(3)} ETH {budgetMatch ? "✓" : "✗"}
              </dd>
              <dt>{t(UI.fee)}</dt><dd>2%</dd>
            </dl>

            <div style={{
              padding: 14, background: "var(--accent-soft)",
              borderRadius: "var(--radius)", color: "var(--accent-ink)",
              fontSize: 12.5, marginBottom: 16
            }}>
              {lang === "ru"
                ? "При создании будет развёрнут смарт-контракт CrowdFund. Все условия зафиксированы on-chain и не могут быть изменены после публикации."
                : "Creating will deploy a CrowdFund smart contract. All terms are locked on-chain and cannot be changed after publication."}
            </div>

            <div className="row" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(2)}
                disabled={loading}
              >
                ← {t(UI.back)}
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading || !budgetMatch}
              >
                {loading
                  ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "var(--bg)" }} />
                  : (lang === "ru" ? "Создать кампанию" : "Create campaign")}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
