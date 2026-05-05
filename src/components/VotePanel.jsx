import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";
import { useLang, UI } from "../context/LangContext";
import { getCrowdFundContract } from "../utils/contracts";

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

export default function VotePanel({ contractAddress, milestoneIndex, milestone, onVoted }) {
  const { signer, account } = useWeb3();
  const { lang, t } = useLang();
  const [voting, setVoting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (!milestone) return;
    const votingEnd = Number(milestone.votingEnd);
    const now = Math.floor(Date.now() / 1000);
    setTimeLeft(Math.max(votingEnd - now, 0));

    if (signer && contractAddress && account) {
      const contract = getCrowdFundContract(contractAddress, signer);
      contract.hasVoted(milestoneIndex, account)
        .then((voted) => setHasVoted(voted))
        .catch(() => {});
    }
  }, [milestone, signer, contractAddress, milestoneIndex, account]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const votesFor = parseFloat(ethers.formatEther(milestone?.votesFor || "0"));
  const votesAgainst = parseFloat(ethers.formatEther(milestone?.votesAgainst || "0"));
  const totalVotes = votesFor + votesAgainst;
  const forPct = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 50;

  const handleVote = async (approve) => {
    if (!signer) {
      toast.error(lang === "ru" ? "Подключите кошелёк" : "Connect wallet");
      return;
    }
    setVoting(true);
    try {
      const contract = getCrowdFundContract(contractAddress, signer);
      const tx = await contract.vote(milestoneIndex, approve);
      toast.loading(lang === "ru" ? "Отправлено…" : "Submitted…", { id: "vote-tx" });
      await tx.wait();
      toast.success(
        approve
          ? (lang === "ru" ? "Голос «За» учтён" : "Vote «For» recorded")
          : (lang === "ru" ? "Голос «Против» учтён" : "Vote «Against» recorded"),
        { id: "vote-tx" }
      );
      setHasVoted(true);
      if (onVoted) onVoted();
    } catch (err) {
      const reason = err.reason || err.message || (lang === "ru" ? "Ошибка" : "Error");
      toast.error(reason, { id: "vote-tx" });
    } finally {
      setVoting(false);
    }
  };

  const handleFinishVoting = async () => {
    if (!signer) {
      toast.error(lang === "ru" ? "Подключите кошелёк" : "Connect wallet");
      return;
    }
    setFinishing(true);
    try {
      const contract = getCrowdFundContract(contractAddress, signer);
      const tx = await contract.finishVoting(milestoneIndex);
      toast.loading(lang === "ru" ? "Завершение…" : "Finalizing…", { id: "finish-tx" });
      await tx.wait();
      toast.success(lang === "ru" ? "Голосование завершено" : "Voting finalized", { id: "finish-tx" });
      if (onVoted) onVoted();
    } catch (err) {
      const reason = err.reason || err.message || (lang === "ru" ? "Ошибка" : "Error");
      toast.error(reason, { id: "finish-tx" });
    } finally {
      setFinishing(false);
    }
  };

  if (!milestone || milestone.status !== 1) return null;

  return (
    <div className="card card-pad-lg" style={{ borderColor: "var(--warn)" }}>
      <div className="between mb-16">
        <div>
          <div className="kicker" style={{ color: "var(--warn)" }}>
            {lang === "ru" ? "Голосование" : "Voting"}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 0" }}>
            {lang === "ru" ? "Этап" : "Milestone"} #{milestoneIndex + 1}
          </h3>
        </div>
        <div className="right">
          <div className="kicker">{lang === "ru" ? "Осталось" : "Time left"}</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 500 }}>
            {formatTimeLeft(timeLeft, lang)}
          </div>
        </div>
      </div>

      <div style={{
        background: "var(--bg-2)", padding: 14,
        borderRadius: "var(--radius)",
        marginBottom: 16
      }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>{milestone.description}</div>
        <div className="kicker">
          {lang === "ru" ? "Бюджет" : "Budget"}: {parseFloat(ethers.formatEther(milestone.budget || "0")).toFixed(3)} ETH
        </div>
        {milestone.reportURI && (
          <a
            href={milestone.reportURI}
            target="_blank"
            rel="noopener noreferrer"
            className="kicker"
            style={{ color: "var(--accent)", display: "inline-block", marginTop: 8 }}
          >
            {lang === "ru" ? "Открыть отчёт автора →" : "View report →"}
          </a>
        )}
      </div>

      <div className="vote-bar mb-8">
        <div className="vote-bar-for" style={{ width: `${forPct}%` }}>
          ✓ {votesFor.toFixed(2)} ETH
        </div>
        <div className="vote-bar-against">
          × {votesAgainst.toFixed(2)} ETH
        </div>
      </div>
      <div className="between" style={{
        fontFamily: "var(--font-mono)", fontSize: 11,
        color: "var(--ink-4)", marginBottom: 18
      }}>
        <span>{lang === "ru" ? "За" : "For"}: {forPct.toFixed(0)}%</span>
        <span>{lang === "ru" ? "Кворум" : "Quorum"}: 10%</span>
        <span>{lang === "ru" ? "Против" : "Against"}: {(100 - forPct).toFixed(0)}%</span>
      </div>

      {timeLeft > 0 ? (
        hasVoted ? (
          <div style={{
            textAlign: "center", padding: 12,
            background: "var(--accent-soft)",
            borderRadius: "var(--radius)",
            color: "var(--accent-ink)",
            fontSize: 13, fontWeight: 500
          }}>
            {lang === "ru" ? "Вы уже проголосовали" : "You already voted"}
          </div>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <button
              onClick={() => handleVote(true)}
              disabled={voting}
              className="btn btn-good btn-lg"
              style={{ flex: 1 }}
            >
              {voting
                ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2 }} />
                : t(UI.vote_for)}
            </button>
            <button
              onClick={() => handleVote(false)}
              disabled={voting}
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
          onClick={handleFinishVoting}
          disabled={finishing}
          className="btn btn-primary btn-lg btn-block"
        >
          {finishing
            ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "var(--bg)" }} />
            : (lang === "ru" ? "Завершить голосование" : "Finalize voting")}
        </button>
      )}
    </div>
  );
}
