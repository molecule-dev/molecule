# @molecule/api-drug-database

Provider-agnostic drug-database interface for molecule.dev.

Defines the {@link DrugDatabaseProvider} interface for drug catalog +
interaction lookups (free-text search, full-detail lookup, interaction
checking, NDC enumeration). Bond packages (RxNorm, openFDA, etc.)
implement this interface. Application code uses the convenience
functions (`searchDrug`, `getDrug`, `checkInteractions`, `getNDCs`)
which delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, searchDrug, checkInteractions } from '@molecule/api-drug-database'
import { provider as rxnorm } from '@molecule/api-drug-database-rxnorm'

setProvider(rxnorm)
const matches = await searchDrug('metformin')
const interactions = await checkInteractions(['860975', '1191'])
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-drug-database @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `DrugDatabaseProvider`

Drug-database provider interface.

All drug-database providers (RxNorm, openFDA, NDC, etc.) implement this
interface. The interface is deliberately minimal so providers with very
different upstream APIs can satisfy it identically — only free-text
search, full-detail lookup, interaction checking, and NDC enumeration
are required.

Providers whose upstream API does not support a given method (e.g.
RxNorm's interactions endpoint, currently being deprecated) MUST
degrade gracefully to an empty array rather than throwing — see
{@link DrugInteraction} for the contract.

```typescript
interface DrugDatabaseProvider {
  /**
   * Free-text search for drugs (brand or generic name).
   *
   * @param query - Free-text query (drug name).
   * @returns Array of normalized search-result rows, ordered by upstream
   *   relevance. May be empty when no records match.
   */
  searchDrug(query: string): Promise<DrugMatch[]>

  /**
   * Look up a drug by provider-specific id and return its full detail
   * record.
   *
   * @param id - Provider-specific identifier previously returned by
   *   {@link searchDrug}.
   * @returns The matching drug detail, or `null` when no record exists.
   */
  getDrug(id: DrugId): Promise<DrugDetail | null>

  /**
   * Check for known interactions between the supplied drug ids.
   *
   * @param drugIds - Provider-specific ids previously returned by
   *   {@link searchDrug}. Two or more ids are required for a meaningful
   *   query; passing fewer SHOULD resolve to `[]`.
   * @returns Array of reported interactions. Empty array when no
   *   interactions are reported, OR when the upstream interactions
   *   endpoint is unavailable / deprecated — application code MUST treat
   *   an empty result as "no interactions reported by this provider", not
   *   as a clinical guarantee.
   */
  checkInteractions(drugIds: DrugId[]): Promise<DrugInteraction[]>

  /**
   * Enumerate the National Drug Code (NDC) identifiers associated with a
   * drug.
   *
   * @param drugId - Provider-specific identifier previously returned by
   *   {@link searchDrug}.
   * @returns Array of NDC strings (typically 10- or 11-digit codes).
   *   Empty array when the upstream record carries no NDCs.
   */
  getNDCs(drugId: DrugId): Promise<string[]>
}
```

#### `DrugDetail`

Full drug record returned by {@link DrugDatabaseProvider.getDrug}.

Includes everything {@link DrugMatch} carries plus dosage forms +
ingredient breakdown.

```typescript
interface DrugDetail {
  /**
   * Provider-specific identifier (same value as {@link DrugMatch.id}).
   */
  id: DrugId

  /**
   * Display name of the drug as returned by the upstream API.
   */
  name: string

  /**
   * Generic (non-proprietary) name, when supplied by the upstream record.
   * `null` when not supplied.
   */
  genericName: string | null

  /**
   * Brand (proprietary) name, when supplied by the upstream record.
   * `null` when not supplied.
   */
  brandName: string | null

  /**
   * Dosage forms the drug is available in (e.g. `['Oral Tablet',
   * 'Oral Solution']`). Empty array when the upstream record does not
   * supply dosage-form data.
   */
  dosageForms: string[]

  /**
   * Active and inactive ingredients of the drug. Empty array when the
   * upstream record does not break out ingredients.
   */
  ingredients: DrugIngredient[]

  /**
   * Identifier of the upstream provider that produced this record.
   */
  source: string
}
```

#### `DrugIngredient`

One ingredient (active or inactive) of a {@link DrugDetail}.

```typescript
interface DrugIngredient {
  /**
   * Provider-specific identifier of the ingredient when the upstream API
   * exposes it as a first-class entity (e.g. RxNorm assigns RxCUIs to
   * ingredients). `null` when the upstream record only carries the
   * ingredient name.
   */
  id: DrugId | null

  /**
   * Ingredient name (e.g. `'metformin hydrochloride'`).
   */
  name: string

  /**
   * Free-text strength as printed on the label
   * (e.g. `'500 mg'`, `'25 mg/mL'`). `null` when the upstream record does
   * not supply a strength.
   */
  strength: string | null
}
```

#### `DrugInteraction`

A reported interaction between two or more drugs.

Returned by {@link DrugDatabaseProvider.checkInteractions}. An empty
array means "no interactions reported by this provider for the supplied
drug ids" — NOT a clinical guarantee. Some upstream APIs (notably the
NIH NLM RxNorm interactions endpoint) are being deprecated; bonds whose
upstream is unavailable resolve to `[]` rather than throwing, so
application code MUST surface that ambiguity to end-users when relevant.

