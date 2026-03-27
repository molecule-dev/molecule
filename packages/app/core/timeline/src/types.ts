/**
 * Timeline types for molecule.dev.
 *
 * Defines the provider interface and data types for rendering
 * timeline / activity log UI components.
 *
 * @module
 */

/**
 * A single item in a timeline.
 */
export interface TimelineItem {
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

/**
 * Configuration options for creating a timeline.
 */
export interface TimelineOptions {
  /** Items to display in the timeline. */
  items: TimelineItem[]

  /** Layout orientation. Defaults to `'vertical'`. */
  orientation?: 'vertical' | 'horizontal'

  /** Whether to alternate items on opposite sides (vertical only). Defaults to `false`. */
  alternate?: boolean

  /** Callback when a timeline item is clicked. */
  onItemClick?: (item: TimelineItem) => void
}

/**
 * A live timeline instance returned by the provider.
 */
export interface TimelineInstance {
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

/**
 * Timeline provider interface.
 *
 * All timeline providers must implement this interface to create
 * and manage timeline / activity log UI.
 */
export interface TimelineProvider {
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
