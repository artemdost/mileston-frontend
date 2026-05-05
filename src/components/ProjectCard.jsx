import React from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { useLang, STATE_LABELS } from "../context/LangContext";

const STATE_KEYS = ["funding", "active", "completed", "failed"];

function StateBadge({ state, lang }) {
  const k = STATE_KEYS[state] || "funding";
  return (
    <span className={`badge is-${k}`}>
      <span className="badge-dot" />
      {STATE_LABELS[k][lang]}
    </span>
  );
}

export default function ProjectCard({ project }) {
  const { lang } = useLang();
  const {
    title, description, goalAmount, totalRaised,
    state, contractAddress, milestoneCount, hue
  } = project;
  const goal = parseFloat(ethers.formatEther(goalAmount || "0"));
  const raised = parseFloat(ethers.formatEther(totalRaised || "0"));
  const pct = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  const stateKey = STATE_KEYS[state] || "funding";

  const cardHue = hue || ((parseInt(contractAddress?.slice(2, 8) || "1a2b3c", 16) % 360));

  return (
    <Link to={`/project/${contractAddress}`} className="project-card">
      <div
        className="project-card-img"
        style={{
          background: `linear-gradient(135deg,
            oklch(0.92 0.04 ${cardHue}) 0%,
            oklch(0.85 0.06 ${cardHue}) 100%)`,
          position: "relative",
        }}
      >
        <span style={{
          position: "absolute", bottom: 10, left: 12,
          fontFamily: "var(--font-mono)", fontSize: 10,
          letterSpacing: "0.06em", textTransform: "uppercase",
          color: `oklch(0.36 0.10 ${cardHue})`,
        }}>
          #{contractAddress?.slice(2, 8)}
        </span>
        <span style={{ position: "absolute", top: 10, right: 10 }}>
          <StateBadge state={state} lang={lang} />
        </span>
      </div>
      <div className="project-card-body">
        <div className="project-card-title">{title}</div>
        <div className="project-card-desc">
          {description || (lang === "ru" ? "Описание отсутствует" : "No description")}
        </div>
        <div style={{ marginTop: 4 }}>
          <div className="progress" style={{}}>
            <span style={{ width: `${pct}%`, background: stateKey === "funding" ? "var(--accent)" : "var(--ink)" }} />
          </div>
          <div className="between" style={{
            marginTop: 6, fontSize: 12, fontFamily: "var(--font-mono)"
          }}>
            <span><strong>{raised.toFixed(3)}</strong> / {goal.toFixed(2)} ETH</span>
            <span style={{ color: "var(--ink-4)" }}>{pct.toFixed(0)} %</span>
          </div>
        </div>
        <div className="project-card-foot">
          <span>{milestoneCount || 0} {lang === "ru" ? "этапов" : "milestones"}</span>
          <span>{contractAddress?.slice(0, 6)}…</span>
        </div>
      </div>
    </Link>
  );
}
