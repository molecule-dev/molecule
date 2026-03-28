# @molecule/app-timeline

Timeline core interface for molecule.dev.

Provides a standardized API for rendering timeline and activity log
UI components. Bond a provider (e.g. `@molecule/app-timeline-default`)
to supply the concrete implementation.

## Type
`core`

## Installation
```bash
npm install @molecule/app-timeline
```

## Usage

```typescript
import { requireProvider } from '@molecule/app-timeline'

const timeline = requireProvider().createTimeline({
  items: [{ id: '1', date: new Date(), title: 'Created project' }],
  orientation: 'vertical',
})
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

  /** Layout orientation. Defaults to `'vertical'`. */
  orientation?: 'vertical' | 'horizontal'

  /** Whether to alternate items on opposite sides (vertical only). Defaults to `false`. */
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
