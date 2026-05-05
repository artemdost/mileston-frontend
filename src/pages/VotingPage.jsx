import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";
import { useLang, UI } from "../context/LangContext";
import { getCrowdFundContract } from "../utils/contracts";
import api from "../utils/api";

function formatTimeLeft(seconds, lang) {
  if (seconds <= 0) return lang === "ru" ? "Завершено" : "Ended";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}${lang === "ru" ? "д" : "d"}`);
  if (h > 0) parts.push(`${h}${lang === "ru" ? "ч" : "h"}`);
  if (m > 0 && d === 0) parts.push(`${m}${lang === "ru" ? "м" : "m"}`);
  if (parts.length === 0) parts.push(`${s}${lang === "ru" ? "с" : "s"}`);
  return parts.join(" ");
}

export default function VotingPage() {
  const { projectId, milestoneIndex } = useParams();
  const { signer, account, provider, canTransact } = useWeb3();
  const { lang, t } = useLang();

  const [project, setProject] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const msIndex = parseInt(milestoneIndex) || 0;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}`).catch(() => ({ data: { project: null }}));
      const proj = res.data.project || res.data;
      setProject(proj);

      const contractAddr = proj?.contractAddress || projectId;
      if (!contractAddr || !provider) {
        setLoading(false);
        return;
      }

      const contract = getCrowdFundContract(contractAddr, provider);
      const ms = await contract.getMilestone(msIndex);
      const msData = {
        description: ms.description,
        budget: ms.budget.toString(),
        milestoneDeadline: ms.milestoneDeadline.toString(),
        status: Number(ms.status),
        votesFor: ms.votesFor.toString(),
        votesAgainst: ms.votesAgainst.toString(),
        votingEnd: ms.votingEnd.toString(),
        attempts: Number(ms.attempts),
        reportURI: ms.reportURI,
      };
      setMilestone(msData);

      const votingEnd = Number(ms.votingEnd);
      const now = Math.floor(Date.now() / 1000);
      setTimeLeft(Math.max(votingEnd - now, 0));

      if (account) {
        const voted = await contract.hasVoted(msIndex, account);
        setHasVoted(voted);
      }
    } catch (err) {
      console.error("Failed to fetch voting data:", err);
      toast.error(lang === "ru" ? "Не удалось загрузить" : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [projectId, msIndex, provider, account, lang]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft(p => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const contractAddr = project?.contractAddress || projectId;

  const handleVote = async (approve) => {
    if (!canTransact || !contractAddr) {
      toast.error(lang === "ru" ? "Подключите кошелёк" : "Connect wallet");
      return;
    }
    setVoting(true);
    try {
      const contract = getCrowdFundContract(contractAddr, signer);
      const tx = await contract.vote(msIndex, approve);
      toast.loading(lang === "ru" ? "Отправлено…" : "Submitted…", { id: "v" });
      await tx.wait();
      toast.success(approve
        ? (lang === "ru" ? "Голос «За» учтён" : "Vote «For»")
        : (lang === "ru" ? "Голос «Против» учтён" : "Vote «Against»"),
        { id: "v" });
      setHasVoted(true);
      await fetchData();
    } catch (err) {
      toast.error(err.reason || err.message || "Error", { id: "v" });
    } finally {
      setVoting(false);
    }
  };

  const handleFinish = async () => {
    if (!canTransact || !contractAddr) return;
    setFinishing(true);
    try {
      const contract = getCrowdFundContract(contractAddr, signer);
      const tx = await contract.finishVoting(msIndex);
      toast.loading(lang === "ru" ? "Завершение…" : "Finalizing…", { id: "f" });
      await tx.wait();
      toast.success(lang === "ru" ? "Готово" : "Done", { id: "f" });
      await fetchData();
    } catch (err) {
      toast.error(err.reason || err.message || "Error", { id: "f" });
    } finally {
      setFinishing(false);
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

  if (!milestone) {
    return (
      <div className="app-main">
        <div className="empty" style={{ borderColor: "var(--bad)" }}>
          <div className="empty-mark" style={{ color: "var(--bad)" }}>404</div>
          <div>{lang === "ru" ? "Голосование не найдено" : "Voting not found"}</div>
        </div>
      </div>
    );
  }

  const votesFor = parseFloat(ethers.formatEther(milestone.votesFor));
  const votesAgainst = parseFloat(ethers.formatEther(milestone.votesAgainst));
  const totalVotes = votesFor + votesAgainst;
  const forPct = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 50;
  const budget = parseFloat(ethers.formatEther(milestone.budget));
  const isActive = milestone.status === 1;

  return (
    <div className="app-main narrow">
      <div className="mb-24">
        <Link to={`/project/${contractAddr}`} className="kicker">
          ← {lang === "ru" ? "К проекту" : "Back to project"}
        </Link>
      </div>

      <div className="card card-pad-lg mb-24">
        <div className="kicker mb-8">
          {project?.title || (lang === "ru" ? "Кампания" : "Campaign")}
        </div>
        <h1 style={{
          fontSize: 32, fontWeight: 500, margin: "0 0 12px",
          fontFamily: "var(--font-serif)", letterSpacing: "-0.015em"
        }}>
          {lang === "ru" ? "Голосование" : "Voting"} <em style={{ color: "var(--accent)", fontStyle: "italic" }}>· этап {msIndex + 1}</em>
        </h1>
        <p style={{ color: "var(--ink-3)", fontSize: 14.5, margin: 0 }}>
          {milestone.description}
        </p>
      </div>

      <div className="card card-pad-lg mb-16">
        <div className="section-h">
          <h2>{lang === "ru" ? "Результаты" : "Results"}</h2>
          <div className="meta">{lang === "ru" ? "По весу токенов" : "By token weight"}</div>
        </div>

        <div className="vote-bar mb-8" style={{ height: 48 }}>
          <div className="vote-bar-for" style={{ width: `${forPct}%` }}>
            ✓ {forPct.toFixed(1)}%
          </div>
          <div className="vote-bar-against">
            × {(100 - forPct).toFixed(1)}%
          </div>
        </div>

        <dl className="dl mb-16">
          <dt>{lang === "ru" ? "За" : "For"}</dt>
          <dd>{votesFor.toFixed(3)} ETH</dd>
          <dt>{lang === "ru" ? "Против" : "Against"}</dt>
          <dd>{votesAgainst.toFixed(3)} ETH</dd>
          <dt>{lang === "ru" ? "Всего" : "Total"}</dt>
          <dd>{totalVotes.toFixed(3)} ETH</dd>
          <dt>{lang === "ru" ? "Бюджет этапа" : "Milestone budget"}</dt>
          <dd>{budget.toFixed(3)} ETH</dd>
          <dt>{lang === "ru" ? "Попытка" : "Attempt"}</dt>
          <dd>{milestone.attempts + 1} / 2</dd>
          <dt>{lang === "ru" ? "Осталось" : "Time left"}</dt>
          <dd>{formatTimeLeft(timeLeft, lang)}</dd>
        </dl>

        {milestone.reportURI && (
          <a
            href={milestone.reportURI}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm mb-16"
            style={{ width: "100%" }}
          >
            {lang === "ru" ? "Открыть отчёт автора" : "Open author's report"}
          </a>
        )}

        {!isActive ? (
          <div className="empty" style={{ padding: 16 }}>
            {lang === "ru" ? "Голосование не активно" : "Voting not active"}
          </div>
        ) : timeLeft > 0 ? (
          hasVoted ? (
            <div style={{
              textAlign: "center", padding: 14,
              background: "var(--accent-soft)",
              borderRadius: "var(--radius)",
              color: "var(--accent-ink)",
              fontWeight: 500
            }}>
              {lang === "ru" ? "Вы уже проголосовали" : "You already voted"}
            </div>
          ) : (
            <div className="row" style={{ gap: 8 }}>
              <button
                onClick={() => handleVote(true)}
                disabled={voting || !account}
                className="btn btn-good btn-lg"
                style={{ flex: 1 }}
              >
                {voting
                  ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  : t(UI.vote_for)}
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voting || !account}
                className="btn btn-bad btn-lg"
                style={{ flex: 1 }}
              >
                {voting
                  ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  : t(UI.vote_against)}
              </button>
            </div>
          )
        ) : (
          <button
            onClick={handleFinish}
            disabled={finishing || !account}
            className="btn btn-primary btn-lg btn-block"
          >
            {finishing
              ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "var(--bg)" }} />
              : (lang === "ru" ? "Завершить голосование" : "Finalize voting")}
          </button>
        )}
      </div>
    </div>
  );
}
