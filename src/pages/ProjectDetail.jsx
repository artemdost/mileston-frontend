import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";
import { useLang, STATE_LABELS, UI } from "../context/LangContext";
import { getCrowdFundContract } from "../utils/contracts";
import api from "../utils/api";
import MilestoneList from "../components/MilestoneList";
import VotePanel from "../components/VotePanel";
import InvestForm from "../components/InvestForm";

const STATE_KEYS = ["funding", "active", "completed", "failed"];

function formatDate(timestamp, lang) {
  if (!timestamp) return "—";
  const d = new Date(Number(timestamp) * 1000);
  return d.toLocaleString(lang === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function shortAddr(a) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { signer, account, provider, canTransact } = useWeb3();
  const { lang, t } = useLang();

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refunding, setRefunding] = useState(false);
  const [tab, setTab] = useState("about");

  const fetchData = useCallback(async () => {
    if (!provider || !id) return;
    setLoading(true);
    try {
      const contract = getCrowdFundContract(id, provider);
      const info = await contract.getInfo();

      const onChain = {
        author: info._author,
        goalAmount: info._goalAmount.toString(),
        totalRaised: info._totalRaised.toString(),
        deadline: info._deadline.toString(),
        state: Number(info._state),
        currentMilestone: Number(info._currentMilestone),
        milestoneCount: Number(info._milestoneCount),
        platformFeePercent: Number(info._platformFeePercent),
      };
      setChainData(onChain);

      let dbProject = null;
      try {
        const res = await api.get("/projects");
        dbProject = (res.data || []).find(
          (p) => (p.contract_address || "").toLowerCase() === id.toLowerCase()
        );
      } catch {
        // Standalone: читаем из статического /projects.json
        try {
          const r = await fetch("/projects.json");
          if (r.ok) {
            const arr = await r.json();
            dbProject = arr.find(
              (p) => ((p.contract_address || p.contractAddress) || "").toLowerCase() === id.toLowerCase()
            );
          }
        } catch {}
      }
      setProject({
        contractAddress: id,
        title: dbProject?.title || `Campaign ${id.slice(0, 10)}…`,
        description: dbProject?.description || "",
      });

      const msCount = Number(info._milestoneCount);
      const msArr = [];
      for (let i = 0; i < msCount; i++) {
        const ms = await contract.getMilestone(i);
        msArr.push({
          description: ms.description,
          budget: ms.budget.toString(),
          milestoneDeadline: ms.milestoneDeadline.toString(),
          status: Number(ms.status),
          votesFor: ms.votesFor.toString(),
          votesAgainst: ms.votesAgainst.toString(),
          votingEnd: ms.votingEnd.toString(),
          attempts: Number(ms.attempts),
          reportURI: ms.reportURI,
        });
      }
      setMilestones(msArr);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch chain data:", err);
      setError(lang === "ru" ? "Не удалось загрузить проект" : "Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [provider, id, lang]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefund = async () => {
    if (!canTransact || !project?.contractAddress) {
      toast.error(lang === "ru" ? "Подключите кошелёк" : "Connect wallet");
      return;
    }
    setRefunding(true);
    try {
      const contract = getCrowdFundContract(project.contractAddress, signer);
      const tx = await contract.requestRefund();
      toast.loading(lang === "ru" ? "Запрос возврата…" : "Refunding…", { id: "refund-tx" });
      await tx.wait();
      toast.success(lang === "ru" ? "Средства возвращены" : "Refunded", { id: "refund-tx" });
      await fetchData();
    } catch (err) {
      const reason = err.reason || err.message || (lang === "ru" ? "Ошибка возврата" : "Refund failed");
      toast.error(reason, { id: "refund-tx" });
    } finally {
      setRefunding(false);
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

  if (error || !project) {
    return (
      <div className="app-main">
        <div className="empty" style={{ borderColor: "var(--bad)" }}>
          <div className="empty-mark" style={{ color: "var(--bad)" }}>Error</div>
          <div>{error || (lang === "ru" ? "Проект не найден" : "Project not found")}</div>
        </div>
      </div>
    );
  }

  const effectiveState = chainData?.state ?? 0;
  const effectiveGoal = chainData?.goalAmount || "0";
  const effectiveRaised = chainData?.totalRaised || "0";
  const effectiveDeadline = chainData?.deadline || "0";
  const effectiveCurrentMs = chainData?.currentMilestone ?? 0;
  const stateKey = STATE_KEYS[effectiveState];

  const goal = parseFloat(ethers.formatEther(effectiveGoal));
  const raised = parseFloat(ethers.formatEther(effectiveRaised));
  const pct = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;

  const isFundingExpired =
    effectiveState === 0 &&
    Number(effectiveDeadline) > 0 &&
    Date.now() / 1000 > Number(effectiveDeadline) &&
    raised < goal;
  const isMilestoneRejected =
    effectiveState === 1 &&
    milestones[effectiveCurrentMs]?.status === 3;
  const canRefund = isFundingExpired || isMilestoneRejected;

  const currentMilestoneData = milestones[effectiveCurrentMs];
  const isVoting = currentMilestoneData?.status === 1;

  const cardHue = (parseInt(id.slice(2, 8), 16) % 360);

  return (
    <div className="app-main">
      <div style={{ marginBottom: 24 }}>
        <Link to="/" className="kicker" style={{ textDecoration: "none" }}>
          ← {t(UI.back)}
        </Link>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 320px",
        gap: 32
      }}>
        {/* Main column */}
        <div>
          {/* Header */}
          <div className="card card-pad-lg mb-24" style={{ position: "relative" }}>
            <div className="kicker mb-8">
              {lang === "ru" ? "Кампания" : "Campaign"} · {shortAddr(id)}
            </div>
            <h1 style={{
              fontSize: 36, fontWeight: 500, margin: "0 0 12px",
              letterSpacing: "-0.015em", lineHeight: 1.15,
              fontFamily: "var(--font-serif)",
            }}>
              {project.title}
            </h1>
            <div className="row mb-16" style={{ gap: 8 }}>
              <span className={`badge is-${stateKey}`}>
                <span className="badge-dot" />
                {STATE_LABELS[stateKey][lang]}
              </span>
              <span className="token-chip">
                <span className="token-chip-mark" />
                ERC-1155 · utility
              </span>
            </div>

            <p style={{
              color: "var(--ink-3)", fontSize: 14.5, lineHeight: 1.6,
              margin: 0, whiteSpace: "pre-line"
            }}>
              {project.description || (lang === "ru" ? "Описание отсутствует" : "No description")}
            </p>

            <div style={{
              position: "absolute", top: 24, right: 24,
              width: 70, height: 70, borderRadius: "50%",
              border: `1px solid var(--hair-2)`,
              display: "grid", placeItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 9, color: "var(--ink-4)",
              textAlign: "center", lineHeight: 1.2,
              letterSpacing: "0.04em",
              background: "var(--paper)",
              textTransform: "uppercase",
            }}>
              ON-CHAIN<br/>VERIFIED
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button className={tab === "about" ? "is-active" : ""} onClick={() => setTab("about")}>
              {lang === "ru" ? "О проекте" : "About"}
            </button>
            <button className={tab === "milestones" ? "is-active" : ""} onClick={() => setTab("milestones")}>
              {t(UI.milestones)} ({milestones.length})
            </button>
            {isVoting && (
              <button className={tab === "voting" ? "is-active" : ""} onClick={() => setTab("voting")}>
                {STATE_LABELS.voting[lang]}
              </button>
            )}
          </div>

          {tab === "about" && (
            <div className="card card-pad mb-24">
              <div className="section-h">
                <h2>{lang === "ru" ? "Прогресс сбора" : "Funding progress"}</h2>
                <div className="meta">{pct.toFixed(0)} %</div>
              </div>
              <div className="progress is-thick is-accent">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="between" style={{
                marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 13
              }}>
                <div>
                  <div className="kicker">{t(UI.raised)}</div>
                  <div style={{ fontSize: 18, color: "var(--ink)" }}>
                    <strong>{raised.toFixed(3)}</strong>
                    <span style={{ color: "var(--ink-4)", fontSize: 13 }}> ETH</span>
                  </div>
                </div>
                <div className="right">
                  <div className="kicker">{t(UI.goal)}</div>
                  <div style={{ fontSize: 18, color: "var(--ink)" }}>
                    {goal.toFixed(3)}
                    <span style={{ color: "var(--ink-4)", fontSize: 13 }}> ETH</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "milestones" && (
            <div className="card card-pad mb-24">
              <MilestoneList
                milestones={milestones}
                currentMilestone={effectiveCurrentMs}
              />
            </div>
          )}

          {tab === "voting" && isVoting && (
            <VotePanel
              contractAddress={project.contractAddress}
              milestoneIndex={effectiveCurrentMs}
              milestone={currentMilestoneData}
              onVoted={fetchData}
            />
          )}
        </div>

        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 80, alignSelf: "start" }}>
          {effectiveState === 0 && (
            <div className="mb-16">
              <InvestForm
                contractAddress={project.contractAddress}
                goalAmount={effectiveGoal}
                totalRaised={effectiveRaised}
                onInvested={fetchData}
              />
            </div>
          )}

          {canRefund && (
            <div className="card card-pad mb-16" style={{ borderColor: "var(--bad-soft)" }}>
              <div className="kicker" style={{ color: "var(--bad)", marginBottom: 8 }}>
                {lang === "ru" ? "Возврат" : "Refund"}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>
                {lang === "ru" ? "Возврат средств" : "Request refund"}
              </h3>
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "0 0 12px", lineHeight: 1.5 }}>
                {isFundingExpired
                  ? (lang === "ru" ? "Кампания не достигла цели. Вы можете вернуть свои средства." : "Campaign did not reach its goal. You can claim your refund.")
                  : (lang === "ru" ? "Этап был отклонён. Вы можете запросить возврат остатков." : "Milestone was rejected. You can claim remaining funds.")}
              </p>
              <button
                onClick={handleRefund}
                disabled={refunding || !account}
                className="btn btn-bad btn-block btn-sm"
              >
                {refunding
                  ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  : (lang === "ru" ? "Запросить возврат" : "Request refund")}
              </button>
            </div>
          )}

          <div className="card card-pad-lg">
            <div className="kicker mb-16">
              {lang === "ru" ? "Свойства" : "Properties"}
            </div>
            <dl className="dl">
              <dt>{t(UI.status)}</dt>
              <dd>
                <span className={`badge is-${stateKey}`} style={{ fontSize: 10 }}>
                  <span className="badge-dot" />
                  {STATE_LABELS[stateKey][lang]}
                </span>
              </dd>
              <dt>{t(UI.goal)}</dt>
              <dd>{goal.toFixed(3)} ETH</dd>
              <dt>{t(UI.raised)}</dt>
              <dd>{raised.toFixed(3)} ETH</dd>
              <dt>{t(UI.milestones)}</dt>
              <dd>{effectiveCurrentMs} / {milestones.length}</dd>
              <dt>{t(UI.fee)}</dt>
              <dd>{chainData?.platformFeePercent ?? "—"} %</dd>
              <dt>{t(UI.deadline)}</dt>
              <dd style={{ fontSize: 11 }}>{formatDate(effectiveDeadline, lang)}</dd>
              <dt>{t(UI.author)}</dt>
              <dd>{shortAddr(chainData?.author)}</dd>
              <dt>{t(UI.contract)}</dt>
              <dd>{shortAddr(project.contractAddress)}</dd>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
