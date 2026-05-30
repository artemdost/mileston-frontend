import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useWeb3 } from "../context/Web3Context";
import { useLang, STATE_LABELS, UI } from "../context/LangContext";
import { getCrowdFundContract } from "../utils/contracts";

const STATE_KEYS = ["funding", "active", "completed", "failed"];
const STANDALONE = import.meta.env?.VITE_STANDALONE === "true";

export default function Dashboard() {
  const { user } = useAuth();
  const { signer } = useWeb3();
  const { lang, t } = useLang();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalRaised: 0, totalPaidOut: 0 });
  const [reportProject, setReportProject] = useState(null);
  const [reportURI, setReportURI] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      let data = [];
      if (STANDALONE) {
        // standalone-сборка: backend нет, проекты автора - в localStorage (см. CreateProject)
        try {
          const raw = localStorage.getItem("mileston.demo.projects");
          const list = raw ? JSON.parse(raw) : [];
          data = Array.isArray(list)
            ? list.filter((p) => !p.author_email || p.author_email === user?.email)
            : [];
        } catch { data = []; }
      } else {
        const res = await api.get("/projects", { params: { author: "me" } });
        // защита от HTML-ответа (когда /api не проксируется на backend): берём только массив
        const raw = res.data?.projects ?? res.data;
        data = Array.isArray(raw) ? raw : [];
      }
      setProjects(data);

      let raised = 0;
      let paid = 0;
      for (const p of data) {
        try { raised += parseFloat(ethers.formatEther(p.totalRaised || "0")); } catch {}
        if (Array.isArray(p.milestones)) {
          for (const ms of p.milestones) {
            if (ms.status === 2) {
              try { paid += parseFloat(ethers.formatEther(ms.budget || "0")); } catch {}
            }
          }
        }
      }
      setStats({ totalRaised: raised, totalPaidOut: paid });
    } catch (err) {
      console.error("Failed to fetch:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [lang, user]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleSubmitReport = async (project) => {
    if (!signer || !project.contractAddress) {
      toast.error(lang === "ru" ? "Подключите кошелёк" : "Connect wallet");
      return;
    }
    if (!reportURI.trim()) {
      toast.error(lang === "ru" ? "Введите ссылку" : "Enter URL");
      return;
    }
    setSubmitting(true);
    try {
      const contract = getCrowdFundContract(project.contractAddress, signer);
      const currentMs = await contract.currentMilestone();
      const tx = await contract.submitMilestone(currentMs, reportURI.trim());
      toast.loading(lang === "ru" ? "Отправка…" : "Submitting…", { id: "sr" });
      await tx.wait();
      toast.success(
        lang === "ru" ? "Отчёт отправлен. Голосование началось." : "Report submitted. Voting started.",
        { id: "sr" }
      );
      setReportProject(null);
      setReportURI("");
      await fetchProjects();
    } catch (err) {
      toast.error(err.reason || err.message || "Error", { id: "sr" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-main">
        <div className="empty">
          <span className="loading-spin" />
          <div style={{ marginTop: 12 }}>{t(UI.loading)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-main">
      <div className="mb-24">
        <div className="kicker mb-8">
          {user?.email}
        </div>
        <h1 style={{
          fontSize: 36, fontWeight: 500, margin: 0,
          fontFamily: "var(--font-serif)", letterSpacing: "-0.015em"
        }}>
          {lang === "ru" ? "Кабинет автора" : "Founder dashboard"}
        </h1>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 16, marginBottom: 32
      }}>
        <div className="card card-pad-lg">
          <div className="stat-label">{lang === "ru" ? "Всего проектов" : "Total projects"}</div>
          <div className="stat-num stat-num-lg" style={{ marginTop: 8 }}>{projects.length}</div>
        </div>
        <div className="card card-pad-lg">
          <div className="stat-label">{lang === "ru" ? "Всего собрано" : "Total raised"}</div>
          <div className="stat-num stat-num-lg" style={{ marginTop: 8, color: "var(--accent)" }}>
            {stats.totalRaised.toFixed(2)}<span style={{ fontSize: 20, color: "var(--ink-4)" }}> ETH</span>
          </div>
        </div>
        <div className="card card-pad-lg">
          <div className="stat-label">{lang === "ru" ? "Выплачено" : "Paid out"}</div>
          <div className="stat-num stat-num-lg" style={{ marginTop: 8, color: "var(--good)" }}>
            {stats.totalPaidOut.toFixed(2)}<span style={{ fontSize: 20, color: "var(--ink-4)" }}> ETH</span>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="section-h">
        <h2>{lang === "ru" ? "Мои проекты" : "My projects"}</h2>
        <Link to="/create" className="btn btn-primary btn-sm">
          + {lang === "ru" ? "Новый проект" : "New project"}
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          <div className="empty-mark">EMPTY</div>
          <div>{lang === "ru" ? "У вас пока нет проектов" : "You have no projects yet"}</div>
          <Link to="/create" className="btn btn-primary mt-16">
            {lang === "ru" ? "Создать первый" : "Create first"}
          </Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{t(UI.title)}</th>
                <th>{t(UI.status)}</th>
                <th className="right">{t(UI.raised)}</th>
                <th className="right">{t(UI.goal)}</th>
                <th className="right">{lang === "ru" ? "Действия" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const goal = parseFloat(ethers.formatEther(project.goalAmount || "0"));
                const raised = parseFloat(ethers.formatEther(project.totalRaised || "0"));
                const pct = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
                const stateKey = STATE_KEYS[project.state] || "funding";
                const isActive = project.state === 1;

                return (
                  <tr key={project._id || project.contractAddress}>
                    <td>
                      <Link to={`/project/${project.contractAddress || project._id}`} style={{
                        fontWeight: 500, color: "var(--ink)"
                      }}>
                        {project.title}
                      </Link>
                      <div className="progress mt-8" style={{ width: 200 }}>
                        <span style={{ width: `${pct}%`, background: "var(--accent)" }} />
                      </div>
                    </td>
                    <td>
                      <span className={`badge is-${stateKey}`}>
                        <span className="badge-dot" />
                        {STATE_LABELS[stateKey][lang]}
                      </span>
                    </td>
                    <td className="right mono">{raised.toFixed(3)} ETH</td>
                    <td className="right mono">{goal.toFixed(3)} ETH</td>
                    <td className="right">
                      {isActive && (
                        <button
                          onClick={() => { setReportProject(project); setReportURI(""); }}
                          className="btn btn-soft btn-sm"
                        >
                          {lang === "ru" ? "Отчёт" : "Report"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Report modal */}
      {reportProject && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(14, 14, 12, 0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16
        }}
          onClick={() => !submitting && setReportProject(null)}
        >
          <div
            className="card card-pad-lg"
            style={{ maxWidth: 480, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kicker mb-8">{lang === "ru" ? "Отчёт по этапу" : "Milestone report"}</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>
              {reportProject.title}
            </h3>
            <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 16px" }}>
              {lang === "ru"
                ? "Отправка отчёта запустит голосование инвесторов на 7 дней."
                : "Submitting the report starts a 7-day voting period."}
            </p>

            <label className="label">{lang === "ru" ? "Ссылка на отчёт (URI)" : "Report URL (URI)"}</label>
            <input
              className="input"
              type="url"
              value={reportURI}
              onChange={(e) => setReportURI(e.target.value)}
              placeholder="https://…"
              disabled={submitting}
            />

            <div className="row mt-24" style={{ justifyContent: "flex-end" }}>
              <button
                onClick={() => setReportProject(null)}
                className="btn btn-ghost"
                disabled={submitting}
              >
                {t(UI.cancel)}
              </button>
              <button
                onClick={() => handleSubmitReport(reportProject)}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting
                  ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "var(--bg)" }} />
                  : t(UI.submit)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
