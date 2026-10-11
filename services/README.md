# Services

One directory per wrapped API. Each directory contains:

- `service.yaml` — the manifest (validated in CI against [`schema/service.schema.json`](../schema/service.schema.json))
- `README.md` — what the API does, how to deploy the wrapper, how to call it
- the wrapper source, usually a copy of one of the [templates](../templates) with its `.env.example`

| Service | Status | Network | Endpoints | Maintainer |
|---|---|---|---|---|
| [open-meteo-weather](open-meteo-weather) | testnet | eip155:2368 | `GET /v1/forecast` | @BrucerTao |
| [frankfurter-fx](frankfurter-fx) | testnet | eip155:2368 | `GET /v1/latest` | @BrucerTao |
| [usgs-earthquakes](usgs-earthquakes) | draft | eip155:2368 | `GET /v1/query` | @BrucerTao |

Add a row when you add a service. `status` meanings: `draft` = code only,
`testnet` = deployed and charging pieUSD on Kite testnet, `live` = deployed and
charging USDC.e on Kite mainnet.
