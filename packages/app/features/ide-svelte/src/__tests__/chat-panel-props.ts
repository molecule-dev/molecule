/**
 * The live props of the one panel a chat-panel test mounts.
 *
 * Svelte components take their props from the parent at render, so a test that
 * changes a prop mid-test (a bumped `gitStatusTick`, a dispatched
 * `pendingMessageKey`) drives it through this store: the test host spreads it
 * into `<ChatPanel>`, the same way React's `rerender` hands the panel a new
 * props object.
 *
 * @module
 */

import { writable } from 'svelte/store'

import type { ChatPanelProps } from '../types.js'

/** The mounted panel's props (the test mutates them through {@link setPanelProps}). */
export const panelOverrides = writable<ChatPanelProps>({ projectId: 'proj-test' })

/**
 * Applies a partial props change to the mounted panel.
 *
 * @param next - The props to change.
 */
export function setPanelProps(next: Partial<ChatPanelProps>): void {
  panelOverrides.update((current) => ({ ...current, ...next }))
}

/**
 * Replaces the mounted panel's props wholesale.
 *
 * @param next - The full props object.
 */
export function resetPanelProps(next: ChatPanelProps): void {
  panelOverrides.set(next)
}
