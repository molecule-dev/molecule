/**
 * Runs a hook-shaped render function (one written against {@link PrimitiveHooks}) outside React,
 * as a store: `getState` returns the function's latest result, `subscribe` hears every change.
 *
 * Shared IDE behaviour that is naturally written as a React-style hook (see
 * `usePreviewPanelLogic`) is written ONCE against these four primitives. React passes its own
 * hooks and runs that code itself; Vue, Svelte, Solid and Angular run it through
 * {@link createHeadlessHooksSession}, which follows React's rules for the parts that change
 * behaviour:
 *
 * - A setter called with the current value (`Object.is`) changes nothing.
 * - Effects run only while connected (mounted). After each render, every effect whose deps
 *   changed first has its previous cleanup run (all cleanups, in declaration order), then its new
 *   run (in declaration order). `connect` runs every effect; disconnecting runs every cleanup.
 * - Updates are batched: a handler from the result runs inside {@link HeadlessHooksSession.batch},
 *   so its updates produce one render, synchronously, before it returns; updates from a timer,
 *   a promise continuation or a DOM listener are batched into one render on the next microtask.
 *
 * @module
 */

/** The four primitive hooks a hook-shaped render function may call (React's own satisfy them). */
export interface PrimitiveHooks {
  /**
   * A value that persists across renders; setting a different value re-renders.
   * @param initial - The first value.
   * @returns The current value and its setter (which also takes an updater function).
   */
  useState<S>(initial: S): [S, (next: S | ((previous: S) => S)) => void]
  /**
   * A mutable box that persists across renders without re-rendering when written.
   * @param initial - The box's first value.
   * @returns The box.
   */
  useRef<T>(initial: T): { current: T }
  /**
   * Runs `effect` after a render whose `deps` changed (every render when `deps` is omitted),
   * running the previous run's cleanup first; every cleanup runs on disconnect.
   * @param effect - The effect; may return its cleanup.
   * @param deps - The values whose change re-runs it.
   */
  useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void
  /**
   * The same function object across renders until `deps` change.
   * @param fn - The function.
   * @param deps - The values whose change replaces it.
   * @returns The memoized function.
   */
  useCallback<F extends (...args: never[]) => unknown>(fn: F, deps: readonly unknown[]): F
}

/** A hook-shaped render function run as a store (see the module docs). */
export interface HeadlessHooksSession<R> {
  /**
   * The render function's latest result. Its function-valued fields are wrapped in
   * {@link HeadlessHooksSession.batch} (the same wrapper while the function is unchanged).
   * @returns The latest result.
   */
  getState(): R
  /**
   * Listens for a new result.
   * @param listener - Called after each render that produced a new result.
   * @returns Stops listening.
   */
  subscribe(listener: () => void): () => void
  /** Re-renders now (the render function's inputs changed). */
  rerender(): void
  /**
   * Mounts: runs every effect, and keeps running them as renders change their deps.
   * @returns Unmounts: runs every cleanup and stops running effects.
   */
  connect(): () => void
  /**
   * Runs `fn` with updates batched: the renders they cause happen once, when the outermost batch ends.
   * @param fn - The work.
   * @returns What `fn` returns.
   */
  batch<T>(fn: () => T): T
}

interface StateSlot {
  kind: 'state'
  value: unknown
  set: (next: unknown) => void
}
interface RefSlot {
  kind: 'ref'
  box: { current: unknown }
}
interface EffectSlot {
  kind: 'effect'
  /** The deps of the run that is in effect (`undefined`: never run, or must run again). */
  committed: readonly unknown[] | undefined
  /** The latest render's effect and deps, and whether they differ from the committed run. */
  effect: () => void | (() => void)
  deps: readonly unknown[] | undefined
  changed: boolean
  cleanup: (() => void) | undefined
}
interface CallbackSlot {
  kind: 'callback'
  fn: unknown
  deps: readonly unknown[]
}
type Slot = StateSlot | RefSlot | EffectSlot | CallbackSlot

/** The most render passes one flush may take before the render is called non-settling. */
const MAX_PASSES = 50

let batchDepth = 0
const pendingFlushes = new Set<() => void>()

