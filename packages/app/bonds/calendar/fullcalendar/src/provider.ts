/**
 * Fullcalendar implementation of CalendarProvider.
 *
 * @module
 */

import type { FullcalendarConfig } from './types.js'

/**
 *
 */
export class FullcalendarCalendarProvider {
  readonly name = 'fullcalendar'

  constructor(private config: FullcalendarConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: FullcalendarConfig): FullcalendarCalendarProvider {
  return new FullcalendarCalendarProvider(config)
}
