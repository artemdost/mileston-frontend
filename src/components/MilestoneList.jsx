import React from "react";
import { ethers } from "ethers";
import { useLang, UI } from "../context/LangContext";

const MS_STATUS_LABELS = {
  0: { ru: "Ожидание", en: "Pending" },
  1: { ru: "Голосование", en: "Voting" },
  2: { ru: "Одобрен", en: "Approved" },
  3: { ru: "Отклонён", en: "Rejected" },
};

export default function MilestoneList({ milestones, currentMilestone }) {
  const { lang, t } = useLang();

  if (!milestones || milestones.length === 0) {
    return (
      <div className="empty">
        <div className="empty-mark">{lang === "ru" ? "Нет этапов" : "No milestones"}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-h">
        <h2>{t(UI.milestones)}</h2>
        <div className="meta">{milestones.length} total</div>
      </div>

      <div className="ms-track">
        {milestones.map((ms, index) => {
          const budget = parseFloat(ethers.formatEther(ms.budget || "0"));
          const isCurrent = index === Number(currentMilestone);
          const isVoting = ms.status === 1;
          const isApproved = ms.status === 2;
          const isRejected = ms.status === 3;

          const votesFor = parseFloat(ethers.formatEther(ms.votesFor || "0"));
          const votesAgainst = parseFloat(ethers.formatEther(ms.votesAgainst || "0"));
          const totalVotes = votesFor + votesAgainst;
          const forPct = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;

          let bulletCls = "ms-bullet";
          if (isApproved) bulletCls += " is-done";
          else if (isRejected) bulletCls += " is-failed";
          else if (isCurrent) bulletCls += " is-current";

          return (
            <div className="ms-row" key={index}>
              <div className={bulletCls}>
                {isApproved ? "✓" : isRejected ? "×" : (index + 1).toString().padStart(2, "0")}
              </div>
              <div>
                <div className="ms-title">{ms.description}</div>
                {ms.reportURI && (
                  <a
                    href={ms.reportURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kicker"
                    style={{ color: "var(--accent)" }}
                  >
                    {lang === "ru" ? "Открыть отчёт →" : "View report →"}
                  </a>
                )}
                <div className="ms-desc" style={{ marginTop: 6 }}>
                  <span className="kicker" style={{ marginRight: 8 }}>
                    {MS_STATUS_LABELS[ms.status][lang]}
                  </span>
                  {ms.attempts > 0 && (
                    <span className="kicker" style={{ color: "var(--warn)" }}>
                      {lang === "ru" ? "попытка" : "attempt"} {ms.attempts}/2
                    </span>
                  )}
                </div>

                {isVoting && totalVotes > 0 && (
                  <div style={{ marginTop: 10, maxWidth: 360 }}>
                    <div className="vote-bar">
                      <div className="vote-bar-for" style={{ width: `${forPct}%` }}>
                        ✓ {forPct.toFixed(0)}%
                      </div>
                      <div className="vote-bar-against">
                        × {(100 - forPct).toFixed(0)}%
                      </div>
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      marginTop: 4, fontSize: 11,
                      fontFamily: "var(--font-mono)", color: "var(--ink-4)"
                    }}>
                      <span>{lang === "ru" ? "За" : "For"}: {votesFor.toFixed(3)} ETH</span>
                      <span>{lang === "ru" ? "Против" : "Against"}: {votesAgainst.toFixed(3)} ETH</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="ms-budget">
                {budget.toFixed(3)} ETH<br />
                <small>{lang === "ru" ? "бюджет" : "budget"}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
