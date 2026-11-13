/**
 * Binding-case fakes for one area: HTTP lanes, promises and the forms bond for the async hooks (useHttp, useGet…useDelete, usePromise, useAsyncState, useOptimisticValue, useForm, useWatch, useFieldState).
 *
 * A case seeds this area through `context.areas.async`; `control` steps call
 * the controls registered here (named `async.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call.
 *
 * @module
 */

import type { AreaFakesFactory } from '../spec.js'

/** What a case can seed for this area (`context.areas.async`). */
export interface AsyncSeed {
  /** Reserved; this area seeds nothing yet. */
  readonly _?: never
}

/**
 * Builds this area's fakes for one case.
 *
 * @param _context - The case context (`context.areas?.async` is this area's seed).
 * @param _record - Receives every call a hook makes on this area's fakes.
 * @returns The area's services, controls, listener counts and cleanup.
 */
export const createAsyncFakes: AreaFakesFactory = (_context, _record) => ({})
