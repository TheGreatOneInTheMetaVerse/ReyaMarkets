# راهنمای Deploy — Reya Markets

## مرحله ۱ — Deploy Smart Contract (Remix IDE)

1. برو [remix.ethereum.org](https://remix.ethereum.org)
2. فایل `contracts/ReyaMarkets.sol` رو copy کن توی Remix
3. Compile کن (Solidity 0.8.20)
4. MetaMask رو به Reya Network (Chain 1729) وصل کن
5. Deploy با این پارامترها:
   - `_rUSD`: آدرس rUSD روی Reya (از explorer.reya.network)
   - `_relayer`: آدرس wallet که relayer ازش استفاده میکنه
6. آدرس contract رو کپی کن

## مرحله ۲ — Deploy Relayer (Railway)

1. برو [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. پوشه `relayer` رو انتخاب کن
4. Environment Variables رو اضافه کن:
   - `RELAYER_PRIVATE_KEY` = private key wallet relayer
   - `CONTRACT_ADDRESS` = آدرس contract از مرحله ۱
   - `REYA_RPC_URL` = https://rpc.reya.network
5. Deploy کن — رایگانه!

## مرحله ۳ — Update Frontend

1. فایل `.env` بساز:
   ```
   VITE_CONTRACT_ADDRESS=0x...
   VITE_RUSD_ADDRESS=0x...
   ```
2. Push به GitHub → Vercel خودکار redeploy میکنه

## نکات مهم

- Relayer wallet باید کمی ETH روی Reya داشته باشه برای gas
- rUSD آدرس رو از explorer.reya.network/tokens پیدا کن
- برای testnet اول: RPC = https://rpc.reya-cronos.gelato.digital
