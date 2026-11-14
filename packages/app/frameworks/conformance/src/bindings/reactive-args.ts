/**
 * Reactive arguments for the framework adapters: one source per argument
 * position, set in place when a case changes the hook's arguments.
 *
 * @module
 */

import type { MountOptions } from './spec.js'

/**
 * The reactive sources a `reactiveArgs` mount passes as the hook's arguments:
 * one per position up to the case's arity, each holding that position's value
 * (`undefined` past the end of `args`).
 *
 * @param hook - The hook's export name (for the error).
 * @param args - The arguments the host mounts with.
 * @param options - The mount options.
 * @param create - Builds the framework's reactive source for one value.
 * @returns The sources, or `null` when the mount is not `reactiveArgs`.
 * @throws {Error} When a position holds a function: Vue and Solid read a function as a
 *   getter, so a reactive argument has to be a value.
 */
export function reactiveSources<Source>(
  hook: string,
  args: unknown[],
  options: MountOptions,
  create: (value: unknown) => Source,
): Source[] | null {
  if (!options.reactiveArgs) return null
  const values = Array.from(
    { length: Math.max(options.arity ?? 0, args.length) },
    (_, i) => args[i],
  )
  const fn = values.findIndex((value) => typeof value === 'function')
  if (fn >= 0) {
    throw new Error(
      `conformance: ${hook}'s argument ${fn} is a function; a reactiveArgs family passes values ` +
        '(a reactive source of a function reads as a getter in Vue and Solid)',
    )
  }
  return values.map(create)
}

/**
 * The sources an `args` step sets.
 *
 * @param hook - The hook's export name (for the error).
 * @param sources - What {@link reactiveSources} returned for the mount.
 * @returns The sources.
 * @throws {Error} When the mount is not `reactiveArgs`: a hook whose arguments change
 *   follows them on the same mount and is never re-mounted, so its family must say so.
 */
export function requireSources<Source>(hook: string, sources: Source[] | null): Source[] {
  if (!sources) {
    throw new Error(
      `conformance: a case changes ${hook}'s arguments, so its family must set reactiveArgs ` +
        '(the hook follows its new arguments on the same mount)',
    )
  }
  return sources
}
