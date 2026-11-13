/**
 * Helpers every adapter uses: services, callback recording and the step loop.
 *
 * @module
 */

import { vi } from 'vitest'

import type { AuthClient } from '@molecule/app-auth'
import { getProvider as getI18nProvider, type I18nProvider } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'
import type { ThemeProvider } from '@molecule/app-theme'

import { freshContainer, performDomInteraction } from './environment.js'
import { createFakeAuthClient, createFakeThemeProvider } from './fakes.js'
import { normalizeArg, normalizeDom } from './normalize.js'
import type { CallbackResult, CaseResult, Interaction, RecordedCall, UICase } from './spec.js'
import { loadReferenceStylesheet, referenceStyles } from './stylesheet.js'

/** The services one case runs against, identical for every adapter. */
export interface CaseServices {
  i18n: I18nProvider
  router: Router
  theme: ThemeProvider
  auth?: AuthClient<Record<string, unknown>>
}

/**
 * Builds the case's services. Service calls are recorded on the recorder, so a
 * component that calls `logout()` in one framework must call it in all.
 *
 * @param testCase - The case.
 * @param recorder - The case's recorder.
 * @returns Services to hand to the framework's providers.
 */
export function buildServices(testCase: UICase, recorder: CallRecorder): CaseServices {
  const sink = (name: string, args: unknown[]): void => {
    recorder.calls.push({ name, args: args.map(normalizeArg) })
  }
  const i18n = getI18nProvider()
  return {
    i18n,
    router: createMemoryRouter({ initialEntries: [testCase.context?.route ?? '/'] }),
    theme: createFakeThemeProvider(testCase.context?.theme ?? 'light', sink),
    auth: testCase.context?.auth ? createFakeAuthClient(testCase.context.auth, sink) : undefined,
  }
}

/** Records calls under their React callback name. */
export class CallRecorder {
  readonly calls: RecordedCall[] = []
  private readonly pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }[]
  >()

  /**
   * Creates a recorder.
   *
   * @param results - What each callback returns (`UICase.callbackResults`).
   * @param normalize - Turns each argument into comparable data (the binding kit passes its value normalizer).
   */
  constructor(
    private readonly results: Record<string, CallbackResult> = {},
    private readonly normalize: (value: unknown) => unknown = normalizeArg,
  ) {}

  /**
   * Builds a recording function for one callback.
   *
   * @param name - The React spelling of the callback prop (`onClick`).
   * @returns A function that records each call's normalized arguments and
   * returns what the case asks for.
   */
  spy(name: string): (...args: unknown[]) => unknown {
    return (...args: unknown[]) => {
      this.calls.push({ name, args: args.map((arg) => this.normalize(arg)) })
      const result = this.results[name]
      if (!result) return undefined
      if ('returns' in result) return result.returns
      if ('resolve' in result) return Promise.resolve(result.resolve)
      if ('reject' in result) return Promise.reject(new Error(result.reject))
      if ('pick' in result) {
        return result.pick.reduce<unknown>(
          (value, key) =>
            value === null || value === undefined
              ? undefined
              : (value as Record<string | number, unknown>)[key],
          args,
        )
      }
      return new Promise((resolve, reject) => {
        const queue = this.pending.get(name) ?? []
        queue.push({ resolve, reject })
        this.pending.set(name, queue)
      })
    }
  }

  /**
   * Settles the oldest pending call of a deferred callback.
   *
   * @param name - The callback.
   * @param value - The resolved value.
   * @param error - When set, rejects with `new Error(error)` instead.
   */
  settle(name: string, value?: unknown, error?: string): void {
    const next = this.pending.get(name)?.shift()
    if (!next) throw new Error(`conformance: ${name} has no pending call to settle`)
    if (error !== undefined) next.reject(new Error(error))
    else next.resolve(value)
  }
}

/**
 * A stable path to the focused element (`body>div:0>button:1`: tag and index
 * among element siblings), or null when nothing but the body has focus.
 *
 * @returns The path.
 */
export function focusPath(): string | null {
  const active = document.activeElement
  if (!active || active === document.body || !document.body.contains(active)) return null
  const parts: string[] = []
  let el: Element | null = active
  while (el && el !== document.body) {
    const parent: Element | null = el.parentElement
    const index = parent ? Array.prototype.indexOf.call(parent.children, el) : 0
    parts.unshift(`${el.tagName.toLowerCase()}:${index}`)
    el = parent
  }
  return ['body', ...parts].join('>')
}

/**
 * Serializes history state for a snapshot: object keys sorted, `null` and
 * `undefined` fields dropped, and every `key` field dropped (routers mint a
 * random key per history entry; it identifies the entry, it is not state).
 *
 * @param state - The history entry's state.
 * @returns Stable JSON, or an empty string when there is no state.
 */
