/**
 * Binding-case fakes for one area: state stores, storage preferences and loggers for the core service hooks (i18n, theme, router, store, storage, logger).
 *
 * A case seeds this area through `context.areas.core`; `control` steps call
 * the controls registered here (named `core.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call.
 *
 * @module
 */

import type { AreaFakesFactory } from '../spec.js'

/** What a case can seed for this area (`context.areas.core`). */
export interface CoreSeed {
  /** Reserved; this area seeds nothing yet. */
  readonly _?: never
}

/**
 * Builds this area's fakes for one case.
 *
 * @param _context - The case context (`context.areas?.core` is this area's seed).
 * @param _record - Receives every call a hook makes on this area's fakes.
 * @returns The area's services, controls, listener counts and cleanup.
 */
export const createCoreFakes: AreaFakesFactory = (_context, _record) => ({})