```typescript
interface DrugInteraction {
  /**
   * Drug ids involved in the interaction. Length is always >= 2.
   *
   * Ids are drawn from the same provider that returned the interaction —
   * do not feed these into a different provider's
   * {@link DrugDatabaseProvider.getDrug}.
   */
  drugIds: DrugId[]

  /**
   * Normalized severity of the interaction.
   */
  severity: DrugInteractionSeverity

  /**
   * Human-readable description of the interaction. May be the empty
   * string when the upstream record only supplies a severity classification.
   */
  description: string

  /**
   * Citation sources the upstream API supplied with the interaction
   * (e.g. `['DrugBank', 'ONCHigh']`). Empty array when the upstream
   * record carries no citations.
   */
  sources: string[]
}
```

#### `DrugMatch`

A search-result row returned by {@link DrugDatabaseProvider.searchDrug}.

Carries just enough information to render an autocomplete / picker.
Use {@link DrugDatabaseProvider.getDrug} to fetch full details.

```typescript
interface DrugMatch {
  /**
   * Provider-specific identifier suitable for
   * {@link DrugDatabaseProvider.getDrug}.
   */
  id: DrugId

  /**
   * Display name of the drug as returned by the upstream API. May be
   * either a brand name or a generic name depending on what matched the
   * query — use {@link genericName} / {@link brandName} when the
   * distinction matters.
   */
  name: string

  /**
   * Generic (non-proprietary) name, when supplied by the upstream record.
   * `null` when the provider did not classify the match as a generic.
   */
  genericName: string | null

  /**
   * Brand (proprietary) name, when supplied by the upstream record.
   * `null` when the provider did not classify the match as a brand.
   */
  brandName: string | null

  /**
   * Identifier of the upstream provider that produced this record
   * (e.g. `'rxnorm'`, `'openfda'`). Useful for telemetry and cache-key
   * namespacing.
   */
  source: string
}
```

### Types

#### `DrugId`

Provider-specific drug identifier.

Each provider chooses its own identifier scheme — RxNorm uses the
numeric "RxCUI" (e.g. `'860975'`), openFDA uses opaque application
numbers, etc. Treat as an opaque string and only feed values previously
returned by the same provider back into
{@link DrugDatabaseProvider.getDrug},
{@link DrugDatabaseProvider.checkInteractions}, or
{@link DrugDatabaseProvider.getNDCs}.

```typescript
type DrugId = string
```

#### `DrugInteractionSeverity`

Severity of a {@link DrugInteraction}.

Free-text severity values from upstream APIs are normalized onto this
fixed enum so application code can branch deterministically:

- `'unknown'` — upstream did not classify the interaction.
- `'low'` — minor / informational interaction.
- `'moderate'` — significant interaction; clinical attention warranted.
- `'high'` — severe / contraindicated combination.

```typescript
type DrugInteractionSeverity = 'unknown' | 'low' | 'moderate' | 'high'
```

### Functions

#### `checkInteractions(drugIds)`

Check for known interactions between the supplied drug ids via the
bonded provider.

Empty array means "no interactions reported by this provider", NOT a
clinical guarantee — see {@link DrugInteraction} for the contract.

```typescript
function checkInteractions(drugIds: string[]): Promise<DrugInteraction[]>
```

- `drugIds` — Provider-specific ids previously returned by

**Returns:** Array of reported interactions.

#### `getDrug(id)`

Look up a drug by provider-specific id via the bonded provider.

```typescript
function getDrug(id: string): Promise<DrugDetail | null>
```

- `id` — Provider-specific identifier previously returned by

**Returns:** The matching drug detail, or `null` when no record exists.

#### `getNDCs(drugId)`

Enumerate the National Drug Code (NDC) identifiers associated with a
drug via the bonded provider.

```typescript
function getNDCs(drugId: string): Promise<string[]>
```

- `drugId` — Provider-specific identifier previously returned by

**Returns:** Array of NDC strings.

#### `getProvider()`

Retrieves the bonded drug-database provider, throwing if none is
configured.

```typescript
function getProvider(): DrugDatabaseProvider
```

**Returns:** The bonded drug-database provider.

#### `hasProvider()`

Checks whether a drug-database provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a drug-database provider is bonded.

#### `searchDrug(query)`

Free-text search for drugs via the bonded provider.

```typescript
function searchDrug(query: string): Promise<DrugMatch[]>
```

- `query` — Free-text query (drug name).

**Returns:** Array of normalized search-result rows, ordered by upstream
 *   relevance.

#### `setProvider(provider)`

Registers a drug-database provider as the active singleton.

Called by bond packages (e.g. `@molecule/api-drug-database-rxnorm`)
during application startup.

```typescript
function setProvider(provider: DrugDatabaseProvider): void
```

- `provider` — The drug-database provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| RxNorm | `@molecule/api-drug-database-rxnorm` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
