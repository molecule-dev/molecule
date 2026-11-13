/**
 * Binding-case fakes for one area: device, platform, push, version, workspace, editor, preview and AI-model providers for the native and IDE hooks.
 *
 * A case seeds this area through `context.areas.native`; `control` steps call
 * the controls registered here (named `native.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call.
 *
 * @module
 */

import type { AreaFakesFactory } from '../spec.js'

/** What a case can seed for this area (`context.areas.native`). */
export interface NativeSeed {
  /** Reserved; this area seeds nothing yet. */
  readonly _?: never
}

/**
 * Builds this area's fakes for one case.
 *
 * @param _context - The case context (`context.areas?.native` is this area's seed).
 * @param _record - Receives every call a hook makes on this area's fakes.
 * @returns The area's services, controls, listener counts and cleanup.
 */
export const createNativeFakes: AreaFakesFactory = (_context, _record) => ({})
