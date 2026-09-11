# Contributing

Thanks for wrapping an API for Kite agents. Two kinds of contributions are welcome:

1. **A new service** under `services/<name>/` — the common case, described below.
2. **Template or tooling fixes** under `templates/`, `schema/`, `scripts/`.

## Adding a service

1. **Pick an API worth paying for.** Agents pay per call, so the API should do
   something a model cannot do offline: live data, compute, actions. Check the
   upstream's terms allow resale or proxying; note it in `upstream.terms_url`.
2. **Start from a template.** Copy `templates/typescript-express` or
   `templates/go-gin` into `services/<name>/`. `<name>` is lowercase
   `a-z0-9-`, and must match `name:` in the manifest.
3. **Configure, do not fork.** Most wrappers only need a `.env`: `PAY_TO`,
   `UPSTREAM_URL`, `PRICE_USD`, optional upstream credential. Edit the proxy
   code only when the upstream needs request rewriting, and keep `kite.ts` /
   `kite.go` unchanged.
4. **Run it locally** and confirm an unpaid request returns `402` with a
   `PAYMENT-REQUIRED` header whose `accepts[0].network` is your Kite network.
5. **Deploy it** to any public https host. Never commit `.env` or upstream keys.
6. **Write `service.yaml`** (schema: [`schema/service.schema.json`](schema/service.schema.json))
   and `README.md`. Run `npm install && npm run validate` at the repo root.
7. **Pay for one call yourself** with a Kite Passport agent (see the main README,
   "Test with a Kite Passport agent") and paste the output in the PR.
8. Add a row to `services/README.md` and open the PR.

## Rules every service follows

- **Charge only on success.** Both templates settle the payment after your
  upstream responds with a status below 400. Do not move settlement earlier. If
  you write a custom wrapper, keep verify → upstream → settle ordering.
- **Public https origin, no path.** Kite Passport fetches `base_url + path`
  server-side. Localhost, http, self-signed certs and browser-gated tunnels fail.
- **Price in USD, small.** `price_usd` is a decimal string with at most 6
  fractional digits (USDC.e has 6 decimals). Most catalog services charge
  $0.001–$0.05 per call.
- **One `example_request` per endpoint** once deployed, verified to return 2xx.
  Buyers start from it; a bad guess costs them real money.
- **No secrets in the repo.** `.env` is git-ignored; CI rejects nothing here, so
  review your own diff before pushing.
- **Manifests are closed.** Unknown keys fail validation. Propose new fields in
  an issue rather than adding them ad hoc.

## Status lifecycle

`draft` → `testnet` → `live`. Move to `testnet` once deployed against
`eip155:2368` (pieUSD) and paid once with a sandbox agent; move to `live` once
deployed against `eip155:2366` (USDC.e) and paid once with a live agent. A
maintainer may move a service back to `draft` if its `base_url` stops answering.

## Template changes

Keep both templates behaviourally identical: same env variables, same route
prefix (`/v1/*`), same settle-on-success rule. A change to one should land in
the other in the same PR. CI builds the Go template and typechecks the
TypeScript one.

## Commit and PR conventions

Conventional Commits (`feat(services): add open-meteo-weather`,
`fix(template-ts): forward query string`). One service per PR.
