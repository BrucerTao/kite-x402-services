# Open-Meteo Weather

Wraps the free [Open-Meteo](https://open-meteo.com) forecast API as an x402
service on the Kite chain. Built from the
[typescript-express template](../../templates/typescript-express); the only
change is the `.env`.

| | |
|---|---|
| Endpoint | `GET /v1/forecast` → `https://api.open-meteo.com/v1/forecast` |
| Price | $0.001 per call in USDC.e (Kite mainnet) |
| Upstream auth | none |

## Deploy

```bash
npm install
cp .env.example .env     # set PAY_TO to your Kite wallet
npm run build && node dist/index.js
```

Any host that runs Node 22 works (Fly, Render, Cloud Run, a VPS). The service
must be reachable over public https: Kite Passport fetches the URL server-side,
so `localhost` and tunnels that require a browser check will not work.

## Try it

```bash
curl -i "$BASE_URL/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m"
# 402 with a PAYMENT-REQUIRED header until a payment is attached

kpass agent session execute --method GET \
  --url "$BASE_URL/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m"
# 200 + Open-Meteo JSON, paid from the agent's session
```
