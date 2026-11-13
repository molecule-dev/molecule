/**
 * Turns `{ $fn }` hook arguments into recorded functions, and a hook's result
 * into plain, comparable data.
 *
 * @module
 */

import type { CallbackResult } from '../ui/spec.js'
import type { CallRecorder } from '../ui/steps.js'
import type { FnArg, MountedHook, ResultShape } from './spec.js'

/**
 * What an adapter stores as the result when calling the hook threw (a hook used
 * without its provider). It snapshots as `{ $threw: <error name> }`: every
 * framework must throw where React throws, and only there. The message is not
 * compared, since it names each framework's own composition root.
 */
export class HookThrew {
  /**
   * Wraps the error the hook threw.
   *
   * @param error - The thrown value.
   */
  constructor(readonly error: unknown) {}
}

/**
 * Calls one binding export the way every adapter's host does: a function is
 * called with the arguments, a constant (`DEFAULT_AGENT_NAME`) is its own
 * result, and a throw becomes a {@link HookThrew}.
 *
 * @param target - The export.
 * @param args - The arguments.
 * @returns The result.
 */
export function callHook(target: unknown, args: unknown[]): unknown {
  if (typeof target !== 'function') return target
  try {
    return (target as (...a: unknown[]) => unknown)(...args)
  } catch (error) {
    return new HookThrew(error)
  }
}

/**
 * Whether a value is a `{ $fn }` argument marker.
 *
 * @param value - Any value.
 * @returns True for `{ $fn: string, … }` plain objects.
 */
export function isFnArg(value: unknown): value is FnArg {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype &&
    typeof (value as { $fn?: unknown }).$fn === 'string'
  )
}

/**
 * Whether a value is a `{ $ref }` argument marker.
 *
 * @param value - Any value.
 * @returns True for `{ $ref: string }` plain objects.
 */
export function isRefArg(value: unknown): value is { $ref: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype &&
    typeof (value as { $ref?: unknown }).$ref === 'string'
  )
}

/**
 * Collects what every `{ $fn }` marker inside some values returns, keyed by name.
 *
 * @param values - Hook arguments, method arguments and later `args` steps.
 * @returns Callback results for a {@link CallRecorder}.
 * @throws {Error} When two markers share a name but differ in behavior.
 */
export function fnResults(values: unknown[]): Record<string, CallbackResult> {
  const out: Record<string, CallbackResult> = {}
  const seen = new Map<string, string>()
  const visit = (value: unknown): void => {
    if (isFnArg(value)) {
      const key = JSON.stringify(value)
      const before = seen.get(value.$fn)
      if (before !== undefined && before !== key) {
        throw new Error(`conformance: two different { $fn: '${value.$fn}' } markers in one case`)
      }
      seen.set(value.$fn, key)
      if (value.defer) out[value.$fn] = { defer: true }
      else if (value.reject !== undefined) out[value.$fn] = { reject: value.reject }
      else if ('resolve' in value) out[value.$fn] = { resolve: value.resolve }
      else if (value.pick !== undefined) out[value.$fn] = { pick: value.pick }
      else if ('returns' in value) out[value.$fn] = { returns: value.returns }
      return
    }
    if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') Object.values(value).forEach(visit)
  }
  values.forEach(visit)
  return out
}

/**
 * Replaces every `{ $fn }` marker inside a value with the recorder's function
 * of that name (one function per name, so identity is stable across calls).
 *
 * @param value - Arguments as the case wrote them.
 * @param recorder - The case's recorder.
 * @param cache - Functions already built for this case.
 * @param refs - Objects area fakes expose to `{ $ref }` markers.
 * @returns The value with markers replaced; everything else is copied.
 */
export function materializeArgs<T>(
  value: T,
  recorder: CallRecorder,
  cache: Map<string, (...args: unknown[]) => unknown>,
  refs: Record<string, unknown> = {},
): T {
  const walk = (v: unknown): unknown => {
    if (isRefArg(v)) {
      if (!(v.$ref in refs))
        throw new Error(`conformance: no area fakes module exposes { $ref: '${v.$ref}' }`)
      return refs[v.$ref]
    }
    if (isFnArg(v)) {
      let fn = cache.get(v.$fn)
      if (!fn) {
        fn = recorder.spy(v.$fn)
        cache.set(v.$fn, fn)
      }
      return fn
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
    }
    return v
  }
  return walk(value) as T
}

