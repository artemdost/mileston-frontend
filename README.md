# Mileston · Tokenized Crowdfunding (Frontend)

Hi-fi редизайн платформы коллективного инвестирования с milestone-эскроу и поэтапным голосованием держателей токенов.

## Технологии

- React 18 + Vite
- ethers.js v6
- wagmi + RainbowKit (подключение кошелька)
- Tailwind CSS + собственная дизайн-система (`src/index.css`)

## Развёртывание

Frontend работает в **standalone-режиме** (без backend) на Vercel:

- Smart-contracts задеплоены в **Sepolia testnet**.
- Метаданные кампаний — статический файл `public/projects.json`.
- Регистрация / логин / кабинет автора скрыты в production-билде; доступно: каталог, страница кампании, голосование, инвестирование.

### Контракты (Sepolia)

| Контракт | Адрес |
|---|---|
| InvestToken (ERC-1155) | `0xF72b3B728c2a7bBc2B7FA5043F30a972143d9D17` |
| FundFactory | `0xD204B701F06fdb49803F6e41F498edEfcc7A9d3D` |

### Vercel-деплой через GitHub

1. Импортировать репо в Vercel: https://vercel.com/new
2. Framework: Vite (определяется автоматически).
3. Environment Variables:
   - `VITE_FACTORY_ADDRESS` = адрес FundFactory
   - `VITE_TOKEN_ADDRESS` = адрес InvestToken
   - `VITE_CHAIN_ID` = `11155111`
   - `VITE_CHAIN_NAME` = `Sepolia`
   - `VITE_RPC_URL` = Alchemy/Infura RPC URL Sepolia
   - `VITE_STANDALONE` = `true`
4. Deploy — Vercel сам соберёт и выкатит.

## Локальная разработка

```bash
npm install
cp .env.example .env  # заполнить значения
npm run dev
```

## Структура

```
src/
  pages/         Home, ProjectDetail, VotingPage, CreateProject, Dashboard, Profile, Login, Register
  components/    Navbar, ProjectCard, MilestoneList, VotePanel, InvestForm, TransactionHistory
  context/       Web3Context, AuthContext, LangContext (RU/EN), ThemeContext (light/dark)
  utils/         api, contracts (адреса из ENV → /deployed/addresses.json → fallback)
public/
  projects.json  Статические метаданные кампаний для standalone-режима
```

## Связанные репозитории

- Основной репозиторий ВКР: https://github.com/artemdost/vkr-crowdfund-platform
- Текст работы и презентация — там же

## Лицензия

MIT (учебный проект).
