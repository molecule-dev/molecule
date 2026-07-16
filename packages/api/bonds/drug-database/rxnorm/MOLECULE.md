# @molecule/api-drug-database-rxnorm

RxNorm drug-database provider for molecule.dev.

Implements the `DrugDatabaseProvider` interface against the public
NIH National Library of Medicine RxNav REST API at
`https://rxnav.nlm.nih.gov/REST/`. The endpoint is keyless and free
for any use.

The NLM is deprecating the RxNorm interactions endpoint
(`/interaction/list.json`); this provider degrades gracefully, mapping
`404` / `410` / `503` responses from that endpoint onto an empty
`DrugInteraction[]` rather than throwing.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-drug-database'
import { provider } from '@molecule/api-drug-database-rxnorm'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-drug-database-rxnorm @molecule/api-drug-database
```

## API

### Interfaces

#### `RxNormConfig`

Configuration options for the RxNorm drug-database provider.

The NIH National Library of Medicine RxNav REST API at
`https://rxnav.nlm.nih.gov/REST/` is keyless and free for any use, so
all fields are optional.

```typescript
interface RxNormConfig {
  /**
   * Base URL override. Defaults to `'https://rxnav.nlm.nih.gov/REST'`.
   *
   * The trailing `/REST` segment is part of the base URL — endpoints are
   * appended without a leading slash duplicate. Trailing slashes on the
   * supplied value are tolerated (and stripped).
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}
```

### Functions

#### `createProvider(config)`

Creates an RxNorm drug-database provider.

```typescript
function createProvider(config?: RxNormConfig): DrugDatabaseProvider
```

- `config` — Provider configuration. All fields are optional.

**Returns:** A {@link DrugDatabaseProvider} backed by the RxNav REST API.

### Constants

#### `provider`

The provider implementation, lazily initialized on first use.

Reads `RXNORM_BASE_URL` from environment variables. The RxNav public
API requires no key; production deployments may override the base URL
to point at a mirror.

```typescript
const provider: DrugDatabaseProvider
```

## Core Interface
Implements `@molecule/api-drug-database` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-drug-database'
import { provider } from '@molecule/api-drug-database-rxnorm'

export function setupDrugDatabaseRxnorm(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-drug-database` ^1.0.0

### Runtime Dependencies

- `@molecule/api-drug-database`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip.
This is HEALTH data: an empty or partial result rendered as if it were
complete is a SAFETY bug, not a cosmetic one — hold every box to that bar:
- [ ] Searching a known drug (e.g. "ibuprofen") through the app's UI returns
  the REAL matching record from the bonded provider — the actual drug name
  plus whatever a `DrugMatch` exposes (generic vs brand name, `source`) —
  rendered in the results, never an empty list, a spinner that never
  resolves, or placeholder text.
- [ ] Search handles brand vs generic and partial names sensibly: a brand
  query (e.g. "Advil") and its generic ("ibuprofen") both find the drug and
  the UI reflects the brand/generic distinction, and a partial name (e.g.
  "ibupro") still surfaces the intended drug rather than nothing.
- [ ] Opening a result loads full detail via `getDrug(id)`: the drug's real
  dosage forms and ingredient breakdown (ingredient names with their
  strengths) — plus NDC codes via `getNDCs(id)` if the app exposes them —
  render for a known drug as real content, not empty arrays shown as blank
  sections. Ids fed to `getDrug`/`getNDCs` are ones `searchDrug` returned for
  this same provider, never hardcoded from another vendor's catalogue.
- [ ] If the app exposes drug-INTERACTION checking, assert BOTH directions on
  real data: a known interacting pair (e.g. warfarin + aspirin) is FLAGGED
  with its severity/description, AND a known non-interacting pair is NOT
  flagged. A checker that flags everything, or flags nothing, is dangerously
  broken — one all-clear and one warning together prove it discriminates.
- [ ] An unknown or misspelled drug returns a clear "not found" (or
  suggestions) in the UI — `searchDrug` resolving to `[]` and `getDrug` to
  `null` (a 404, not a 500) — never a wrong drug presented as the
  authoritative match.
- [ ] CORRECTNESS / SAFETY — empty or partial safety data is never shown as
  if it were complete. `checkInteractions` returns `[]` both when there are
  genuinely no interactions AND when the upstream interactions endpoint is
  unavailable or deprecated (see {@link DrugInteraction}); a failed or empty
  interaction lookup MUST read as "no known interactions found" with any
  medical disclaimer intact — NEVER as "no interactions" / "safe to combine".
  A provider error (upstream down, rate-limited, no provider bonded) surfaces
  as a readable message, not a blank screen, a silent empty result, or a 500.
- [ ] The provider runs SERVER-SIDE only: lookups go through this app's own
  API, and any upstream medical-API key never reaches the browser, the client
  bundle, or network traffic the user can inspect.
