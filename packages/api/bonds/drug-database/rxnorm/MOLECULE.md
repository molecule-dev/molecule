# @molecule/api-drug-database-rxnorm

RxNorm drug-database provider — NIH NLM keyless free API.

## Type
`bond` (provider for `@molecule/api-drug-database`)

## Public API

```ts
import { provider, createProvider } from '@molecule/api-drug-database-rxnorm'
import type { RxNormConfig } from '@molecule/api-drug-database-rxnorm'

import { setProvider } from '@molecule/api-drug-database'

setProvider(provider)
```

- `provider` — lazily-initialized default provider, configured from
  `RXNORM_BASE_URL` (defaults to `https://rxnav.nlm.nih.gov/REST`).
- `createProvider(config?)` — explicit factory for tests / multi-tenant
  apps that need their own client.

## Endpoint mapping

- `searchDrug(query)` → `GET /drugs.json?name=...`
- `getDrug(id)` → `GET /rxcui/:id/properties.json` + companion
  `GET /rxcui/:id/related.json?tty=IN+SBD+SCD+DF+BN`
- `checkInteractions(drugIds)` → `GET /interaction/list.json?rxcuis=...`
- `getNDCs(drugId)` → `GET /rxcui/:id/ndcs.json`

## Deprecation Notice

The NIH NLM is deprecating the RxNorm interactions endpoint
(`/interaction/list.json`). This provider degrades gracefully — a
`404` / `410` / `503` response from that endpoint resolves to `[]` rather
than throwing. Application code MUST treat an empty
`checkInteractions` result as "no interactions reported by this
provider", NOT a clinical guarantee.

Production apps that need authoritative interaction data should layer a
clinical-grade provider (First Databank, Lexicomp, Wolters Kluwer) on
top of this bond — the core `DrugDatabaseProvider` interface accepts any
implementation.

## Injection Notes

### Requirements
- `@molecule/api-drug-database` (peer dep).
- No API key, no signup. Production apps that point at a mirror set
  `RXNORM_BASE_URL`.

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- `getDrug(id).ingredients[*].strength` is always `null` — RxNorm encodes
  strength as free-text inside SCD/SBD names rather than on the IN
  concept. Parsers wanting strength should consume the SCDC/SCDF concept
  graph directly.
- Coverage is FDA-approved US drugs; international catalogues require a
  separate bond.
