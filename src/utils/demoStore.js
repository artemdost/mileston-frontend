/**
 * Клиентское локальное хранилище для demo-режима (без backend).
 * Все «персональные данные» (учётка, KYC, привязка кошелька) хранятся в localStorage
 * и существуют только в браузере пользователя — для апробации UI-флоу
 * платформы в публичной тестовой среде Sepolia.
 *
 * В production-сборке эти функции замещаются вызовами backend API
 * с шифрованием и хранением off-chain (см. NFR-06, NFR-09).
 */

const KEY_USERS    = "mileston.demo.users";   // map email -> {id, email, role, password_hash, created_at}
const KEY_SESSION  = "mileston.demo.session"; // {email}
const KEY_KYC      = "mileston.demo.kyc";     // map email -> {status, full_name, doc_type, doc_last4, verified_at}
const KEY_WALLETS  = "mileston.demo.wallets"; // map email -> {address, signature, signed_at}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// «Хеш» демо-уровня: достаточно, чтобы пароль не хранился в plain-text в localStorage.
// Реальный аналог — bcrypt на backend (см. backend/middleware/auth.js).
function pseudoHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return "h" + (h >>> 0).toString(16);
}

// ─── users ───────────────────────────────────────────────────────────────────
export function demoRegister({ email, password, role }) {
  const users = readJson(KEY_USERS, {});
  const norm = email.trim().toLowerCase();
  if (users[norm]) throw new Error("Email уже зарегистрирован");
  if (!password || password.length < 6) throw new Error("Минимум 6 символов в пароле");
  const id = Object.keys(users).length + 1;
  users[norm] = {
    id,
    email: norm,
    role: role === "author" ? "author" : "investor",
    password_hash: pseudoHash(password),
    created_at: new Date().toISOString(),
  };
  writeJson(KEY_USERS, users);
  return { ...users[norm], password_hash: undefined };
}

export function demoLogin({ email, password }) {
  const users = readJson(KEY_USERS, {});
  const norm = email.trim().toLowerCase();
  const u = users[norm];
  if (!u) throw new Error("Аккаунт не найден");
  if (u.password_hash !== pseudoHash(password)) throw new Error("Неверный пароль");
  writeJson(KEY_SESSION, { email: norm });
  return composeUser(norm);
}

export function demoLogout() {
  try { localStorage.removeItem(KEY_SESSION); } catch {}
}

export function demoCurrentUser() {
  const sess = readJson(KEY_SESSION, null);
  if (!sess?.email) return null;
  return composeUser(sess.email);
}

function composeUser(email) {
  const users = readJson(KEY_USERS, {});
  const u = users[email];
  if (!u) return null;
  const kyc = readJson(KEY_KYC, {})[email] || null;
  const wallet = readJson(KEY_WALLETS, {})[email] || null;
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
    wallet_address: wallet?.address || null,
    kyc_verified: kyc?.status === "verified",
    kyc: kyc || { status: "none" },
  };
}

// ─── KYC ─────────────────────────────────────────────────────────────────────
export function demoSubmitKyc(email, payload) {
  const all = readJson(KEY_KYC, {});
  all[email] = {
    status: "pending",
    full_name: payload.full_name,
    doc_type: payload.doc_type,
    doc_last4: (payload.doc_number || "").slice(-4),
    submitted_at: new Date().toISOString(),
  };
  writeJson(KEY_KYC, all);
  return all[email];
}

export function demoApproveKyc(email) {
  const all = readJson(KEY_KYC, {});
  if (!all[email]) return null;
  all[email] = {
    ...all[email],
    status: "verified",
    verified_at: new Date().toISOString(),
  };
  writeJson(KEY_KYC, all);
  return all[email];
}

export function demoResetKyc(email) {
  const all = readJson(KEY_KYC, {});
  delete all[email];
  writeJson(KEY_KYC, all);
}

// ─── wallet binding ──────────────────────────────────────────────────────────
export function demoBindWallet(email, { address, signature }) {
  const all = readJson(KEY_WALLETS, {});
  // Проверяем, что адрес не привязан к другой учётке
  for (const [otherEmail, info] of Object.entries(all)) {
    if (otherEmail !== email && info.address?.toLowerCase() === address.toLowerCase()) {
      throw new Error("Этот кошелёк уже привязан к другой учётке");
    }
  }
  all[email] = {
    address,
    signature,
    signed_at: new Date().toISOString(),
  };
  writeJson(KEY_WALLETS, all);
  return all[email];
}

export function demoUnbindWallet(email) {
  const all = readJson(KEY_WALLETS, {});
  delete all[email];
  writeJson(KEY_WALLETS, all);
}

// ─── helpers ─────────────────────────────────────────────────────────────────
export const isStandalone = () => import.meta.env?.VITE_STANDALONE === "true";
