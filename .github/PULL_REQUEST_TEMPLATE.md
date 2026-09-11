## What

<!-- One line: which API this wraps, or what you changed. -->

## Checklist for a new or changed service

- [ ] `services/<name>/service.yaml` validates (`npm run validate`)
- [ ] `services/<name>/README.md` explains what the API does and how to deploy the wrapper
- [ ] No secrets committed (`.env` is ignored; upstream keys live in your deployment)
- [ ] Every endpoint has an `example_request` that succeeded against the deployed `base_url`
- [ ] I paid for one call end to end with a Kite Passport agent and got a 200 (paste the `kpass agent session execute` output or tx hash below)

## Evidence

<!-- kpass output / transaction hash / curl -i showing the 402 challenge -->
