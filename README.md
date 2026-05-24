# Reya Markets

A real-time crypto prediction market platform built on Reya Network.

## Tech Stack

- **Vite + React + TypeScript**
- **Tailwind CSS** — utility-first styling
- **Framer Motion** — animations
- **Recharts** — charts
- **wagmi + viem** — wallet connection (Reya Network chainId: 1729)
- **react-i18next** — 6 languages (EN, FA, TR, HA, HI, ZH)
- **@tanstack/react-query** — data fetching

## Live APIs

- **CoinGecko** — BTC/ETH/SOL real-time prices (free, no key needed)
- **Alternative.me** — Fear & Greed index
- **Reya Network RPC** — `https://rpc.reya.network`

## Setup

```bash
npm install
npm run dev
```

## Build & Deploy (Netlify)

```bash
npm run build
```

Then drag `dist/` folder to Netlify, or connect GitHub repo.
`netlify.toml` handles SPA routing automatically.

## Wallet Support

- MetaMask (injected)
- WalletConnect
- Any injected browser wallet

Auto-prompts to switch to **Reya Network** (Chain ID: 1729) if on wrong network.

## Features

- 🌐 6 language support with RTL for Persian
- 📊 Real-time price charts (BTC, ETH, SOL)
- 🎯 20 prediction markets (Polymarket-style)
- ➕ Create custom markets (2-6 options)
- 💹 Live trade feed (animated, auto-updating)
- 😱 Fear & Greed index
- 🔗 Real wallet connection via wagmi
- 📱 Fully responsive
