/**
 * Captures the settings-panel context a consumer component reads, so the
 * container tests can assert the context value's identity across a prop
 * update (Svelte has no component re-render to count).
 *
 * @module
 */

import type { SettingsPanelContextValue } from '../context.js'

/** The context value the consumer component most recently received. */
export const captured: { context?: SettingsPanelContextValue } = {}

/** Clears the capture between tests. */
export function resetCaptured(): void {
  captured.context = undefined
}
