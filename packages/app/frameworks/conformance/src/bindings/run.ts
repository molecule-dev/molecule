/**
 * Runs binding (hook) cases: `runHookCase` drives one case through any
 * framework's adapter, and `runBindingConformance(adapter)` registers one
 * vitest test per case that compares the framework with the React goldens.
 *
 * Every framework-binding package (`@molecule/app-vue`, `-solid`, `-svelte`,
 * `-angular`) calls `runBindingConformance` from its own
 * `src/__tests__/conformance.test.ts`.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

import { CallRecorder, settle } from '../ui/steps.js'
import * as allCases from './cases/index.js'
import { isolateBondRegistry, pinBrowserEnvironment } from './environment.js'
import goldensJson from './goldens.json' with { type: 'json' }
import { buildBindingServices } from './services.js'
import type {
  BindingAdapter,
  BindingServices,
  HookCase,
  HookCaseResult,
  HookCases,
  HookStep,
  MountedHook,
  MountOptions,
  ResultShape,
} from './spec.js'
import {
  fnResults,
  functionOf,
  materializeArgs,
  methodOf,
  normalizeValue,
  resultShape,
  snapshotResult,
} from './values.js'

/** The React reference, recorded by the kit's bindings goldens test. */
export interface BindingGoldens {
  /** Every `@molecule/app-react` export each framework binding must also export (see {@link requiredBindingExports}). */
  exports: string[]
  /** Hook → case name → result. */
  cases: Record<string, Record<string, HookCaseResult>>
}

/** Every hook case family, in a stable order. */
export const bindingCaseFamilies: HookCases[] = (Object.values(allCases) as HookCases[]).sort(
  (a, b) => a.hook.localeCompare(b.hook),
)

/** The React reference results every framework binding must reproduce. */
export const bindingGoldens = goldensJson as unknown as BindingGoldens

/**
 * The `@molecule/app-react` exports every framework binding exports under the
 * same name: everything except React's composition-root pieces, the
 * `*Context` objects and `*Provider` components. Those are where a framework
 * wires services in its own idiom (Vue plugins, Solid `MoleculeProvider`,
 * Svelte `setMoleculeContext`, Angular `provide*`), the one place an app
 * changes when it swaps framework.
 *
 * @param names - `Object.keys(await import('@molecule/app-react'))`.
 * @returns The names each framework must export, sorted.
 */
export function requiredBindingExports(names: readonly string[]): string[] {
  return names.filter((name) => !/^[A-Z]\w*(Context|Provider)$/.test(name)).sort()
}

/**
 * Cases that do not match yet, per hook. `'(export)'` under an export name
 * means it is not exported at all. Listed entries run as expected failures,
 * so the list can only shrink.
 */
export type BindingKnownGaps = Record<string, string[]>

/** What a step does to the hook (besides what the adapter does). */
interface RunState {
  mounted: MountedHook
  unmounted: boolean
}

const stepLabel = (step: HookStep): string =>
  step.type === 'call'
    ? `call ${step.method ?? '()'}`
    : step.type === 'http'
      ? `http ${step.method} ${step.url}`
      : step.type

/**
 * Runs one hook case through a framework adapter.
 *
 * @param adapter - The framework's adapter.
 * @param hook - The hook's export name.
 * @param testCase - The case.
 * @param shape - React's result shape; omit when recording React (it is read from the result).
 * @returns Snapshots and calls.
 */
