# @molecule/api-fx-rates-ecb

ECB FX-rates provider for molecule.dev.

Implements the {@link import('@molecule/api-fx-rates').FxRatesProvider}
interface against the European Central Bank's public reference-rate XML
feeds (`eurofxref-daily.xml` and `eurofxref-hist-90d.xml`). Both feeds are
keyless, free, and EUR-pivoted. Cross-rates are computed by pivoting
through EUR (`USD->GBP = rates[GBP] / rates[USD]`).

Snapshots are cached in memory for a configurable TTL (default 1h) and,
when the `'cache'` bond is registered, written through to it as well.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-fx-rates'
import { provider } from '@molecule/api-fx-rates-ecb'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-fx-rates-ecb @molecule/api-bond @molecule/api-fx-rates fast-xml-parser
```

## API

### Interfaces

#### `EcbDailySnapshot`

A single daily snapshot of EUR-pivot reference rates parsed from the ECB
XML feed. The pivot (`EUR`) itself is included with rate `1`.

```typescript
interface EcbDailySnapshot {
  /**
   * The publication date of the snapshot (UTC midnight on the publication day).
   */
  asOf: Date

  /**
   * Map from currency code to rate, where `1 EUR = rates[code] units of code`.
   * Always contains the `EUR` entry with rate `1`.
   */
  rates: Record<string, number>
}
```

#### `EcbFxRatesConfig`

Configuration options for the ECB FX-rates provider.

The European Central Bank's daily and 90-day-history reference-rate XML
feeds (`https://www.ecb.europa.eu/stats/eurofxref/`) are keyless and free,
so every field is optional.

```typescript
interface EcbFxRatesConfig {
  /**
   * Base URL override. Defaults to `'https://www.ecb.europa.eu/stats/eurofxref'`.
   */
  baseUrl?: string

  /**
   * Daily-feed XML filename. Defaults to `'eurofxref-daily.xml'`. Used when
   * the caller does not request an `asOf` date or requests a date the daily
   * snapshot already covers.
   */
  dailyPath?: string

  /**
   * Historical 90-day-feed XML filename. Defaults to
   * `'eurofxref-hist-90d.xml'`. Used when the caller requests an `asOf` date
   * older than the latest snapshot.
   */
  historicalPath?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number

  /**
   * TTL for the in-memory cache of parsed snapshots, in milliseconds.
   * Defaults to `3_600_000` (1 hour). Set to `0` to disable internal caching.
   *
   * If the `'cache'` bond is registered, snapshots are also written through
   * to it with the equivalent TTL in seconds.
   */
  cacheTtlMs?: number
}
```

### Functions

#### `computeRate(snapshot, from, to)`

Computes the conversion rate `1 unit of from = rate units of to` from a
EUR-pivot snapshot. Both sides may equal the pivot.

```typescript
function computeRate(snapshot: EcbDailySnapshot, from: string, to: string): number
```

- `snapshot` — The dated snapshot to read.
- `from` — Source currency.
- `to` — Target currency.

**Returns:** The conversion ratio as a plain number.

#### `createProvider(config)`

Creates an ECB FX-rates provider.

```typescript
function createProvider(config?: EcbFxRatesConfig): FxRatesProvider
```

- `config` — Provider configuration. All fields are optional.

**Returns:** An {@link FxRatesProvider} backed by the ECB reference-rate feeds.

#### `parseEcbXml(xml)`

Parses the body of an ECB XML feed (daily or historical) into an array of
snapshots, sorted newest-first.

```typescript
function parseEcbXml(xml: string): EcbDailySnapshot[]
```

- `xml` — Raw XML body fetched from the ECB endpoint.

**Returns:** Snapshots sorted newest-first.

### Constants

#### `provider`

Default ECB FX-rates provider, lazily constructed on first access.

Reads the optional `ECB_FX_BASE_URL` environment variable to override the
endpoint base URL (e.g. for a local mirror in tests). The public ECB
endpoints require no key.

```typescript
const provider: FxRatesProvider
```

## Core Interface
Implements `@molecule/api-fx-rates` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-fx-rates'
import { provider } from '@molecule/api-fx-rates-ecb'

export function setupFxRatesEcb(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-fx-rates` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-fx-rates`
- `fast-xml-parser`
