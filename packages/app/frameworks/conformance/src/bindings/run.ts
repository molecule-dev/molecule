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

import { watchConformanceEventLoop } from '../stall-watchdog-vitest.js'
import { advanceClock, installCaseClock } from '../ui/clock.js'
import { writeLocalStorageFromOtherTab } from '../ui/environment.js'
import { type CaseLocalStorage, installLocalStorage, resetCasePage } from '../ui/page.js'
import { checkFields, checkStepFields, type FieldsOf, type StepFields } from '../ui/step-fields.js'
import { CallRecorder, settle } from '../ui/steps.js'
import * as allCases from './cases/index.js'
import {
  installControlledMediaQueries,
  isolateBondRegistry,
  type MediaQueryControl,
  pinBrowserEnvironment,
} from './environment.js'
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
  completeSnapshots,
  fnResults,
  functionOf,
  HookThrew,
  materializeArgs,
  methodOf,
  normalizeValue,
  resultShape,
  snapshotResult,
  widenShape,
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

/** The fields a hook case takes. */
const HOOK_CASE_FIELDS: FieldsOf<HookCase> = {
  name: 'required',
  args: 'optional',
  context: 'optional',
  steps: 'optional',
  fakeTimers: 'optional',
  now: 'optional',
  media: 'optional',
}

/** The fields each hook step takes. */
const HOOK_STEP_FIELDS: StepFields<HookStep> = {
  call: { method: 'optional', args: 'optional', as: 'optional', on: 'optional' },
  stable: { methods: 'optional' },
  args: { args: 'required' },
  advance: { ms: 'required' },
  settle: { fn: 'required', value: 'optional', error: 'optional' },
  http: {
    method: 'required',
    url: 'required',
    status: 'optional',
    data: 'optional',
    networkError: 'optional',
  },
  auth: { status: 'required', user: 'optional' },
  locale: { locale: 'required' },
  theme: { mode: 'required' },
  navigate: { to: 'required' },
  back: {},
  storage: { key: 'required', value: 'optional' },
  control: { name: 'required', args: 'optional' },
  keydown: {
    key: 'required',
    metaKey: 'optional',
    ctrlKey: 'optional',
    altKey: 'optional',
    shiftKey: 'optional',
    target: 'optional',
  },
  media: { query: 'required', matches: 'required' },
  localStorage: { key: 'required', value: 'required', sameTab: 'optional' },
  event: { selector: 'required', event: 'required' },
  unmount: {},
  remount: { args: 'optional' },
}

/**
 * Fails a hook case that carries a field the case or one of its steps does not
 * take (a misspelled field is otherwise never read, and the case tests nothing).
 *
 * @param testCase - The case.
 */
export function checkHookCaseFields(testCase: HookCase): void {
  checkFields(testCase, HOOK_CASE_FIELDS, `the hook case "${testCase.name}"`)
  ;(testCase.steps ?? []).forEach((step, index) =>
    checkStepFields(step, HOOK_STEP_FIELDS, `step ${index + 1} of "${testCase.name}"`),
  )
}

/**
 * Dispatches a `keydown` step's event from its target (a temporary text field or
 * code-editor root for `input` / `editor`, removed afterwards).
 *
 * @param step - The step.
 * @returns What the step records: the key and whether a listener prevented its default.
 */
