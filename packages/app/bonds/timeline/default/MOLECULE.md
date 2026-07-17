# @molecule/app-timeline-default

Default provider for `@molecule/app-timeline`.

Provides an in-memory timeline implementation with sorting
and item management.

## Quick Start

```typescript
import { provider } from '@molecule/app-timeline-default'
import { setProvider } from '@molecule/app-timeline'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-timeline-default @molecule/app-timeline
```

## API

### Interfaces

#### `DefaultTimelineConfig`

Provider-specific configuration options.

```typescript
interface DefaultTimelineConfig {
  /** Whether to sort items by date. Defaults to `true`. */
  sortByDate?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a default timeline provider.

```typescript
function createProvider(config?: DefaultTimelineConfig): TimelineProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured TimelineProvider.

### Constants

#### `provider`

Default timeline provider instance.

```typescript
const provider: TimelineProvider
```

## Core Interface
Implements `@molecule/app-timeline` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-timeline'
import { provider } from '@molecule/app-timeline-default'

export function setupTimelineDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-timeline` ^1.0.0

### Runtime Dependencies

- `@molecule/app-timeline`

## E2E Tests

Integration checklist — drive the real timeline UI (live preview, no mocks),
adapt each item to this app's actual timeline/activity screens, and check
every box off one by one. A box you can't check is an integration bug to fix
— not a skip:
- [ ] The timeline renders its entries in the correct chronological order per
  the app's config (newest-first or oldest-first) — the on-screen order
  matches the item `date` timestamps, NOT insertion order (`getItems()`
  preserves insertion order; the app sorts by `date` for display).
- [ ] Each rendered entry shows its real data: the locale-formatted `date`
  (never a raw `Date` string), the `title`, and — when set — the
  `description`, `icon`, and dot/marker `color`.
- [ ] With `alternate` on, consecutive entries sit on opposite sides of the
  rail; with it off, every entry sits on the same side.
- [ ] Clicking an entry fires `onItemClick` with THAT item — the wired action
  (navigate/expand/select) happens for the clicked entry, not a neighbour.
- [ ] If the app groups entries (by day or type), each entry sits under the
  correct group header, and an entry dated in a different bucket renders under
  the right header.
- [ ] `addItem()` makes the new event appear in its correct position by `date`
  timestamp (not merely appended last), and `removeItem(id)` removes exactly
  that one entry.
- [ ] If the app loads older entries (load-more/pagination), they append via
  `setItems` with no duplication — every rendered `id` stays unique.
- [ ] An empty timeline (no items) renders a defined empty state, not a
  blank/broken layout; adding the first item replaces the empty state with the
  entry.
