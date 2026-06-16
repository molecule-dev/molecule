/**
 * Pure helpers backing the `/effort <S|M|L|XL>` command and its `/effort ?`
 * status view.
 *
 * The effort level is persisted in project settings (`settings.effortLevel`) and
 * applied at chat-call time by the backend to the active provider's
 * reasoning/budget param when the provider supports one (and to the agent-loop
 * budget regardless). These helpers parse the command, validate levels, and
 * report which catalog models actually expose a configurable reasoning budget so
 * the `?` view can show where the setting has the most effect.
 *
 * Deterministic and side-effect free — unit testable without rendering or a
 * backend. User-facing prose lives in the component via `t()`; the level labels
 * here are English defaults the component wraps at render.
 *
 * @module
 */

import type { AppModelDefinition } from '@molecule/app-ai-models'

/** Effort levels, smallest to largest. */
export type EffortLevel = 'S' | 'M' | 'L' | 'XL'

/** All effort levels in ascending order. */
export const EFFORT_LEVELS: readonly EffortLevel[] = ['S', 'M', 'L', 'XL'] as const

/** Default effort level when none is persisted. */
export const DEFAULT_EFFORT_LEVEL: EffortLevel = 'M'

/** Short English labels for each level (the component wraps these in `t()`). */
export const EFFORT_LEVEL_LABELS: Record<EffortLevel, string> = {
  S: 'Minimal',
  M: 'Balanced',
  L: 'High',
  XL: 'Maximum',
}

/**
 * The parsed result of an `/effort` command:
 *
 * - `set` — apply a valid level.
 * - `query` — show the current level + supported models (`/effort` or `/effort ?`).
 * - `invalid` — an unrecognized argument was given (the caller shows usage).
 */
export type EffortCommand =
  | { kind: 'set'; level: EffortLevel }
  | { kind: 'query' }
  | { kind: 'invalid'; arg: string }

/**
 * Type guard for a valid {@link EffortLevel} (case-insensitive callers should
 * upper-case first).
 *
 * @param value - The candidate value.
 * @returns `true` when `value` is one of `S`, `M`, `L`, `XL`.
 */
export function isEffortLevel(value: string): value is EffortLevel {
  return (EFFORT_LEVELS as readonly string[]).includes(value)
}

/**
 * Parses an `/effort [arg]` command. `/effort` with no argument and `/effort ?`
 * both request the status view; a valid level (any case) sets it; anything else
 * is reported as invalid. Returns `null` when the input is not the command.
 *
 * @param input - The raw chat input.
 * @returns The parsed {@link EffortCommand}, or `null`.
 */
export function parseEffortCommand(input: string): EffortCommand | null {
  const match = input.trim().match(/^\/effort(?:\s+(.*))?$/i)
  if (!match) return null
  const arg = (match[1] ?? '').trim()
  if (arg === '' || arg === '?') return { kind: 'query' }
  const upper = arg.toUpperCase()
  if (isEffortLevel(upper)) return { kind: 'set', level: upper }
  return { kind: 'invalid', arg }
}

/**
 * The catalog models that expose a *configurable* reasoning/thinking budget —
 * i.e. those where the effort level maps onto a provider reasoning param. Models
 * with no configurable budget still get the agent-loop budget applied by the
 * backend, but these are the ones the `?` view highlights.
 *
 * @param models - The available models from the catalog.
 * @returns The models supporting a configurable reasoning budget, in input order.
 */
export function modelsSupportingEffort(
  models: readonly AppModelDefinition[],
): AppModelDefinition[] {
  return models.filter((m) => m.supportsThinking && m.thinkingConfigurable)
}

/**
 * The effort levels the `/effort` command should offer and accept for a *specific*
 * model. Different models support different reasoning levels (e.g. a fully
 * configurable model exposes the whole `S | M | L | XL` scale, while a
 * fixed-reasoning model like `grok-code-fast-1` exposes only the default `M`), so
 * the command must surface and validate only what the active model actually
 * supports.
 *
 * Reads the model's catalog-declared {@link AppModelDefinition.supportedEffortLevels}.
 * Falls back to the full {@link EFFORT_LEVELS} scale when the field is absent
 * (back-compat) or empty, or when the model is unknown (`undefined`) — so a
 * missing/unpriced model never silently forbids every level.
 *
 * @param model - The active model to read supported levels from, or `undefined`.
 * @returns The supported effort levels in ascending order (the full scale when none are declared).
 */
export function effortLevelsForModel(
  model: AppModelDefinition | undefined,
): readonly EffortLevel[] {
  const levels = model?.supportedEffortLevels
  return levels && levels.length > 0 ? levels : EFFORT_LEVELS
}
