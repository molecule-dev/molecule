# @molecule/app-countdown-react

Time-remaining countdown.

Exports:
- `useCountdown(target, tickMs?)` — live state hook.
- `<Countdown>` — display component with compact/long/colon formats and custom render.

## Quick Start

```tsx
import { Countdown } from '@molecule/app-countdown-react'

// Compact default: "3d 4h 12m 5s"
<Countdown target="2026-12-31T23:59:59Z" expired={<span>Sale ended!</span>} />

// Colon format: "03:04:12:05"
<Countdown target={new Date('2026-12-31')} format="colon" />

// Long format: "3 days 4 hours 12 minutes 5 seconds"
<Countdown target={Date.now() + 3_600_000} format="long" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-countdown-react
```

## API

### Interfaces

#### `CountdownState`

```typescript
interface CountdownState {
  /** Days remaining. */
  days: number
  /** Hours (0-23) within current day. */
  hours: number
  /** Minutes (0-59) within current hour. */
  minutes: number
  /** Seconds (0-59) within current minute. */
  seconds: number
  /** Total milliseconds remaining (negative if past). */
  msRemaining: number
  /** True once `target` is in the past. */
  expired: boolean
}
```

### Functions

#### `useCountdown(target, tickMs)`

Live-updating countdown to a target date.

```typescript
function useCountdown(target: string | number | Date, tickMs?: number): CountdownState
```

- `target` — Date / ISO string / epoch ms.
- `tickMs` — Refresh interval. Defaults to 1000.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
