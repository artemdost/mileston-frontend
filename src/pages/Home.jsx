import React, { useState, useEffect, useMemo } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useLang, UI } from "../context/LangContext";
import { getFactoryContract, getCrowdFundContract } from "../utils/contracts";
import { ethers } from "ethers";
import ProjectCard from "../components/ProjectCard";
import api from "../utils/api";

const STATE_MAP = { funding: 0, active: 1, completed: 2, failed: 3 };

export default function Home() {
  const { provider } = useWeb3();
  const { lang, t } = useLang();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filters = [
    { k: "all",       l: { ru: "Все",          en: "All" } },
    { k: "funding",   l: { ru: "Сбор средств", en: "Funding" } },
    { k: "active",    l: { ru: "Активные",     en: "Active" } },
    { k: "completed", l: { ru: "Завершённые",  en: "Completed" } },
    { k: "failed",    l: { ru: "Проваленные",  en: "Failed" } },
  ];

  useEffect(() => {
    async function fetchFromChain() {
      if (!provider) return;
      setLoading(true);
      try {
        const factory = await getFactoryContract(provider);
        const addresses = await factory.getCampaigns();

        // Источник метаданных: backend API → fallback на статический /projects.json (для standalone)
        let dbProjects = [];
        try {
          const r = await api.get("/projects");
          dbProjects = r.data || [];
        } catch {
          try {
            const r = await fetch("/projects.json");
            if (r.ok) dbProjects = await r.json();
          } catch {}
        }
        const dbByAddr = {};
        for (const p of dbProjects) {
          const addr = p.contract_address || p.contractAddress;
          if (addr) dbByAddr[addr.toLowerCase()] = p;
        }
        const items = [];
        for (const addr of addresses) {
          const cf = getCrowdFundContract(addr, provider);
          const info = await cf.getInfo();
          const db = dbByAddr[addr.toLowerCase()];
          items.push({
            contractAddress: addr,
            title: db?.title || `Campaign ${addr.slice(0, 8)}…`,
            description: db?.description || "",
            goalAmount: info._goalAmount,
            totalRaised: info._totalRaised,
            deadline: info._deadline,
            state: Number(info._state),
            milestoneCount: Number(info._milestoneCount),
            hue: ((parseInt(addr.slice(2, 8), 16) % 360)),
          });
        }
        setProjects(items);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch campaigns:", err);
        setError(lang === "ru" ? "Не удалось загрузить проекты" : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }
    fetchFromChain();
  }, [provider, lang]);

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (filter !== "all") {
      result = result.filter((p) => p.state === STATE_MAP[filter]);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [projects, filter, search]);

  const stats = useMemo(() => ({
    total: projects.length,
    raised: projects.reduce((s, p) => s + parseFloat(ethers.formatEther(p.totalRaised || "0")), 0),
    active: projects.filter((p) => p.state === 1).length,
  }), [projects]);

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-stamp">
          {lang === "ru" ? "Платформа № 02 / 2026" : "Platform № 02 / 2026"}
        </div>
        <h1>
          {lang === "ru"
            ? <>Краудфандинг с <em>проверяемыми</em> этапами.</>
            : <>Crowdfunding with <em>verifiable</em> milestones.</>}
        </h1>
        <p className="hero-lede">
          {lang === "ru"
            ? "Средства освобождаются только после голосования инвесторов по каждому этапу. Учёт ведётся on-chain, возврат — пропорциональный и автоматический."
            : "Funds are released only after backers vote on each milestone. Accounting is on-chain, refunds are pro-rata and automatic."}
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, max-content)",
          gap: 48, marginTop: 36
        }}>
          <div>
            <div className="stat-num">{stats.total}</div>
            <div className="stat-label">
              {lang === "ru" ? "Активных кампаний" : "Live campaigns"}
            </div>
          </div>
          <div>
            <div className="stat-num">
              {stats.raised.toFixed(1)}
              <span style={{ fontSize: 16, color: "var(--ink-4)" }}> ETH</span>
            </div>
            <div className="stat-label">
              {lang === "ru" ? "Всего собрано" : "Total raised"}
            </div>
          </div>
          <div>
            <div className="stat-num">{stats.active}</div>
            <div className="stat-label">
              {lang === "ru" ? "В работе" : "In progress"}
            </div>
          </div>
          <div>
            <div className="stat-num">
              2.0<span style={{ fontSize: 16, color: "var(--ink-4)" }}> %</span>
            </div>
            <div className="stat-label">
              {lang === "ru" ? "Комиссия платформы" : "Platform fee"}
            </div>
          </div>
        </div>
      </div>

      {/* Search + filters + grid */}
      <div className="app-main">
        <div className="between mb-24" style={{ flexWrap: "wrap" }}>
          <div style={{ flex: 1, maxWidth: 360, position: "relative", minWidth: 240 }}>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(UI.search)}
              style={{ paddingLeft: 32 }}
            />
            <span style={{
              position: "absolute", left: 10, top: 9,
              color: "var(--ink-4)",
              fontFamily: "var(--font-mono)", fontSize: 14,
              pointerEvents: "none"
            }}>⌕</span>
          </div>
          <div className="chips">
            {filters.map(f => (
              <div
                key={f.k}
                className={`chip ${filter === f.k ? "is-active" : ""}`}
                onClick={() => setFilter(f.k)}
              >
                {t(f.l)}
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty">
            <span className="loading-spin" />
            <div style={{ marginTop: 12 }}>{t(UI.loading)}</div>
          </div>
        ) : error ? (
          <div className="empty" style={{ borderColor: "var(--bad)" }}>
            <div className="empty-mark" style={{ color: "var(--bad)" }}>Error</div>
            <div>{error}</div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty">
            <div className="empty-mark">404 / no results</div>
            <div>
              {lang === "ru"
                ? "Проекты не найдены. Попробуйте изменить фильтры."
                : "No projects found. Try changing filters."}
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 18
          }}>
            {filteredProjects.map((project) => (
              <ProjectCard key={project.contractAddress} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
