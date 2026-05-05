import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import { WagmiProvider, useAccount, useDisconnect, useWalletClient, useConnect } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, ConnectButton, getDefaultConfig, useConnectModal } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";
import api from "../utils/api";
import { useAuth } from "./AuthContext";
import { demoBindWallet, demoUnbindWallet, isStandalone as isStandaloneFn } from "../utils/demoStore";
import "@rainbow-me/rainbowkit/styles.css";

const STANDALONE = isStandaloneFn();

// Production chain config from ENV (Vercel)
const PROD_CHAIN_ID = Number(import.meta.env?.VITE_CHAIN_ID || 0);
const PROD_RPC = import.meta.env?.VITE_RPC_URL || "";
const PROD_NAME = import.meta.env?.VITE_CHAIN_NAME || "Sepolia";

// Hardhat local chain (для разработки)
const hardhatLocal = defineChain({
  id: 31337,
  name: "Hardhat Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
  testnet: true,
});

// Sepolia / Production chain (если задан в env)
const prodChain = PROD_CHAIN_ID && PROD_RPC ? defineChain({
  id: PROD_CHAIN_ID,
  name: PROD_NAME,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [PROD_RPC] } },
  blockExplorers: PROD_CHAIN_ID === 11155111
    ? { default: { name: "Sepolia Etherscan", url: "https://sepolia.etherscan.io" } }
    : undefined,
  testnet: true,
}) : null;

// Список сетей: prod если задан, иначе только локальная
const CHAINS = prodChain ? [prodChain, hardhatLocal] : [hardhatLocal];
const DEFAULT_RPC = prodChain ? PROD_RPC : "http://127.0.0.1:8545";

// Wagmi config
const wagmiConfig = getDefaultConfig({
  appName: "Mileston · Tokenized Crowdfunding",
  projectId: "00000000000000000000000000000000", // placeholder
  chains: CHAINS,
  ssr: false,
});

const queryClient = new QueryClient();

// Inner context for ethers.js compatibility
const Web3Context = createContext(null);

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used within Web3Provider");
  return ctx;
}

/**
 * Bridge between wagmi and ethers.js.
 * Provides: provider, signer, account, balance - compatible with existing components.
 */
function Web3Bridge({ children }) {
  const { user, refreshUser } = useAuth();
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [balance, setBalance] = useState("0");

  // Read-only provider (для чтения on-chain данных без подключённого кошелька)
  useEffect(() => {
    const jsonProvider = new ethers.JsonRpcProvider(DEFAULT_RPC);
    jsonProvider.getNetwork().then(() => {
      if (!isConnected) setProvider(jsonProvider);
    }).catch(() => {});
  }, [isConnected]);

  // When wallet connects, create ethers signer from walletClient
  useEffect(() => {
    if (walletClient && isConnected) {
      const ethersProvider = new ethers.BrowserProvider(walletClient.transport, {
        chainId: walletClient.chain.id,
        name: walletClient.chain.name,
      });
      setProvider(ethersProvider);
      ethersProvider.getSigner().then(setSigner).catch(() => setSigner(null));
    } else {
      setSigner(null);
    }
  }, [walletClient, isConnected]);

  // Fetch balance
  useEffect(() => {
    if (!provider || !address) { setBalance("0"); return; }
    const fetch = async () => {
      try {
        const bal = await provider.getBalance(address);
        setBalance(ethers.formatEther(bal));
      } catch { setBalance("0"); }
    };
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [provider, address]);

  // Bind wallet: sign message to prove ownership, then save
  const bindWallet = useCallback(async () => {
    if (!isConnected || !address || !user || !signer) {
      throw new Error("Кошелёк не подключён");
    }
    const message = `Mileston: привязать кошелёк к аккаунту ${user.email}`;
    const signature = await signer.signMessage(message);
    if (STANDALONE) {
      demoBindWallet(user.email, { address, signature });
    } else {
      await api.put("/auth/wallet", { wallet_address: address, signature });
    }
    await refreshUser();
    return { wallet_address: address, signature };
  }, [isConnected, address, user, signer, refreshUser]);

  // Unbind wallet: sign message to prove ownership, then remove
  const unbindWallet = useCallback(async () => {
    if (!user || !signer) {
      throw new Error("Кошелёк не подключён");
    }
    const message = `Mileston: отвязать кошелёк от аккаунта ${user.email}`;
    await signer.signMessage(message);
    if (STANDALONE) {
      demoUnbindWallet(user.email);
    } else {
      await api.post("/auth/wallet/unbind", { signature: "" });
    }
    await refreshUser();
    disconnect();
  }, [user, signer, refreshUser, disconnect]);

  // Если пользователь авторизован, кошелёк должен совпадать с привязанным.
  // Без авторизации (анонимный режим) — подключённый кошелёк работает без проверки.
  const isBound = !!(user?.wallet_address);
  const isWalletMatched = isBound && address && user.wallet_address.toLowerCase() === address.toLowerCase();
  const canTransact = isConnected && (user ? isWalletMatched : true);
  const isKycVerified = !!(user?.kyc_verified);

  // Guarded signer: для авторизованного юзера требуем совпадение кошелька
  const guardedSigner = canTransact ? signer : null;

  const connect = useCallback(() => {
    if (openConnectModal) openConnectModal();
  }, [openConnectModal]);

  const value = useMemo(() => ({
    provider,
    signer: guardedSigner,
    account: address || null,
    chainId: chain?.id || null,
    balance,
    connecting: false,
    isConnected,
    isBound,
    isWalletMatched,
    canTransact,
    isKycVerified,
    bindWallet,
    unbindWallet,
    connect,
    disconnect,
  }), [provider, guardedSigner, address, chain, balance, isConnected, isBound, isWalletMatched, canTransact, isKycVerified, bindWallet, unbindWallet, connect, disconnect]);

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

/**
 * Wrapper that sets up wagmi + RainbowKit + ethers bridge.
 */
export function Web3Provider({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en" coolMode>
          <Web3Bridge>{children}</Web3Bridge>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Re-export ConnectButton for use in Navbar
export { ConnectButton };
