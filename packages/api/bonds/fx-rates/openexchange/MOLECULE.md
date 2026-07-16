# @molecule/api-fx-rates-openexchange

OpenExchangeRates FX-rates provider for molecule.dev.

Implements the {@link import('@molecule/api-fx-rates').FxRatesProvider}
interface against the JSON endpoints under
`https://openexchangerates.org/api/`. Free-tier accounts are locked to
`base=USD`, so cross-rate requests pivot through USD; paid plans
(`Developer`/`Enterprise`/`Unlimited`) may pass an arbitrary `base`.

Snapshots are cached in memory for a configurable TTL (default 1h) and,
when the `'cache'` bond is registered, written through to it as well.

The required `OPENEXCHANGE_APP_ID` env var (or `config.appId`) is never
echoed back into error messages.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-fx-rates'
import { provider } from '@molecule/api-fx-rates-openexchange'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-fx-rates-openexchange @molecule/api-bond @molecule/api-fx-rates @molecule/api-secrets
```

## API

### Interfaces

#### `OpenExchangeFxRatesConfig`

Configuration options for the OpenExchangeRates FX-rates provider.

The OpenExchangeRates API requires an `app_id` for every request. The
default singleton reads it from `OPENEXCHANGE_APP_ID`. Free-tier accounts
are locked to `base='USD'`; paid plans may override it.

```typescript
interface OpenExchangeFxRatesConfig {
  /**
   * OpenExchangeRates app ID. Required at request time. If omitted, the
   * provider falls back to `process.env['OPENEXCHANGE_APP_ID']`.
   */
  appId?: string

  /**
   * Pivot currency to request from the upstream. Free-tier accounts MUST
   * leave this as the default `'USD'`; paid plans may set any currency
   * that the upstream supports. Defaults to `'USD'`.
   */
  base?: CurrencyCode

  /**
   * Base URL override. Defaults to `'https://openexchangerates.org/api'`.
   */
  baseUrl?: string

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

#### `OpenExchangeSnapshot`

A single dated snapshot of pivot rates parsed from `latest.json` or
`historical/YYYY-MM-DD.json`. The pivot itself is included with rate `1`.

```typescript
interface OpenExchangeSnapshot {
  /**
   * The publication time of the snapshot (UTC).
   */
  asOf: Date

  /**
   * Pivot currency the snapshot is quoted against (e.g. `'USD'`).
   */
  base: CurrencyCode

  /**
   * Map from currency code to rate, where `1 base = rates[code] units of code`.
   * Always contains the `base` entry with rate `1`.
   */
  rates: Record<CurrencyCode, number>
}
```

### Functions

#### `computeRate(snapshot, from, to)`

Computes the conversion rate `1 unit of from = rate units of to` from a
pivot snapshot. Both sides may equal the pivot.

```typescript
function computeRate(snapshot: OpenExchangeSnapshot, from: string, to: string): number
```

- `snapshot` — The dated snapshot to read.
- `from` — Source currency.
- `to` — Target currency.

**Returns:** The conversion ratio as a plain number.

#### `createProvider(config)`

Creates an OpenExchangeRates FX-rates provider.

```typescript
function createProvider(config?: OpenExchangeFxRatesConfig): FxRatesProvider
```

- `config` — Provider configuration. `appId` may be omitted to fall

**Returns:** An {@link FxRatesProvider} backed by OpenExchangeRates.

#### `snapshotFromBody(body)`

Converts a {@link LatestResponseBody} into our normalised
{@link OpenExchangeSnapshot}, ensuring the pivot itself is present with
rate `1`.

```typescript
function snapshotFromBody(body: LatestResponseBody): OpenExchangeSnapshot
```

- `body` — Parsed JSON body.

**Returns:** Normalised snapshot.

### Constants

#### `fxRatesOpenexchangeSecretDefinitions`

Secret definitions required by the Open Exchange Rates FX-rates bond.

```typescript
const fxRatesOpenexchangeSecretDefinitions: SecretDefinition[]
```

#### `provider`

Default OpenExchangeRates FX-rates provider, lazily constructed on first
access.

Reads `OPENEXCHANGE_APP_ID` (required) and the optional
`OPENEXCHANGE_FX_BASE_URL` from the environment. The `app_id` value is
never echoed back in error messages.

```typescript
const provider: FxRatesProvider
```

## Core Interface
Implements `@molecule/api-fx-rates` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-fx-rates'
import { provider } from '@molecule/api-fx-rates-openexchange'

export function setupFxRatesOpenexchange(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-fx-rates` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `OPENEXCHANGE_APP_ID` *(required)* — Open Exchange Rates app ID
  - Setup: Sign up (free tier available) and copy your App ID.
  - Get it here: [https://openexchangerates.org/account/app-ids](https://openexchangerates.org/account/app-ids)

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-fx-rates`
- `@molecule/api-secrets`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual currency/pricing screens, and check every box
off one by one. This is money: a wrong rate silently corrupts every price, so
verify the NUMBERS the app computes, not just that a value rendered. A box
you can't check is an integration bug to fix — not a skip:
- [ ] A known pair returns a PLAUSIBLE rate: `getRate('USD', 'EUR')` yields a
  real ratio (roughly 0.8-1.0 for USD->EUR), never 0, null, NaN, negative, or
  an absurd value like 1e9 — and the UI shows it as an actual number.
- [ ] `convert` does the CORRECT MATH: converting 100 USD (amountMinor
  `10_000` cents) USD->EUR returns approximately `10_000 * rate` in the
  target's minor units, rounded sensibly for that currency (integer cents;
  JPY has 0 decimals), and the UI shows that converted amount — not the
  untouched original.
- [ ] Round-trip consistency: the inverse pair is reciprocal —
  `getRate('EUR', 'USD')` is approximately `1 / getRate('USD', 'EUR')` — and
  same-currency is identity: `getRate('USD', 'USD')` is exactly `1` and
  `convert(x, 'USD', 'USD')` returns `x` unchanged.
- [ ] Changing the selected pair changes the displayed result (USD->EUR vs
  USD->JPY give visibly different converted amounts) — the screen is not
  pinned to one hardcoded rate.
- [ ] An unknown/unsupported code (e.g. `'ZZZ'`, absent from
  `listSupportedCurrencies()`) surfaces a clear error in the UI — NEVER a
  silent rate of 0 (which zeroes the price) or a pass-through of 1.
- [ ] If a historical lookup is exposed (`options.asOf`), a past date returns
  that day's rate (different from latest for a volatile pair), not today's.
- [ ] A provider/network failure surfaces gracefully (a visible error or
  retry) and the amount is left unconverted — the app NEVER falls back to
  converting at rate 0 or 1, which would corrupt the price shown or charged.
- [ ] The provider API key stays server-side — fx-rates is server-only; the
  key never appears in the browser bundle, the network tab, or any client
  response.