/**
 * Whether a value is an Error turned into plain data: a string `message` and
 * a string `stack` (what `@molecule/app-logger`'s credential-safe wrapper
 * hands a logger in place of a logged Error).
 *
 * @param value - The object to test.
 * @returns `true` for an error snapshot.
 */
function isErrorSnapshot(
  value: object,
): value is { message: string; stack: string; name?: unknown; status?: unknown } {
  const v = value as { message?: unknown; stack?: unknown }
  return typeof v.message === 'string' && typeof v.stack === 'string'
}

/**
 * Normalizes a hook value to plain, JSON-comparable data. Functions become
 * `'[function]'`, errors `{ $error: message, name }` (plus `status` when set) whether they are
 * Error instances or plain snapshots of one,
 * dates their ISO string, maps and sets arrays, promises `'[promise]'`;
 * object keys are sorted and `undefined` fields dropped (a missing field and an
 * `undefined` one read the same), and a route location's random `key` (any
 * object with a string `pathname`) is dropped.
 *
 * @param value - The value.
 * @returns Comparable data.
 */
export function normalizeValue(value: unknown): unknown {
  const seen = new WeakSet<object>()
  const walk = (v: unknown): unknown => {
    if (v === undefined || v === null) return null
    if (typeof v === 'function') return '[function]'
    if (typeof v === 'number' && !Number.isFinite(v)) return String(v)
    if (typeof v !== 'object') return v
    if (v instanceof HookThrew) {
      const name = (v.error as { name?: unknown } | null)?.name
      return { $threw: typeof name === 'string' ? name : 'Error' }
    }
    if (v instanceof Error) {
      const status = (v as { status?: unknown }).status
      return { $error: v.message, name: v.name, ...(typeof status === 'number' ? { status } : {}) }
    }
    if (isErrorSnapshot(v)) {
      // An Error that @molecule/app-logger's credential-safe wrapper turned into
      // plain data before a logger saw it: compared as the Error it was, so its
      // stack (this checkout's paths and line numbers) is never recorded.
      const { message, name, status } = v
      return {
        $error: message,
        name: typeof name === 'string' ? name : 'Error',
        ...(typeof status === 'number' ? { status } : {}),
      }
    }
    if (v instanceof Date) return v.toISOString()
    if (typeof (v as { then?: unknown }).then === 'function') return '[promise]'
    if (typeof Node !== 'undefined' && v instanceof Node)
      return `[node ${v.nodeName.toLowerCase()}]`
    if (seen.has(v)) return '[circular]'
    seen.add(v)
    try {
      if (v instanceof Map) return [...v.entries()].map(([k, x]) => [walk(k), walk(x)])
      if (v instanceof Set) return [...v].map(walk)
      if (Array.isArray(v)) return v.map(walk)
      const isLocation = isRouteLocation(v)
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(v).sort()) {
        const field = (v as Record<string, unknown>)[key]
        if (field === undefined || (isLocation && key === 'key')) continue
        out[key] = walk(field)
      }
      return out
    } finally {
      seen.delete(v)
    }
  }
  return walk(value)
}

/**
 * Whether a value is a route location (an object with a string `pathname`),
 * whose `key` field is a random id the router mints per history entry and is
 * never compared.
 *
 * @param value - Any value.
 * @returns True for a location-like object.
 */
export function isRouteLocation(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as { pathname?: unknown }).pathname === 'string'
  )
}

/**
 * The shape of a React hook result: a function, an object of values and
 * methods, or a plain value.
 *
 * @param result - The React hook's result.
 * @returns Its shape.
 */
export function resultShape(result: unknown): ResultShape {
  if (typeof result === 'function') return { kind: 'function' }
  if (
    result &&
    typeof result === 'object' &&
    !Array.isArray(result) &&
    !(result instanceof Error) &&
    !(result instanceof HookThrew)
  ) {
    const fields: Record<string, 'value' | 'method'> = {}
    const location = isRouteLocation(result)
    for (const key of Object.keys(result).sort()) {
      if (location && key === 'key') continue
      fields[key] =
        typeof (result as Record<string, unknown>)[key] === 'function' ? 'method' : 'value'
    }
    return { kind: 'object', fields }
  }
  return { kind: 'value' }
}

