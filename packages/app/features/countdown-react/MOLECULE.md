# @molecule/app-countdown-react

Time-remaining countdown.

Exports:
- `useCountdown(target, tickMs?)` — live state hook.
- `<Countdown>` — display component with compact/long/colon formats and custom render.

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
