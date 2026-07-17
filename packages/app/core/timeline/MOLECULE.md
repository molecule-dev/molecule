# @molecule/app-timeline

Timeline core interface for molecule.dev.

Provides a standardized API for rendering timeline and activity log
UI components. Bond a provider (e.g. `@molecule/app-timeline-default`)
to supply the concrete implementation.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-timeline'
import { provider } from '@molecule/app-timeline-default'

setProvider(provider) // once, at startup (bonds.ts)

const timeline = requireProvider().createTimeline({
  items: [{ id: '1', date: new Date(), title: 'Created project' }],
})
timeline.addItem({ id: '2', date: new Date(), title: 'Invited teammate' })
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-timeline @molecule/app-bond
```

## API

### Interfaces

#### `TimelineInstance`

A live timeline instance returned by the provider.

```typescript
interface TimelineInstance {
  /**
   * Updates the timeline items.
   *
   * @param items - The new set of timeline items.
   */
  setItems(items: TimelineItem[]): void

  /**
   * Appends a single item to the timeline.
   *
   * @param item - The item to add.
   */
  addItem(item: TimelineItem): void

  /**
   * Removes an item by its ID.
   *
   * @param id - The ID of the item to remove.
   * @returns `true` if the item was found and removed.
   */
  removeItem(id: string): boolean

  /**
   * Returns all current timeline items.
   *
   * @returns Array of timeline items.
   */
  getItems(): TimelineItem[]

  /**
   * Destroys the timeline instance and cleans up resources.
   */
  destroy(): void
}
```

#### `TimelineItem`

A single item in a timeline.

```typescript
interface TimelineItem {
  /** Unique identifier for the item. */
  id: string

  /** Date/time the event occurred. */
  date: Date

  /** Title of the timeline entry. */
  title: string

  /** Optional description or body text. */
  description?: string

  /** Optional icon identifier. */
  icon?: string

  /** Optional color for the timeline dot/marker. */
  color?: string

  /** Arbitrary metadata attached to the item. */
  metadata?: Record<string, unknown>
}
```

#### `TimelineOptions`

Configuration options for creating a timeline.

```typescript
interface TimelineOptions {
  /** Items to display in the timeline. */
  items: TimelineItem[]

  /** Whether to alternate items on opposite sides. Defaults to `false`. */
  alternate?: boolean

  /** Callback when a timeline item is clicked. */
  onItemClick?: (item: TimelineItem) => void
}
```

#### `TimelineProvider`

Timeline provider interface.

All timeline providers must implement this interface to create
and manage timeline / activity log UI.

```typescript
interface TimelineProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new timeline instance.
   *
   * @param options - Configuration for the timeline.
   * @returns A timeline instance for managing the timeline.
   */
  createTimeline(options: TimelineOptions): TimelineInstance
}
```

### Functions

#### `getProvider()`

Retrieves the bonded timeline provider, or `null` if none is bonded.

```typescript
function getProvider(): TimelineProvider | null
```

**Returns:** The active timeline provider, or `null`.

#### `hasProvider()`

Checks whether a timeline provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a timeline provider is available.

#### `requireProvider()`

Retrieves the bonded timeline provider, throwing if none is configured.

```typescript
function requireProvider(): TimelineProvider
```

**Returns:** The active timeline provider.

#### `setProvider(provider)`

Registers a timeline provider as the active singleton.

```typescript
function setProvider(provider: TimelineProvider): void
```

- `provider` — The timeline provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Timeline | `@molecule/app-timeline-default` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **The instance is HEADLESS state, not UI.** `createTimeline` returns item
  management (`setItems`/`addItem`/`removeItem`/`getItems`) — nothing appears
  on screen. The app renders the entries itself, styling via `getClassMap()`
  from `@molecule/app-ui` and putting every label through
  `t('key', values, { defaultValue })`.
- **Wire it with THIS package's `setProvider()` or `bond('timeline', …)`.**
  `setProvider()` delegates into the shared `@molecule/app-bond` registry, so
  both write the same slot; {@link requireProvider} throws until one has run.
- `TimelineItem.date` is a `Date` — format it for display with the app's
  locale-aware formatting, never a hardcoded locale string.
- Call `destroy()` when the owning screen unmounts.

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
