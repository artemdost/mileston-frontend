import React, { useState } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";
import { useLang, UI } from "../context/LangContext";
import { getCrowdFundContract } from "../utils/contracts";

export default function InvestForm({ contractAddress, goalAmount, totalRaised, onInvested }) {
  const { signer, account, balance, canTransact } = useWeb3();
  const { lang, t } = useLang();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const goal = parseFloat(ethers.formatEther(goalAmount || "0"));
  const raised = parseFloat(ethers.formatEther(totalRaised || "0"));
  const remaining = Math.max(0, goal - raised);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canTransact) {
      toast.error(lang === "ru" ? "Подключите кошелёк" : "Connect wallet");
      return;
    }
    const ethAmount = parseFloat(amount);
    if (isNaN(ethAmount) || ethAmount <= 0) {
      toast.error(lang === "ru" ? "Введите корректную сумму" : "Enter a valid amount");
      return;
    }
    if (ethAmount > parseFloat(balance)) {
      toast.error(lang === "ru" ? "Недостаточно средств" : "Insufficient balance");
      return;
    }
    setLoading(true);
    try {
      const contract = getCrowdFundContract(contractAddress, signer);
      const value = ethers.parseEther(amount);
      const tx = await contract.invest({ value });
      toast.loading(lang === "ru" ? "Отправлено…" : "Submitted…", { id: "invest-tx" });
      await tx.wait();
      toast.success(lang === "ru" ? `Инвестировано ${amount} ETH` : `Invested ${amount} ETH`, { id: "invest-tx" });
      setAmount("");
      if (onInvested) onInvested();
    } catch (err) {
      const reason = err.reason || err.message || (lang === "ru" ? "Ошибка" : "Error");
      toast.error(reason, { id: "invest-tx" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-pad">
      <div className="kicker mb-8">{lang === "ru" ? "Действие" : "Action"}</div>
      <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 14px" }}>
        {t(UI.invest)}
      </h3>

      {account && (
        <dl className="dl mb-16" style={{ fontSize: 12 }}>
          <dt>{lang === "ru" ? "Баланс" : "Balance"}</dt>
          <dd>{parseFloat(balance || "0").toFixed(3)} ETH</dd>
          <dt>{lang === "ru" ? "Осталось" : "Remaining"}</dt>
          <dd>{remaining.toFixed(3)} ETH</dd>
        </dl>
      )}

      <form onSubmit={handleSubmit}>
        <label className="label">{t(UI.amount)} (ETH)</label>
        <input
          type="number"
          step="0.0001"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.000"
          className="input mono"
          disabled={loading}
        />

        <div className="row mt-8" style={{ gap: 6 }}>
          {[0.1, 0.5, 1, 5].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setAmount(String(val))}
              className="btn btn-soft btn-sm"
              style={{ flex: 1 }}
            >
              {val}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !account || !amount}
          className="btn btn-primary btn-lg btn-block mt-16"
        >
          {loading
            ? <span className="loading-spin" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: "var(--bg)" }} />
            : !account
              ? (lang === "ru" ? "Подключите кошелёк" : "Connect wallet")
              : t(UI.invest)}
        </button>
      </form>
    </div>
  );
}
