/**
 * Binding-case fakes for one area: the chat provider and its streams for useChat and useChatProvider.
 *
 * A case seeds this area through `context.areas.chat`; `control` steps call
 * the controls registered here (named `chat.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call.
 *
 * @module
 */

import type { AreaFakesFactory } from '../spec.js'

/** What a case can seed for this area (`context.areas.chat`). */
export interface ChatSeed {
  /** Reserved; this area seeds nothing yet. */
  readonly _?: never
}

/**
 * Builds this area's fakes for one case.
 *
 * @param _context - The case context (`context.areas?.chat` is this area's seed).
 * @param _record - Receives every call a hook makes on this area's fakes.
 * @returns The area's services, controls, listener counts and cleanup.
 */
export const createChatFakes: AreaFakesFactory = (_context, _record) => ({})