export function routeStateText(state: unknown): string {
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(clean)
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(value).sort()) {
        const field = (value as Record<string, unknown>)[key]
        if (key === 'key' || field === null || field === undefined) continue
        out[key] = clean(field)
      }
      return out
    }
    return value
  }
  if (state === null || state === undefined) return ''
  return JSON.stringify(clean(state))
}

/**
 * Every string a case supplies (props, children, interaction values), with
 * each whitespace-separated token too: an id the case wrote itself, kept
 * verbatim by the normalizer even where no element carries it.
 *
 * @param testCase - The case.
 * @returns The case's strings and their tokens.
 */
export function caseStrings(testCase: UICase): Set<string> {
  const out = new Set<string>()
  const seen = new Set<object>()
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      out.add(value)
      for (const token of value.split(/\s+/)) if (token) out.add(token)
    } else if (value && typeof value === 'object' && !seen.has(value)) {
      seen.add(value)
      for (const item of Object.values(value)) walk(item)
    }
  }
  walk(testCase)
  return out
}

/** What an adapter supplies to {@link runSteps} for one mounted case. */
export interface MountedCase {
  /** Flush the framework's pending work (effects, microtasks, change detection). */
  flush(): Promise<void>
  /** Re-render with these props merged over the current ones. */
  setProps(props: Record<string, unknown>): Promise<void>
  /** Tear the component down. */
  unmount(): Promise<void>
  /** Current route (`pathname` + `search`) of the router the component sees. */
  location(): string
  /** The current history entry's state (`navigate(to, { state })`), when the router has one. */
  locationState?(): unknown
  /** Navigates the router the component sees. */
  navigate(to: string): void
  /**
   * Runs one DOM interaction or timer advance inside the framework's update
   * scope, for a framework that requires one (React's `act`). Without it the
   * step runs directly.
   */
  wrap?(step: () => Promise<void>): Promise<void>
}

/**
 * Mounts a case, runs every interaction, snapshots after mount and after each
 * step, and unmounts. Fake timers are installed before mount when the case asks.
 *
 * @param testCase - The case.
 * @param mount - Adapter-specific mount into the container.
 * @param recorder - The recorder the adapter wired into the callbacks.
 * @returns Snapshots and calls.
 */
export async function runSteps(
  testCase: UICase,
  mount: (container: HTMLElement) => Promise<MountedCase>,
  recorder: CallRecorder,
): Promise<CaseResult> {
  if (testCase.fakeTimers)
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
  await getI18nProvider().setLocale(testCase.context?.locale ?? 'en')
  const container = freshContainer(testCase)
  const keepReferences = caseStrings(testCase)
  await loadReferenceStylesheet()
  const snapshots: string[] = []
  const readable: string[] = []
  const mounted = await mount(container)
  try {
    const snap = (): void => {
      const focus = focusPath()
      const state = routeStateText(mounted.locationState?.())
      const tail = `\n@route ${mounted.location()}${state ? ` state=${state}` : ''}${focus ? `\n@focus ${focus}` : ''}`
      const styles = referenceStyles(document)
      try {
        const options = { keepReferences, computedStyle: styles.computedStyle }
        snapshots.push(`${normalizeDom(document.body, { ...options, hashClasses: true })}${tail}`)
        readable.push(`${normalizeDom(document.body, options)}${tail}`)
      } finally {
        styles.detach()
      }
    }
    await mounted.flush()
    snap()
    for (const step of testCase.interactions ?? []) {
      await runStep(step, mounted, recorder)
      snap()
    }
  } finally {
    await mounted.unmount()
    if (testCase.fakeTimers) vi.useRealTimers()
    document.body.innerHTML = ''
  }
  return { snapshots, readable, calls: recorder.calls }
}

const runStep = async (
  step: Interaction,
  mounted: MountedCase,
  recorder: CallRecorder,
): Promise<void> => {
  if (step.type === 'props') {
    await mounted.setProps(step.props)
  } else {
    const perform = async (): Promise<void> => {
      if (step.type === 'advance') await vi.advanceTimersByTimeAsync(step.ms)
      else if (step.type === 'settle') recorder.settle(step.callback, step.value, step.error)
      else if (step.type === 'navigate') mounted.navigate(step.to)
      else if (step.type === 'locale') await getI18nProvider().setLocale(step.code)
      else performDomInteraction(step)
    }
    await (mounted.wrap ? mounted.wrap(perform) : perform())
  }
  await mounted.flush()
}

/**
 * Drains microtasks and a macrotask turn, so promise chains a component starts
 * on mount settle before the snapshot.
 */
export async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve()
  }
  if (vi.isFakeTimers()) {
    await vi.advanceTimersByTimeAsync(0)
  } else {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}
