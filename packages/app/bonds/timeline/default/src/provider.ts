/**
 * Default timeline provider implementation.
 *
 * @module
 */

import type {
  TimelineInstance,
  TimelineItem,
  TimelineOptions,
  TimelineProvider,
} from '@molecule/app-timeline'

import type { DefaultTimelineConfig } from './types.js'

/**
 * Creates a default timeline provider.
 *
 * @param config - Optional provider configuration.
 * @returns A configured TimelineProvider.
 */
export function createProvider(config?: DefaultTimelineConfig): TimelineProvider {
  const sortByDate = config?.sortByDate ?? true

  return {
    name: 'default',

    createTimeline(options: TimelineOptions): TimelineInstance {
      let items = [...options.items]

      if (sortByDate) {
        items.sort((a, b) => a.date.getTime() - b.date.getTime())
      }

      return {
        setItems(newItems: TimelineItem[]): void {
          items = sortByDate
            ? [...newItems].sort((a, b) => a.date.getTime() - b.date.getTime())
            : [...newItems]
        },

        addItem(item: TimelineItem): void {
          items.push(item)
          if (sortByDate) {
            items.sort((a, b) => a.date.getTime() - b.date.getTime())
          }
        },

        removeItem(id: string): boolean {
          const index = items.findIndex((item) => item.id === id)
          if (index === -1) return false
          items.splice(index, 1)
          return true
        },

        getItems(): TimelineItem[] {
          return [...items]
        },

        destroy(): void {
          items = []
        },
      }
    },
  }
}

/** Default timeline provider instance. */
export const provider: TimelineProvider = createProvider()
