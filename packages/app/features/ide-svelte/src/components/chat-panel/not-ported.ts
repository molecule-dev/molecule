/**
 * The skeleton's one reporting channel: every slice, effect or section the
 * ChatPanel port has not reached yet calls {@link notPorted} from the action
 * React performs, so a run that touches unported behaviour warns instead of
 * silently doing nothing.
 *
 * The final port grep is empty — every call disappears as its unit lands. The
 * call sites are the ledger's actions (`<slice>.<fn>`), never view code, so the
 * log names the React concern the caller was in.
 *
 * Each action reports once per process: the panel mounts in every conformance
 * case, and repeating the same warning hundreds of times hides the ones that
 * matter.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

/** The package logger (the same channel the rest of the package logs on). */
const logger = getLogger('chat-panel')

/** The actions already reported, so one skeleton gap warns once. */
const reported = new Set<string>()

/**
 * Reports an unported React action. A warning, not an error: the skeleton is
 * expected to be incomplete until every unit lands, and a case that exercises
 * the action fails on its own DOM or request comparison rather than here.
 *
 * @param action - The React action, as `<slice>.<fn>` (e.g. `submit.handleSubmit`).
 */
export function notPorted(action: string): void {
  if (reported.has(action)) return
  reported.add(action)
  logger.warn(`chat-panel: not ported yet — ${action}`)
}