export async function runHookCase(
  adapter: BindingAdapter,
  hook: string,
  testCase: HookCase,
  shape?: ResultShape,
): Promise<HookCaseResult> {
  const stepArgs = (testCase.steps ?? []).flatMap((s) =>
    s.type === 'call' || s.type === 'args' ? (s.args ?? []) : [],
  )
  // Module-level state of the binding (caches, stores) and browser storage start empty for every case.
  await adapter.reset?.()
  if (typeof window !== 'undefined') {
    window.localStorage?.clear()
    window.sessionStorage?.clear()
  }
  const recorder = new CallRecorder(
    fnResults([...(testCase.args ?? []), ...stepArgs]),
    normalizeValue,
  )
  const fns = new Map<string, (...args: unknown[]) => unknown>()
  // Pinned before the services are built, so an area that seeds its own value
  // patches over the pinned one and restores it.
  const restoreBonds = isolateBondRegistry()
  const restoreEnvironment = pinBrowserEnvironment()
  const { services, controls } = buildBindingServices(testCase.context ?? {}, (name, args) => {
    recorder.calls.push({ name, args })
  })
  if (testCase.fakeTimers) {
    vi.useFakeTimers({
      toFake: [
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'Date',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    })
  }
  await services.i18n.setLocale(testCase.context?.locale ?? 'en')
  // What the kit itself did to set the case up (the locale switch above logs
  // through the bonded logger) is not the hook's behaviour: the recording starts
  // at mount.
  recorder.calls.length = 0
  const snapshots: unknown[] = []
  const family = bindingCaseFamilies.find((f) => f.hook === hook)
  const mountOptions: MountOptions | undefined =
    family?.render || family?.reactiveArgs
      ? {
          ...(family.render ? { render: family.render } : {}),
          ...(family.reactiveArgs ? { reactiveArgs: true } : {}),
        }
      : undefined
  // The composition root gets every service but those the case omits; the runner keeps them all.
  const given: Partial<BindingServices> = { ...services }
  for (const name of testCase.context?.omitServices ?? []) delete given[name]
  const mountHost = (args: unknown[]): Promise<MountedHook> =>
    adapter.mount(
      hook,
      materializeArgs(args, recorder, fns, controls.refs),
      given,
      shape,
      mountOptions,
    )
  const state: RunState = { mounted: await mountHost(testCase.args ?? []), unmounted: false }
  let resolvedShape = shape
  const snap = (): void => {
    if (state.unmounted) {
      snapshots.push(null)
      return
    }
    resolvedShape ??= resultShape(state.mounted.result())
    const location = services.router.getLocation()
    snapshots.push({
      result: snapshotResult(state.mounted, resolvedShape),
      route: `${location.pathname}${location.search}`,
    })
  }
  const run = async (step: () => Promise<void> | void): Promise<void> => {
    const body = async (): Promise<void> => {
      await step()
    }
    if (state.mounted.wrap && !state.unmounted) await state.mounted.wrap(body)
    else await body()
  }
  /** A service change from outside: a rejection is the outcome (`! locale`), not a broken case. */
  const outside = (type: string, action: () => Promise<unknown> | unknown): Promise<void> =>
    run(async () => {
      try {
        await action()
      } catch (error) {
        recorder.calls.push({
          name: `! ${type}`,
          args: [{ rejected: (error as Error)?.message ?? String(error) }],
        })
      }
    })
  /** Values `call` steps kept under their `as` names. */
  const kept = new Map<string, unknown>()
  /** Each method's function at the previous `stable` step. */
  const stableBefore = new Map<string, unknown>()
  /** The function a `call` step names: on the result, or on a kept value (`on`). */
  const target = (
    step: Extract<HookStep, { type: 'call' }>,
  ): { fn: (...args: unknown[]) => unknown; self: unknown } => {
    if (step.on === undefined) return methodOf(state.mounted, resolvedShape!, step.method)
    if (!kept.has(step.on)) throw new Error(`conformance: no call kept a value as ${step.on}`)
    const value = kept.get(step.on)
    const fn = functionOf(
      step.method === undefined ? value : (value as Record<string, unknown> | null)?.[step.method],
      state.mounted,
    )
    if (!fn) throw new Error(`conformance: ${step.on} has no method ${step.method ?? '()'}`)
    return { fn, self: value }
  }
  try {
    await state.mounted.flush()
    snap()
    for (const step of testCase.steps ?? []) {
      switch (step.type) {
        case 'call': {
          if (state.unmounted) throw new Error('conformance: a call step after unmount')
          const label = `=> ${step.on === undefined ? '' : `${step.on}.`}${step.method ?? '()'}`
          const { fn, self } = target(step)
          const args = materializeArgs(step.args ?? [], recorder, fns, controls.refs)
          await run(() => {
            let returned: unknown
            try {
              returned = fn.apply(self, args)
            } catch (error) {
              recorder.calls.push({
                name: label,
                args: [{ threw: (error as Error)?.message ?? String(error) }],
              })
              return
            }
            if (returned && typeof (returned as { then?: unknown }).then === 'function') {
              ;(returned as Promise<unknown>).then(
                (value) => {
                  if (step.as !== undefined) kept.set(step.as, value)
                  recorder.calls.push({ name: label, args: [{ resolved: normalizeValue(value) }] })
                },
                (error: unknown) =>
                  recorder.calls.push({
                    name: label,
                    args: [{ rejected: (error as Error)?.message ?? String(error) }],
                  }),
              )
            } else {
              if (step.as !== undefined) kept.set(step.as, returned)
              recorder.calls.push({ name: label, args: [{ returned: normalizeValue(returned) }] })
            }
          })
          break
        }
        case 'stable': {
          if (state.unmounted) throw new Error('conformance: a stable step after unmount')
          const outcome: Record<string, string> = {}
          for (const method of step.methods ?? [undefined]) {
            const { fn } = methodOf(state.mounted, resolvedShape!, method)
            const key = method ?? '$result'
            outcome[key] = !stableBefore.has(key)
              ? 'first'
              : Object.is(stableBefore.get(key), fn)
                ? 'same'
                : 'rebuilt'
            stableBefore.set(key, fn)
          }
          recorder.calls.push({ name: 'stable', args: [outcome] })
          break
        }
        case 'args':
          if (state.unmounted) throw new Error('conformance: an args step after unmount')
          await state.mounted.setArgs(materializeArgs(step.args, recorder, fns, controls.refs))
          break
        case 'advance':
          await run(() => vi.advanceTimersByTimeAsync(step.ms).then(() => undefined))
          break
        case 'settle':
          await run(() => recorder.settle(step.fn, step.value, step.error))
          break
        case 'http':
          await run(() => controls.answerHttp(step))
          break
        case 'auth':
          await outside(step.type, () => controls.setAuth(step.status, step.user))
          break
        case 'locale':
          await outside(step.type, () => services.i18n.setLocale(step.locale))
          break
        case 'theme':
          await outside(step.type, () => controls.setThemeMode(step.mode))
          break
        case 'navigate':
          await outside(step.type, () => services.router.navigate(step.to))
          break
        case 'storage':
          await outside(step.type, () => controls.writeStorage(step.key, step.value))
          break
        case 'control':
          await run(() => controls.control(step.name, step.args ?? []))
          break
        case 'unmount':
          if (!state.unmounted) await state.mounted.unmount()
          state.unmounted = true
          break
        case 'remount':
          if (!state.unmounted) await state.mounted.unmount()
          state.unmounted = true
          await settle()
          state.mounted = await mountHost(step.args ?? testCase.args ?? [])
          state.unmounted = false
          // A fresh host's functions are new; identity checks start over.
          stableBefore.clear()
          break
      }
      if (state.unmounted) await settle()
      else await state.mounted.flush()
      snap()
    }
  } finally {
    if (!state.unmounted) await state.mounted.unmount()
    state.unmounted = true
    await settle()
    if (testCase.fakeTimers) vi.useRealTimers()
  }
  const listenersAfterUnmount = controls.listeners()
  await controls.dispose()
  restoreEnvironment()
  restoreBonds()
  return {
    shape: resolvedShape ?? { kind: 'value' },
    snapshots,
    calls: recorder.calls,
    listenersAfterUnmount,
  }
}

/** Options for {@link runBindingConformance}. */
export interface BindingConformanceOptions {
  /** Cases this package does not match yet. */
  knownGaps?: BindingKnownGaps
}

const only = (name: string): string[] | null =>
  process.env[name]
    ? process.env[name]!.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null

/**
 * Registers the binding conformance suite for one framework.
 *
 * `CONFORMANCE_HOOKS=useAuth,useForm` narrows a local run.
 *
 * @param adapter - The framework's adapter.
 * @param options - Known gaps.
 */
export function runBindingConformance(
  adapter: BindingAdapter,
  options: BindingConformanceOptions = {},
): void {
  const gaps = options.knownGaps ?? {}
  const filter = only('CONFORMANCE_HOOKS')
  const families = bindingCaseFamilies.filter((f) => !filter || filter.includes(f.hook))

  describe(`${adapter.name} binding conformance`, () => {
    it('lists only exports and cases that exist', () => {
      for (const [hook, names] of Object.entries(gaps)) {
        expect(
          bindingGoldens.exports,
          `known gap names ${hook}, which React does not export`,
        ).toContain(hook)
        const family = bindingCaseFamilies.find((f) => f.hook === hook)
        for (const name of names) {
          if (name === '(export)') continue
          expect(
            family?.cases.some((c) => c.name === name) ?? false,
            `known gap ${hook} / ${name} names no case`,
          ).toBe(true)
        }
      }
    })

    describe.skipIf(filter !== null)('exports', () => {
      for (const name of bindingGoldens.exports) {
        const gap = gaps[name]?.includes('(export)') ?? false
        ;(gap ? it.fails : it)(name, () => {
          expect(adapter.has(name), `${adapter.name} exports ${name}`).toBe(true)
        })
      }
    })

    for (const family of families) {
      describe(family.hook, () => {
        const exportGap = gaps[family.hook]?.includes('(export)') ?? false
        for (const testCase of family.cases) {
          const gap = exportGap || (gaps[family.hook]?.includes(testCase.name) ?? false)
          ;(gap ? it.fails : it)(testCase.name, async () => {
            const expected = bindingGoldens.cases[family.hook]?.[testCase.name]
            if (!expected) {
              throw new Error(
                `no golden for ${family.hook} / ${testCase.name}: record them in @molecule/app-framework-conformance`,
              )
            }
            if (!adapter.has(family.hook))
              throw new Error(`${adapter.name} does not export ${family.hook}`)
            const actual = await runHookCase(adapter, family.hook, testCase, expected.shape)
            for (let i = 0; i < expected.snapshots.length; i++) {
              const step =
                i === 0 ? 'after mount' : `after step ${i} (${stepLabel(testCase.steps![i - 1])})`
              expect(actual.snapshots[i], step).toEqual(expected.snapshots[i])
            }
            expect(actual.calls, 'service, callback and method calls').toEqual(expected.calls)
            expect(actual.listenersAfterUnmount, 'subscriptions left after unmount').toEqual(
              expected.listenersAfterUnmount,
            )
          })
        }
      })
    }
  })
}
