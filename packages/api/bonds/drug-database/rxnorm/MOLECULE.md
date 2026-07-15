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
