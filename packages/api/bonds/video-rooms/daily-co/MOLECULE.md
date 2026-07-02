# @molecule/api-video-rooms-daily-co

Daily.co video rooms provider for molecule.dev.

Implements the `@molecule/api-video-rooms` interface using the Daily.co
REST API.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-video-rooms'
import { createProvider } from '@molecule/api-video-rooms-daily-co'

// Bond at startup (reads DAILY_CO_API_KEY by default)
setProvider(createProvider())

// Or with explicit config
setProvider(createProvider({ apiKey: 'd0c...' }))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-video-rooms-daily-co
```

## API

### Interfaces

#### `DailyCoVideoRoomsConfig`

Configuration for the Daily.co video rooms provider.

```typescript
interface DailyCoVideoRoomsConfig {
  /** Daily.co API key. Defaults to `process.env.DAILY_CO_API_KEY`. */
  apiKey?: string

  /**
   * Override the Daily.co REST base URL. Useful for tests or self-hosted
   * proxies. Defaults to `https://api.daily.co/v1`.
   */
  baseUrl?: string

  /**
   * Optional `fetch` implementation. Defaults to the global `fetch` from
   * Node 20+. Tests may inject a mock here.
   */
  fetch?: typeof fetch
}
```

### Functions

#### `createProvider(config)`

Creates a Daily.co-backed {@link VideoRoomsProvider}.

```typescript
function createProvider(config?: DailyCoVideoRoomsConfig): VideoRoomsProvider
```

- `config` — Daily.co provider configuration. Falls back to the

**Returns:** A fully initialised `VideoRoomsProvider` backed by Daily.co.

## Core Interface
Implements `@molecule/api-video-rooms` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-video-rooms` 1.0.0

### Environment Variables

- `DAILY_CO_API_KEY` *(required)* — Daily.co API key
  - Setup: Copy the API key from the Daily dashboard → Developers.
  - Get it here: [https://dashboard.daily.co/developers](https://dashboard.daily.co/developers)
