# USGS Earthquakes

Wraps the [USGS Earthquake Catalog](https://earthquake.usgs.gov/earthquakes/search/)
(FDSN event API) as an x402 service on the Kite chain. Built from the
[typescript-express template](../../templates/typescript-express); `src/` is
byte-identical to the template, the only change is the `.env`.

| | |
|---|---|
| Endpoint | `GET /v1/query` → `https://earthquake.usgs.gov/fdsnws/event/1/query` |
| Price | $0.001 per call (pieUSD on Kite testnet, the default here) |
| Upstream auth | none (no API key, no published rate limit; 20000 events max per query) |

`/v1/count` also works through the same proxy (→ `.../event/1/count`) but is not
declared in [`service.yaml`](service.yaml): every declared endpoint has to have a
paid, tested `example_request`.

## Deploy

```bash
npm install
cp .env.example .env     # set PAY_TO to your Kite wallet
npm run build && node dist/index.js
```

Quote any `.env` value that contains spaces (`SERVICE_DESCRIPTION="..."`). This
file is sourced by the shell (`set -a; . ./.env`), and an unquoted value silently
truncates, so the service falls back to its generic 402 description.

Any host that runs Node 22 works (Fly, Render, Cloud Run, a VPS). The service
must be reachable over public https: Kite Passport fetches the URL server-side,
so `localhost` and tunnels that require a browser check will not work.

On Render, create a Web Service with Root Directory `services/usgs-earthquakes`;
the bundled [`render.yaml`](render.yaml) documents the native-Node build/start
commands and environment variables. After deploying, run
`./verify_public.sh https://<host>` to re-check `/healthz` and the 402 quote
without spending funds.

## Try it

```bash
curl -i "$BASE_URL/v1/query?format=geojson&starttime=2026-10-01&endtime=2026-10-07&minmagnitude=5.5&limit=5&orderby=magnitude"
# 402 with a PAYMENT-REQUIRED header until a payment is attached
```

To make a paid call, attach a signed EIP-3009 authorization from an EOA holding
pieUSD on Kite testnet. The harness used for the verification below backdates
`validAfter` because the testnet head lags wall clock (SDK defaults revert
on-chain — see `AGENTS.md`). `kpass agent:session execute` cannot pay this
service: Kite only executes hosts from its own service catalog, and self-hosted
hosts are rejected with `host_not_in_executable_catalog`.

### Do not pass `jsonerror=true`

The settlement rule is "charge only if the upstream status is < 400". With
`jsonerror=true` the USGS API reports parameter errors as **HTTP 200** with
`metadata.status: 400` and `title: "Search Error"`, so a failed lookup would be
charged. Bad parameters without that flag return a real 400 and cost nothing.

## Verification status (Kite testnet, 2026-10-11)

| Check | Result |
|---|---|
| `src/` vs template `src/` | `diff -r` empty (byte-identical) |
| `npm run typecheck` | pass |
| Base-path join (`index.ts:69`) | `/v1/query?…` → `https://earthquake.usgs.gov/fdsnws/event/1/query?…`, query preserved |
| Local `GET /healthz` | 200 `{ok:true, network:"eip155:2368", asset:"pieUSD", price:"$0.001"}` |
| Local unpaid `GET /v1/query` | 402 + `PAYMENT-REQUIRED`; decoded 4/4 (`eip155:2368` / pieUSD / v1 / `1000000000000000`) |
| Local build smoke (`npm run build` + `node dist/index.js`) | 200 + 402, decoded 4/4 — the exact Render build/start commands |
| Payer harness end-to-end plumbing | signs EIP-3009 and reaches the facilitator; with an unfunded payer the service returns 402 `insufficient_funds`, no upstream call, no charge |
| Paid call + settlement tx | **pending** — needs pieUSD in the payer wallet (both testnet faucets are down) |
| Public https deploy + paid call | **pending** — `status` stays `draft` until then |

Full run logs: [`evidence-usgs.md`](../../evidence-usgs.md).

## Data credit

Earthquake data is courtesy of the
[U.S. Geological Survey](https://www.usgs.gov/information-policies-and-instructions/acknowledging-or-crediting-usgs).
Most USGS information resides in the public domain and may be used without
restriction; credit is requested, which is what this section and the upstream
`terms_url` in the manifest are for.
