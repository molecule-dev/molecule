/**
 * Voice engine catalog — lets an app register the dictation engines it can
 * offer (the browser's native service, on-device models of different sizes
 * and accuracy) so a UI can present the choice to the user, and wires the
 * chosen engine's provider.
 *
 * Register the catalog once at startup with `registerVoiceEngines()`; a
 * picker reads it via `listVoiceEngines()` and applies the user's choice
 * with `selectVoiceEngine(id)` (which bonds the engine's provider).
 *
 * @module
 */

import { setProvider } from './provider.js'
import type { AIVoiceProvider } from './types.js'

/**
 * A dictation engine option an app can offer its users.
 */
export interface VoiceEngineDef {
  /** Stable engine id (persisted as the user's choice). */
  id: string
  /** Display name (e.g. 'Moonshine', 'Parakeet'). */
  label: string
  /**
   * How the engine runs: 'native' uses the browser's built-in speech
   * service; 'on-device' runs a local model in the page (no audio leaves
   * the device in either case, but 'native' availability depends on the
   * browser shipping a speech backend).
   */
  kind: 'native' | 'on-device'
  /**
   * Approximate one-time model download in MB (a [min, max] range when it
   * depends on the device). Omit when nothing is downloaded.
   */
  downloadMB?: number | readonly [number, number]
  /** Relative transcription accuracy: 1 = basic, 2 = good, 3 = best. */
  accuracy: 1 | 2 | 3
  /**
   * Language coverage: 'all', or the ISO 639-1 codes the engine can
   * transcribe (e.g. ['en']).
   */
  languages: 'all' | readonly string[]
  /** Creates the engine's provider (called when the engine is selected). */
  create: () => AIVoiceProvider
}

let engines: readonly VoiceEngineDef[] = []
let selectedId: string | null = null

/**
 * Registers the app's dictation engine catalog (replaces any previous one).
 * @param defs - The engines to offer, in display order.
 */
export function registerVoiceEngines(defs: readonly VoiceEngineDef[]): void {
  engines = defs
}

/**
 * Returns the registered dictation engine catalog (empty when the app
 * offers no choice).
 * @returns The engines in display order.
 */
export function listVoiceEngines(): readonly VoiceEngineDef[] {
  return engines
}

/**
 * Selects an engine by id: bonds its provider (via `setProvider`) and
 * remembers the selection.
 * @param id - The engine id to select.
 * @returns The selected engine, or null when the id is not registered.
 */
export function selectVoiceEngine(id: string): VoiceEngineDef | null {
  const def = engines.find((e) => e.id === id) ?? null
  if (!def) return null
  selectedId = id
  setProvider(def.create())
  return def
}

/**
 * Returns the currently selected engine id, or null when none was selected.
 * @returns The selected engine id.
 */
export function getSelectedVoiceEngineId(): string | null {
  return selectedId
}

/**
 * Checks whether an engine covers a BCP-47 language tag.
 * @param def - The engine to check.
 * @param language - BCP-47 tag (e.g. 'en-US').
 * @returns True when the engine can transcribe the language.
 */
export function voiceEngineCoversLanguage(def: VoiceEngineDef, language: string): boolean {
  if (def.languages === 'all') return true
  return def.languages.includes(language.split('-')[0].toLowerCase())
}
