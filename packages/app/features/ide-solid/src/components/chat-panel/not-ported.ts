/**
 * The skeleton's "not ported yet" marker.
 *
 * Every slice action and section the Solid port has not filled in yet calls
 * {@link notPorted} once, so a run names exactly what the port still owes. The
 * final ChatPanel unit greps for this helper and fails while it occurs; a
 * ported slice never calls it. The message goes through the panel's logger
 * (React logs through the same `chat-panel` namespace), so it is a warning,
 * never an error.
 *
 * @module
 */

import { onMount } from 'solid-js'

import { getLogger } from '@molecule/app-logger'

/** The chat panel's logger. */
const logger = getLogger('chat-panel')

/**
 * Reports that one slice action or section is still a stub.
 * @param name - What is missing, e.g. `composer.effects.1` or `section:input-area`.
 */
export function notPorted(name: string): void {
  logger.warn(`chat-panel: not ported to Solid yet: ${name}`)
}

/**
 * Registers a slice's effect at its ledger position and reports it as a stub.
 *
 * The call itself is the registration: a slice receives `effects[n]()` from
 * `ChatInner` at React's `#effect` position, and this stand-in registers one
 * mount-time effect there so the ordering the port must keep stays observable
 * until the slice's real effect replaces it.
 *
 * @param name - The effect's ledger name, e.g. `context-usage.effects.1`.
 */
export function notPortedEffect(name: string): void {
  onMount(() => notPorted(name))
}