/**
 * The object a framework returned for an `object`-shaped hook: the result
 * itself, or the value inside its reactive container (a Vue ref, a Svelte
 * store, an Angular signal, a Solid accessor).
 *
 * @param mounted - The mounted hook.
 * @returns The result object.
 */
const resultObject = (mounted: MountedHook): Record<string, unknown> | null => {
  const raw = mounted.result()
  const value =
    typeof raw === 'object' && raw !== null && !isReactiveContainer(raw, mounted)
      ? raw
      : mounted.read(raw)
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

/** Whether `read` changes the value, i.e. it is a framework's reactive container. */
const isReactiveContainer = (value: unknown, mounted: MountedHook): boolean =>
  mounted.read(value) !== value

/**
 * Reads a method (or the function result) from a framework value: the function
 * itself, or the function inside a reactive container.
 *
 * @param value - The field value.
 * @param mounted - The mounted hook.
 * @returns The function, or undefined when there is none.
 */
export function functionOf(
  value: unknown,
  mounted: MountedHook,
): ((...args: unknown[]) => unknown) | undefined {
  if (typeof value === 'function') return value as (...args: unknown[]) => unknown
  if (value === undefined || value === null) return undefined
  const inner = mounted.read(value)
  return typeof inner === 'function' ? (inner as (...args: unknown[]) => unknown) : undefined
}

/**
 * Snapshots a mounted hook's current result under React's shape: each React
 * field is read through the framework's unwrapping and normalized; a method is
 * `'[method]'` when the framework has a function there.
 *
 * @param mounted - The mounted hook.
 * @param shape - React's result shape.
 * @returns Comparable data.
 */
export function snapshotResult(mounted: MountedHook, shape: ResultShape): unknown {
  // A hook that threw shows the throw under any shape.
  if (mounted.result() instanceof HookThrew) return normalizeValue(mounted.result())
  if (shape.kind === 'function') {
    return functionOf(mounted.result(), mounted)
      ? '[function]'
      : { $notAFunction: normalizeValue(mounted.read(mounted.result())) }
  }
  if (shape.kind === 'value') return normalizeValue(mounted.read(mounted.result()))
  const object = resultObject(mounted)
  if (!object) return { $notAnObject: normalizeValue(mounted.read(mounted.result())) }
  const out: Record<string, unknown> = {}
  for (const [field, kind] of Object.entries(shape.fields)) {
    const value = object[field]
    if (kind === 'method') {
      out[field] = functionOf(value, mounted)
        ? '[method]'
        : { $missingMethod: normalizeValue(value) }
    } else {
      const read = mounted.read(value)
      out[field] = normalizeValue(read)
    }
  }
  return out
}

/**
 * Finds the function a `call` step names.
 *
 * @param mounted - The mounted hook.
 * @param shape - React's result shape.
 * @param method - The method name, or a dotted path into the result
 *   (`'0.cancel'`: element 0's `cancel`, called on element 0); omitted when the
 *   result is the function.
 * @returns The function and its receiver.
 * @throws {Error} When the framework has no such function.
 */
export function methodOf(
  mounted: MountedHook,
  shape: ResultShape,
  method: string | undefined,
): { fn: (...args: unknown[]) => unknown; self: unknown } {
  if (method === undefined) {
    const fn = functionOf(mounted.result(), mounted)
    if (!fn) throw new Error('conformance: the hook result is not a function')
    return { fn, self: undefined }
  }
  let self: unknown =
    shape.kind === 'object' || shape.kind === 'value' ? resultObject(mounted) : null
  const path = method.split('.')
  // Each step along a dotted path is read through the framework's unwrapping.
  for (const key of path.slice(0, -1)) {
    const next = (self as Record<string, unknown> | null)?.[key]
    self = next === undefined || next === null ? next : mounted.read(next)
  }
  const fn = functionOf((self as Record<string, unknown> | null)?.[path[path.length - 1]!], mounted)
  if (!fn) throw new Error(`conformance: the hook result has no method ${method}`)
  return { fn, self }
}
