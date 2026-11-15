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

import { freshContainer, performDomInteraction, setCaseTranslations } from './environment.js'
import { createFakeAuthClient, createFakeThemeProvider } from './fakes.js'
import { normalizeArg, normalizeDom } from './normalize.js'
import { capturePage, pixelCaptureDir } from './pixel-capture.js'
import type {
  AppComposition,
  AppServices,
  CallbackResult,
  CaseResult,
  Interaction,
  RecordedCall,
  UICase,
  WindowContext,
} from './spec.js'
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

/**
 * Builds a case's full service set for an adapter mounting through the
 * binding's composition root (`RunOptions.app`); service calls land
 * on the recorder like the UI services' calls.
 *
 * @param testCase - The case.
 * @param recorder - The case's recorder.
 * @param app - The composition the suite runs with.
 * @returns The services and their cleanup.
 */
export function buildAppServices(
  testCase: UICase,
  recorder: CallRecorder,
  app: AppComposition,
): AppServices {
  return app.services(testCase, (name, args) => {
    recorder.calls.push({ name, args: args.map(normalizeArg) })
  })
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
      this.watchSignals(name, args)
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
   * Records when an AbortSignal handed to a callback aborts, as a call
   * `<name> aborted` whose argument is the 0-based number of the call that got
   * the signal. Arguments are normalized when the call is made, so without this
   * a later abort (a query fetch cancelled because its page unmounted) would
   * leave no trace.
   *
   * @param name - The callback.
   * @param args - The arguments of the call just recorded.
   */
  private watchSignals(name: string, args: unknown[]): void {
    if (typeof AbortSignal === 'undefined') return
    const callNumber = this.calls.filter((call) => call.name === name).length - 1
    for (const arg of args) {
      if (!(arg instanceof AbortSignal) || arg.aborted) continue
      arg.addEventListener(
        'abort',
        () => this.calls.push({ name: `${name} aborted`, args: [callNumber] }),
        { once: true },
      )
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

/**
 * Puts the page into a case's {@link WindowContext}: URL, `sessionStorage` and
 * a recording `fetch`. Every request is recorded as a `fetch` call; with
 * `fetch.defer` each one waits for {@link PageControls.answerFetch}.
 *
 * @param context - The case's window context.
 * @param recorder - The case's recorder.
 * @returns What answers held requests, and what restores the page.
 */
export function applyWindowContext(
  context: WindowContext | undefined,
  recorder: CallRecorder,
): PageControls {
  const held: (() => void)[] = []
  const answerFetch = (): void => {
    const next = held.shift()
    if (!next)
      throw new Error(
        'conformance: a fetch step found no request waiting (set context.window.fetch.defer)',
      )
    next()
  }
  if (!context) return { restore: () => {}, answerFetch }
  const url = `${location.pathname}${location.search}${location.hash}`
  const storage = Object.fromEntries(
    Array.from({ length: sessionStorage.length }, (_v, i) => sessionStorage.key(i)!).map((k) => [
      k,
      sessionStorage.getItem(k)!,
    ]),
  )
  const realFetch = globalThis.fetch
  if (context.url !== undefined) history.replaceState(null, '', context.url)
  for (const [key, value] of Object.entries(context.sessionStorage ?? {}))
    sessionStorage.setItem(key, value)
  if (context.fetch) {
    const answer = context.fetch
    const record = recorder.spy('fetch')
    const headers = Object.fromEntries(
      Object.entries(answer.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    )
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const raw = init?.body
      let body: unknown = raw
      if (typeof raw === 'string') {
        try {
          body = JSON.parse(raw)
        } catch (_error) {
          // A body that is not JSON is recorded as the string it is.
          body = raw
        }
      }
      record(String(input instanceof Request ? input.url : input), {
        method: init?.method ?? 'GET',
        credentials: init?.credentials,
        body,
      })
      if (answer.defer) await new Promise<void>((resolve) => held.push(resolve))
      return {
        ok: answer.status >= 200 && answer.status < 300,
        status: answer.status,
        headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
        json: async () => answer.body,
        text: async () => JSON.stringify(answer.body ?? null),
      } as unknown as Response
    }) as typeof fetch
  }
  return {
    answerFetch,
    restore: () => {
      if (context.url !== undefined)
        recorder.calls.push({
          name: 'window.location',
          args: [`${location.pathname}${location.search}`],
        })
      globalThis.fetch = realFetch
      sessionStorage.clear()
      for (const [key, value] of Object.entries(storage)) sessionStorage.setItem(key, value)
      history.replaceState(null, '', url)
    },
  }
}

/** What {@link applyWindowContext} hands back for one case. */
export interface PageControls {
  /** Answers the oldest held page request (a `fetch` step). */
  answerFetch(): void
  /** Records the final URL (when the case set one) and restores the page. */
  restore(): void
}

/** What an adapter supplies to {@link runSteps} for one mounted case. */
export interface MountedCase {
  /** Flush the framework's pending work (effects, microtasks, change detection). */
  flush(): Promise<void>
  /** Re-render with these props merged over the current ones. */
  setProps(props: Record<string, unknown>): Promise<void>
  /**
   * Tear the component down, and only the component: what an app keeps alive
   * past one page (Angular's application and its environment injector, Vue's
   * app) stays until {@link MountedCase.dispose}, so work tied to the app
   * instead of the component is still running when an `unmount` step's later
   * steps settle it, as it would be in a real app.
   */
  unmount(): Promise<void>
  /** Tear down what outlives the component (the application), after the case. */
  dispose?(): Promise<void>
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
 * @param app - The full service set, when the case mounts through the binding's
 *   composition root (`RunOptions.app`); its controls run `http`, `auth` and `control` steps.
 * @returns Snapshots and calls.
 */
export async function runSteps(
  testCase: UICase,
  mount: (container: HTMLElement) => Promise<MountedCase>,
  recorder: CallRecorder,
  app: AppServices | null = null,
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
  setCaseTranslations(testCase.context?.translations ?? null)
  const page = applyWindowContext(testCase.context?.window, recorder)
  const container = freshContainer(testCase)
  const keepReferences = caseStrings(testCase)
  await loadReferenceStylesheet()
  const snapshots: string[] = []
  const readable: string[] = []
  const pages: string[] | null = pixelCaptureDir() ? [] : null
  let mounted: MountedCase
  try {
    mounted = await mount(container)
  } catch (error) {
    page.restore()
    setCaseTranslations(null)
    throw error
  }
  // Set by an `unmount` step: the end of the case then has nothing left to tear down, and
  // the snapshots after it keep the route the component last saw.
  const state: { unmounted: boolean; location?: string; locationState?: unknown } = {
    unmounted: false,
  }
  try {
    const snap = (note?: string): void => {
      const focus = focusPath()
      const where = state.unmounted ? (state.location ?? '') : mounted.location()
      const route = routeStateText(
        state.unmounted ? state.locationState : mounted.locationState?.(),
      )
      const tail = `\n@route ${where}${route ? ` state=${route}` : ''}${focus ? `\n@focus ${focus}` : ''}${note ? `\n${note}` : ''}`
      const styles = referenceStyles(document)
      try {
        const options = { keepReferences, computedStyle: styles.computedStyle }
        snapshots.push(`${normalizeDom(document.body, { ...options, hashClasses: true })}${tail}`)
        readable.push(`${normalizeDom(document.body, options)}${tail}`)
      } finally {
        styles.detach()
      }
      pages?.push(capturePage(document))
    }
    await mounted.flush()
    snap()
    for (const step of testCase.interactions ?? []) {
      snap(await runStep(step, mounted, recorder, app, page, state))
    }
  } finally {
    if (!state.unmounted) await mounted.unmount()
    await mounted.dispose?.()
    page.restore()
    setCaseTranslations(null)
    if (testCase.fakeTimers) vi.useRealTimers()
    document.body.innerHTML = ''
  }
  return { snapshots, readable, ...(pages ? { pages } : {}), calls: recorder.calls }
}

/** The steps that still mean something once the component is gone: they settle what it started. */
const AFTER_UNMOUNT = new Set<Interaction['type']>([
  'fetch',
  'settle',
  'advance',
  'http',
  'auth',
  'control',
])

const runStep = async (
  step: Interaction,
  mounted: MountedCase,
  recorder: CallRecorder,
  app: AppServices | null,
  page: PageControls,
  state: { unmounted: boolean; location?: string; locationState?: unknown },
): Promise<string | undefined> => {
  const controls = (): AppServices['controls'] => {
    if (!app)
      throw new Error(
        `conformance: a ${step.type} step needs the full composition (the feature's composition: 'app')`,
      )
    return app.controls
  }
  if (state.unmounted && !AFTER_UNMOUNT.has(step.type))
    throw new Error(
      `conformance: a ${step.type} step after unmount has no component to act on (only ${[...AFTER_UNMOUNT].join(', ')})`,
    )
  if (step.type === 'unmount') {
    if (state.unmounted) throw new Error('conformance: the case already unmounted')
    // The route the component last saw stays in the snapshots that follow.
    state.location = mounted.location()
    state.locationState = mounted.locationState?.()
    await mounted.unmount()
    state.unmounted = true
    await settle()
    return undefined
  }
  // A DOM step's note for the snapshot after it (whether an anchor click's default was prevented).
  let note: string | undefined
  if (step.type === 'props') {
    await mounted.setProps(step.props)
  } else {
    const perform = async (): Promise<void> => {
      if (step.type === 'advance') await vi.advanceTimersByTimeAsync(step.ms)
      else if (step.type === 'settle') recorder.settle(step.callback, step.value, step.error)
      else if (step.type === 'fetch') page.answerFetch()
      else if (step.type === 'navigate') mounted.navigate(step.to)
      else if (step.type === 'locale') await getI18nProvider().setLocale(step.code)
      else if (step.type === 'http') {
        const { method, url, status, data, networkError } = step
        controls().answerHttp({ method, url, status, data, networkError })
      } else if (step.type === 'auth') controls().setAuth(step.status, step.user)
      else if (step.type === 'control') await controls().control(step.name, step.args ?? [])
      else note = performDomInteraction(step)
    }
    // A torn-down component has no update scope or change detection left to run.
    if (state.unmounted) {
      await perform()
      await settle()
      return note
    }
    await (mounted.wrap ? mounted.wrap(perform) : perform())
  }
  await mounted.flush()
  return note
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
