/**
 * Console activity sink for molecule.dev.
 *
 * Logs each captured {@link ActivityEvent} via `@molecule/api-logger`. This is
 * the default/fallback sink for standalone scaffolded apps that run without a
 * molecule.dev IDE — the capture still works locally, it is just logged to the
 * console rather than streamed to an Activity panel.
 *
 * @module
 */

import type { ActivityEvent, ActivitySink } from '@molecule/api-activity'
import { logger } from '@molecule/api-logger'

/**
 * Creates a console activity sink that logs each event via the bonded logger.
 *
 * @returns An {@link ActivitySink} that logs events and never throws.
 */
export function createConsoleSink(): ActivitySink {
  return {
    async record(event: ActivityEvent): Promise<void> {
      logger.info(
        `[activity] ${event.type} ${event.status}` +
          (event.recipient ? ` → ${event.recipient}` : '') +
          (event.summary ? `: ${event.summary}` : ''),
        event,
      )
    },
  }
}

/** Default console activity sink instance. */
export const provider: ActivitySink = createConsoleSink()
