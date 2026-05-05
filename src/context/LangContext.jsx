import React, { createContext, useContext, useState, useEffect } from "react";

const LangContext = createContext(null);

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

export function t(obj, lang) {
  if (typeof obj === "string") return obj;
  if (!obj) return "";
  return obj[lang] || obj.ru || obj.en || "";
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "ru");

  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const toggle = () => setLang(l => (l === "ru" ? "en" : "ru"));

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t: (obj) => t(obj, lang) }}>
      {children}
    </LangContext.Provider>
  );
}

// Common UI strings
export const UI = {
  search: { ru: "Поиск проектов…", en: "Search projects…" },
  invest: { ru: "Инвестировать", en: "Invest" },
  vote_for: { ru: "Одобрить", en: "Approve" },
  vote_against: { ru: "Отклонить", en: "Reject" },
  goal: { ru: "Цель", en: "Goal" },
  raised: { ru: "Собрано", en: "Raised" },
  backers: { ru: "Инвесторов", en: "Backers" },
  fee: { ru: "Комиссия", en: "Fee" },
  deadline: { ru: "Дедлайн", en: "Deadline" },
  contract: { ru: "Контракт", en: "Contract" },
  author: { ru: "Автор", en: "Author" },
  status: { ru: "Статус", en: "Status" },
  milestones: { ru: "Этапы", en: "Milestones" },
  current: { ru: "текущий", en: "current" },
  done: { ru: "одобрен", en: "approved" },
  pending: { ru: "ожидание", en: "pending" },
  amount: { ru: "Сумма", en: "Amount" },
  description: { ru: "Описание", en: "Description" },
  title: { ru: "Название", en: "Title" },
  category: { ru: "Категория", en: "Category" },
  loading: { ru: "Загрузка…", en: "Loading…" },
  empty: { ru: "Ничего не найдено", en: "Nothing found" },
  back: { ru: "Назад", en: "Back" },
  next: { ru: "Далее", en: "Next" },
  cancel: { ru: "Отмена", en: "Cancel" },
  submit: { ru: "Отправить", en: "Submit" },
  save: { ru: "Сохранить", en: "Save" },
  edit: { ru: "Редактировать", en: "Edit" },
  delete: { ru: "Удалить", en: "Delete" },
  confirm: { ru: "Подтвердить", en: "Confirm" },
  login: { ru: "Войти", en: "Sign in" },
  register: { ru: "Регистрация", en: "Sign up" },
  logout: { ru: "Выйти", en: "Sign out" },
  email: { ru: "Email", en: "Email" },
  password: { ru: "Пароль", en: "Password" },
  role_investor: { ru: "Инвестор", en: "Investor" },
  role_author: { ru: "Автор", en: "Founder" },
};

export const STATE_LABELS = {
  funding:   { ru: "Сбор средств", en: "Funding" },
  active:    { ru: "Активен",      en: "Active"  },
  voting:    { ru: "Голосование",  en: "Voting"  },
  completed: { ru: "Завершён",     en: "Completed" },
  failed:    { ru: "Провален",     en: "Failed"  },
};

export const NAV_LABELS = {
  home:      { ru: "Каталог",    en: "Discover" },
  create:    { ru: "Создать",    en: "Create"   },
  dashboard: { ru: "Кабинет",    en: "Dashboard" },
  profile:   { ru: "Профиль",    en: "Profile"  },
};