function pressKey(step: Extract<HookStep, { type: 'keydown' }>): {
  key: string
  defaultPrevented: boolean
} {
  let temporary: HTMLElement | null = null
  let target: HTMLElement = document.body
  if (step.target === 'input') {
    temporary = target = document.createElement('input')
    document.body.append(target)
  } else if (step.target === 'editor') {
    // Monaco marks its root with this class; editors and shortcut hooks look for it.
    temporary = document.createElement('div')
    temporary.className = 'monaco-editor'
    target = document.createElement('textarea')
    temporary.append(target)
    document.body.append(temporary)
  }
  const event = new KeyboardEvent('keydown', {
    key: step.key,
    metaKey: step.metaKey ?? false,
    ctrlKey: step.ctrlKey ?? false,
    altKey: step.altKey ?? false,
    shiftKey: step.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  temporary?.remove()
  return { key: step.key, defaultPrevented: event.defaultPrevented }
}

/**
 * Runs one hook case through a framework adapter.
 *
 * @param adapter - The framework's adapter.
 * @param hook - The hook's export name.
 * @param testCase - The case.
 * @param shape - React's result shape; omit when recording React (it is read from the result).
 * @param family - The case's family, for its mount flags (`render`, `reactiveArgs`). Defaults
 *   to the binding kit's family of that hook; a feature package's hook families pass their own.
 * @returns Snapshots and calls.
 */
export async function runHookCase(
  adapter: BindingAdapter,
  hook: string,
  testCase: HookCase,
  shape?: ResultShape,
  family: Pick<HookCases, 'render' | 'reactiveArgs'> | undefined = bindingCaseFamilies.find(
    (f) => f.hook === hook,
  ),
): Promise<HookCaseResult> {
  checkHookCaseFields(testCase)
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
  // A case that names media queries, or changes one, answers them from its own set.
  const media: MediaQueryControl | null =
    testCase.media || (testCase.steps ?? []).some((s) => s.type === 'media')
      ? installControlledMediaQueries(testCase.media ?? [])
      : null
  // A case that seeds localStorage, or writes it, gets the kit's in-memory page storage.
  const local: CaseLocalStorage | null =
    testCase.context?.window?.localStorage ||
    (testCase.steps ?? []).some((s) => s.type === 'localStorage')
      ? installLocalStorage(testCase.context?.window?.localStorage ?? {})
      : null
  // Everything after the pins runs inside one try, so a case that throws mid-run still
  // restores the bonds and the browser for every later case.
  let disposeControls: (() => Promise<void>) | null = null
  try {
    // Before the area fakes: one of them (`authFlows`) mounts the case on its own URL.
    resetCasePage()
    const { services, controls } = buildBindingServices(testCase.context ?? {}, (name, args) => {
      recorder.calls.push({ name, args })
    })
    disposeControls = () => controls.dispose()
    installCaseClock(testCase)
    await services.i18n.setLocale(testCase.context?.locale ?? 'en')
    // What the kit itself did to set the case up (the locale switch above logs
    // through the bonded logger) is not the hook's behaviour: the recording starts
    // at mount.
    recorder.calls.length = 0
    const snapshots: unknown[] = []
    // A reactive hook gets one source per argument position the case ever uses.
    const arity = Math.max(
      testCase.args?.length ?? 0,
      ...(testCase.steps ?? []).map((s) =>
        s.type === 'args' || s.type === 'remount' ? (s.args?.length ?? 0) : 0,
      ),
    )
    const mountOptions: MountOptions | undefined =
      family?.render || family?.reactiveArgs
        ? {
            ...(family.render ? { render: family.render } : {}),
            ...(family.reactiveArgs ? { reactiveArgs: true, arity } : {}),
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
    const recording = shape === undefined
    const snap = (): void => {
      if (state.unmounted) {
        snapshots.push(null)
        return
      }
      // Recording React: the shape grows with fields that appear after the first render.
      // A framework run reads React's final shape as given.
      const result = state.mounted.result()
      if (recording && !(result instanceof HookThrew))
        resolvedShape = widenShape(resolvedShape, result)
      resolvedShape ??= resultShape(result)
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
        step.method === undefined
          ? value
          : (value as Record<string, unknown> | null)?.[step.method],
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
                    recorder.calls.push({
                      name: label,
                      args: [{ resolved: normalizeValue(value) }],
                    })
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
            if (state.mounted.result() instanceof HookThrew) {
              // A hook that threw leaves no component behind in an app (React's error
              // boundary discards it; a setup that throws mounts nothing), so the app's next
              // render mounts a fresh one. Re-rendering the host instead would give React's
              // fiber a different number of hooks than its last render (the host catches the
              // throw), which React reports as an internal error.
              await state.mounted.unmount()
              state.unmounted = true
              await settle()
              state.mounted = await mountHost(step.args ?? [])
              state.unmounted = false
              stableBefore.clear()
            } else {
              await state.mounted.setArgs(materializeArgs(step.args, recorder, fns, controls.refs))
            }
            break
          case 'advance':
            // One timer callback at a time, each in the framework's scope (`ui/clock.ts`).
            await advanceClock(step.ms, (work) => run(work))
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
          case 'back':
            await outside(step.type, () => services.router.back())
            break
          case 'storage':
            await outside(step.type, () => controls.writeStorage(step.key, step.value))
            break
          case 'control':
            await run(() => controls.control(step.name, step.args ?? []))
            break
          case 'keydown':
            await run(() => {
              recorder.calls.push({ name: '@keydown', args: [pressKey(step)] })
            })
            break
          case 'media':
            await run(() => media?.set(step.query, step.matches))
            break
          case 'localStorage':
            await run(() => {
              if (!step.sameTab) writeLocalStorageFromOtherTab(step.key, step.value)
              else if (step.value === null) localStorage.removeItem(step.key)
              else localStorage.setItem(step.key, step.value)
            })
            break
          case 'event':
            await run(() => {
              ;(step.selector === 'window' ? window : document).dispatchEvent(new Event(step.event))
            })
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
      if (testCase.fakeTimers || testCase.now !== undefined) vi.useRealTimers()
    }
    const listenersAfterUnmount = controls.listeners()
    const finalShape = resolvedShape ?? { kind: 'value' }
    return {
      shape: finalShape,
      snapshots: recording ? completeSnapshots(snapshots, finalShape) : snapshots,
      calls: recorder.calls,
      listenersAfterUnmount,
    }
  } finally {
    if (testCase.fakeTimers || testCase.now !== undefined) vi.useRealTimers()
    await disposeControls?.()
    media?.restore()
    local?.restore()
    restoreEnvironment()
    restoreBonds()
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
    // A case's timeout is a timer: it cannot fire while a binding spins in a microtask loop.
    watchConformanceEventLoop()
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

    registerHookFamilies(adapter, families, bindingGoldens.cases, gaps)
  })
}

/**
 * Registers one vitest test per hook case, comparing the framework's results
 * with React's: every snapshot, every recorded call, and the subscriptions
 * left after unmount. Listed known gaps run as expected failures.
 *
 * @param adapter - The framework's adapter.
 * @param families - The hook case families to run.
 * @param goldens - React's results: hook → case name → result.
 * @param gaps - Cases that do not match yet, per hook (`'(export)'`: not exported).
 */
export function registerHookFamilies(
  adapter: BindingAdapter,
  families: readonly HookCases[],
  goldens: Record<string, Record<string, HookCaseResult>>,
  gaps: BindingKnownGaps,
): void {
  for (const family of families) {
    describe(family.hook, () => {
      const exportGap = gaps[family.hook]?.includes('(export)') ?? false
      for (const testCase of family.cases) {
        const gap = exportGap || (gaps[family.hook]?.includes(testCase.name) ?? false)
        ;(gap ? it.fails : it)(testCase.name, async () => {
          const expected = goldens[family.hook]?.[testCase.name]
          if (!expected) {
            throw new Error(
              `no golden for ${family.hook} / ${testCase.name}: record them in @molecule/app-framework-conformance`,
            )
          }
          if (!adapter.has(family.hook))
            throw new Error(`${adapter.name} does not export ${family.hook}`)
          const actual = await runHookCase(adapter, family.hook, testCase, expected.shape, family)
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
}