const sameDeps = (a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean =>
  a !== undefined &&
  b !== undefined &&
  a.length === b.length &&
  a.every((value, index) => Object.is(value, b[index]))

const runBatch = <T>(fn: () => T): T => {
  batchDepth += 1
  try {
    return fn()
  } finally {
    batchDepth -= 1
    if (batchDepth === 0) {
      while (pendingFlushes.size > 0) {
        const [flush] = pendingFlushes
        pendingFlushes.delete(flush)
        flush()
      }
    }
  }
}

/**
 * Runs `render` as a store (see the module docs). The first render happens here; effects wait
 * for {@link HeadlessHooksSession.connect}.
 *
 * @param render - The hook-shaped render function; it must call the same hooks in the same order
 *   on every render.
 * @returns The session.
 */
export function createHeadlessHooksSession<R>(
  render: (hooks: PrimitiveHooks) => R,
): HeadlessHooksSession<R> {
  const slots: Slot[] = []
  const listeners = new Set<() => void>()
  const wrappers = new WeakMap<object, unknown>()
  let index = 0
  let firstRender = true
  let dirty = true
  let rendering = false
  let connected = false
  let microtaskQueued = false
  let result: R | undefined

  const take = <S extends Slot>(kind: S['kind'], create: () => S): S => {
    const at = index
    index += 1
    if (firstRender) {
      const slot = create()
      slots.push(slot)
      return slot
    }
    const slot = slots[at]
    if (!slot || slot.kind !== kind) {
      throw new Error(
        `createHeadlessHooksSession: hook ${at} was ${slot ? `a ${slot.kind}` : 'missing'} on the first render and is a ${kind} now; call the same hooks in the same order on every render`,
      )
    }
    return slot as S
  }

  const commit = (): void => {
    const changed = slots.filter(
      (slot): slot is EffectSlot => slot.kind === 'effect' && slot.changed,
    )
    for (const slot of changed) {
      const cleanup = slot.cleanup
      slot.cleanup = undefined
      cleanup?.()
    }
    for (const slot of changed) {
      slot.changed = false
      slot.committed = slot.deps ?? []
      const cleanup = slot.effect()
      if (typeof cleanup === 'function') slot.cleanup = cleanup
      // An effect without deps runs after every render.
      if (slot.deps === undefined) slot.committed = undefined
    }
  }

  const flush = (): void => {
    if (rendering) return
    rendering = true
    let rendered = false
    try {
      let passes = 0
      while (dirty) {
        passes += 1
        if (passes > MAX_PASSES) {
          throw new Error(
            `createHeadlessHooksSession: the render did not settle after ${MAX_PASSES} passes (an effect or the render sets state every time)`,
          )
        }
        dirty = false
        index = 0
        result = render(hooks)
        firstRender = false
        rendered = true
        if (connected) commit()
      }
    } finally {
      rendering = false
    }
    if (rendered) for (const listener of [...listeners]) listener()
  }

  const markDirty = (): void => {
    dirty = true
    if (rendering) return
    if (batchDepth > 0) {
      pendingFlushes.add(flush)
      return
    }
    if (microtaskQueued) return
    microtaskQueued = true
    queueMicrotask(() => {
      microtaskQueued = false
      flush()
    })
  }

  const hooks: PrimitiveHooks = {
    useState<S>(initial: S): [S, (next: S | ((previous: S) => S)) => void] {
      const slot = take<StateSlot>('state', () => {
        const created: StateSlot = {
          kind: 'state',
          value: initial,
          set: (next) => {
            const value =
              typeof next === 'function'
                ? (next as (previous: unknown) => unknown)(created.value)
                : next
            if (Object.is(value, created.value)) return
            created.value = value
            markDirty()
          },
        }
        return created
      })
      return [slot.value as S, slot.set as (next: S | ((previous: S) => S)) => void]
    },
    useRef<T>(initial: T): { current: T } {
      return take<RefSlot>('ref', () => ({ kind: 'ref', box: { current: initial } })).box as {
        current: T
      }
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void {
      const slot = take<EffectSlot>('effect', () => ({
        kind: 'effect',
        committed: undefined,
        effect,
        deps,
        changed: true,
        cleanup: undefined,
      }))
      slot.effect = effect
      slot.deps = deps
      slot.changed = !sameDeps(slot.committed, deps)
    },
    useCallback<F extends (...args: never[]) => unknown>(fn: F, deps: readonly unknown[]): F {
      const slot = take<CallbackSlot>('callback', () => ({ kind: 'callback', fn, deps }))
      if (!sameDeps(slot.deps, deps)) {
        slot.fn = fn
        slot.deps = deps
      }
      return slot.fn as F
    },
  }

  const batch = <T>(fn: () => T): T => runBatch(fn)

  /** The result with each function field wrapped in `batch` (one wrapper per function). */
  const wrapped = (value: R): R => {
    if (typeof value !== 'object' || value === null) return value
    const out: Record<string, unknown> = {}
    for (const [key, field] of Object.entries(value)) {
      if (typeof field !== 'function') {
        out[key] = field
        continue
      }
      let wrapper = wrappers.get(field)
      if (!wrapper) {
        wrapper = (...args: unknown[]) =>
          batch(() => (field as (...a: unknown[]) => unknown)(...args))
        wrappers.set(field, wrapper)
      }
      out[key] = wrapper
    }
    return out as R
  }
  let view: R | undefined
  let viewOf: R | undefined

  flush()

  return {
    getState(): R {
      if (viewOf !== result || view === undefined) {
        viewOf = result
        view = wrapped(result as R)
      }
      return view
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    rerender(): void {
      batch(() => markDirty())
    },
    connect(): () => void {
      batch(() => {
        connected = true
        for (const slot of slots) {
          if (slot.kind === 'effect') {
            slot.committed = undefined
            slot.changed = true
          }
        }
        // A pass that commits every effect, even when no state changed.
        markDirty()
      })
      return () => {
        if (!connected) return
        connected = false
        for (const slot of slots) {
          if (slot.kind !== 'effect') continue
          const cleanup = slot.cleanup
          slot.cleanup = undefined
          slot.committed = undefined
          cleanup?.()
        }
      }
    },
    batch,
  }
}
