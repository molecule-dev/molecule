/**
 * The one report for ChatPanel behaviour a port unit has not landed yet.
 *
 * The ChatPanel port is split by unit (see the ChatPanel port plan): the
 * skeleton creates every slice and section, and a stub stands in until the unit
 * that owns it fills it in. A stubbed ACTION reports through here, so a run that
 * reaches unported behaviour says which slice and function it reached instead of
 * failing silently. The final unit greps this module name out.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

const logger = getLogger('chat-panel')

/**
 * Reports one unported ChatPanel behaviour — a warning naming the slice
 * function, so a test or a run shows exactly where the port stops.
 *
 * @param what - The slice and function, e.g. `git.handleCommit`.
 */
export function notPorted(what: string): void {
  logger.warn(`${what} is not ported yet`)
}
