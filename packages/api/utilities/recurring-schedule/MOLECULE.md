# @molecule/api-recurring-schedule

RRULE-style schedule engine for molecule.dev.

Pure-function next-occurrence and expand-occurrences-in-window helpers
for recurring events: daily/weekly/monthly/yearly with `interval`,
`byDay` (weekday filter), `byMonthDay` (incl. negative = "from end"),
`byMonth`, and termination via `count` or `until`.

All math is performed in UTC so DST transitions in the host's local
zone never shift occurrences by an hour. Wall-clock-of-day from the
seed `startDate` is preserved across every emitted occurrence.

Designed for personal-finance recurring transactions, meeting
scheduler, medication reminders, habit trackers, productivity
recurring tasks, and other apps that need to project a rule forward
without persisting state.

## Quick Start

```typescript
import { expandOccurrences, nextOccurrence } from '@molecule/api-recurring-schedule'

const rule = {
  frequency: 'WEEKLY' as const,
  startDate: '2026-01-05T09:00:00.000Z', // a Monday
  byDay: ['MO', 'WE', 'FR'],
  count: 6,
}

nextOccurrence(rule, '2026-01-06T00:00:00.000Z')
// → '2026-01-07T09:00:00.000Z' (Wednesday)

expandOccurrences(rule, {
  start: '2026-01-01T00:00:00.000Z',
  end: '2026-02-01T00:00:00.000Z',
})
// → six ISO strings: Mon/Wed/Fri across two weeks
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-recurring-schedule
```

## API

### Interfaces

#### `OccurrenceOptions`

Options passed to occurrence generators.

```typescript
interface OccurrenceOptions {
  /**
   * Hard cap on the number of occurrences returned. Defends against
   * pathological rules. Default: 1000.
   */
  maxOccurrences?: number
}
```

#### `OccurrenceWindow`

A half-open `[start, end)` window of ISO 8601 date-time strings used by
`expandOccurrences`.

```typescript
interface OccurrenceWindow {
  /** Inclusive lower bound (ISO 8601). */
  start: string
  /** Exclusive upper bound (ISO 8601). */
  end: string
}
```

#### `RecurrenceRule`

A recurrence rule describing a repeating event.

Modeled after iCalendar RRULE (RFC 5545) but simplified to the subset
needed by personal-finance, meeting-scheduler, medication-reminder,
habit-tracker, and productivity recurring-task apps.

```typescript
interface RecurrenceRule {
  /** Repetition frequency. */
  frequency: Frequency

  /** ISO 8601 date-time string (UTC or with offset) — the seed occurrence. */
  startDate: string

  /**
   * Repeat every `interval` units of `frequency`. Default: 1.
   * e.g. frequency=WEEKLY, interval=2 ⇒ every two weeks.
   */
  interval?: number

  /**
   * For WEEKLY: which days of the week. e.g. `['MO','WE','FR']`.
   * For MONTHLY/YEARLY: positive nth-of-month not yet supported here;
   * combine with `byMonthDay` for nth-day-of-month.
   * Ignored for DAILY.
   */
  byDay?: Weekday[]

  /**
   * For MONTHLY/YEARLY: day-of-month numbers (1..31). Negative values
   * count from the end of the month (-1 = last day). Out-of-range days
   * for shorter months are skipped (e.g. `byMonthDay: [31]` skips Feb).
   */
  byMonthDay?: number[]

  /**
   * For YEARLY: month numbers (1..12). When omitted, the start date's
   * month is used.
   */
  byMonth?: number[]

  /**
   * Maximum total occurrences (counting `startDate` as occurrence #1).
   * When omitted, the rule is unbounded (or bounded only by `until`).
   */
  count?: number

  /**
   * Inclusive upper bound. ISO 8601 string. When set, no occurrence is
   * generated after this instant.
   */
  until?: string
}
```

### Types

#### `Frequency`

RRULE frequency. Maps to the iCalendar RFC 5545 FREQ values.

```typescript
type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
```

#### `Weekday`

Day-of-week codes used by `byDay`. Two-letter iCalendar codes:
MO=Mon, TU=Tue, WE=Wed, TH=Thu, FR=Fri, SA=Sat, SU=Sun.

```typescript
type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'
```

### Functions

#### `expandOccurrences(rule, window, options)`

Expands a rule into all occurrences that fall inside the half-open
window `[window.start, window.end)`.

```typescript
function expandOccurrences(rule: RecurrenceRule, window: OccurrenceWindow, options?: OccurrenceOptions): string[]
```

- `rule` — The recurrence rule.
- `window` — Inclusive-start, exclusive-end ISO date-time bounds.
- `options` — Optional generator caps.

**Returns:** Array of ISO 8601 date-time strings (chronological).

#### `nextOccurrence(rule, after, options)`

Returns the next occurrence at or after `after`, or `null` if the rule
has terminated (via `count`/`until`) before then.

The seed `startDate` itself counts as the first occurrence.

```typescript
function nextOccurrence(rule: RecurrenceRule, after?: string | Date, options?: OccurrenceOptions): string | null
```

- `rule` — The recurrence rule.
- `after` — Lower bound (inclusive) as ISO string or `Date`.
- `options` — Optional generator caps.

**Returns:** ISO 8601 date-time string of the next occurrence, or `null`.

#### `validateRule(rule)`

Validates a recurrence rule. Throws `Error` on malformed rules.

```typescript
function validateRule(rule: RecurrenceRule): void
```

- `rule` — The rule to validate.
