import React from "react";
import { ethers } from "ethers";
import { useLang } from "../context/LangContext";

const TX_TYPES = {
  invest: { ru: "Инвестиция", en: "Investment", dir: "out" },
  refund: { ru: "Возврат", en: "Refund", dir: "in" },
  milestone_approved: { ru: "Этап одобрен", en: "Milestone approved", dir: "in" },
  milestone_rejected: { ru: "Этап отклонён", en: "Milestone rejected", dir: "out" },
  vote: { ru: "Голос", en: "Vote", dir: "in" },
  payout: { ru: "Выплата", en: "Payout", dir: "in" },
};

function truncateHash(hash) {
  if (!hash) return "—";
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function formatDate(dateStr, lang) {
  if (!dateStr) return "—";
  const d = new Date(typeof dateStr === "number" ? dateStr * 1000 : dateStr);
  return d.toLocaleString(lang === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function TransactionHistory({ transactions }) {
  const { lang } = useLang();

  if (!transactions || transactions.length === 0) {
    return null;
  }

  return (
    <div className="card card-pad">
      <div className="section-h">
        <h2>{lang === "ru" ? "История транзакций" : "Transaction history"}</h2>
        <div className="meta">{transactions.length}</div>
      </div>

      <table className="tbl">
        <thead>
          <tr>
            <th>{lang === "ru" ? "Тип" : "Type"}</th>
            <th className="right">{lang === "ru" ? "Сумма" : "Amount"}</th>
            <th>{lang === "ru" ? "Дата" : "Date"}</th>
            <th>{lang === "ru" ? "Хеш" : "Hash"}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, index) => {
            const typeConfig = TX_TYPES[tx.type] || { ru: tx.type, en: tx.type, dir: "in" };
            const amount = tx.amount ? parseFloat(ethers.formatEther(tx.amount)).toFixed(3) : "—";
            return (
              <tr key={tx.txHash || index}>
                <td>
                  <span className="tx-pill">
                    <span className={`tx-arrow ${typeConfig.dir}`}>
                      {typeConfig.dir === "in" ? "↓" : "↑"}
                    </span>
                    {typeConfig[lang]}
                  </span>
                </td>
                <td className="right mono">{amount !== "—" ? `${amount} ETH` : "—"}</td>
                <td className="muted" style={{ fontSize: 11.5 }}>
                  {formatDate(tx.date || tx.timestamp || tx.createdAt, lang)}
                </td>
                <td>
                  {tx.txHash ? (
                    <a
                      href={`https://etherscan.io/tx/${tx.txHash}`}
                      target="_blank" rel="noopener noreferrer"
                      className="addr"
                      style={{ textDecoration: "none" }}
                    >
                      {truncateHash(tx.txHash)}
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
