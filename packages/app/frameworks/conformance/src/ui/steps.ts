/**
 * Helpers every adapter uses: services, callback recording and the step loop.
 *
 * @module
 */

import { vi } from 'vitest'

import type { AuthClient } from '@molecule/app-auth'
import { getProvider as getI18nProvider, type I18nProvider } from '@molecule/app-i18n'
import type { Router } from '@molecule/app-routing'
import type { ThemeProvider } from '@molecule/app-theme'

import { withinCaseDeadline } from './case-deadline.js'
import { createCaseRouter } from './case-router.js'
import { advanceClock, type ClockScope, installCaseClock } from './clock.js'
import {
  freshContainer,
  performDomInteraction,
  setCaseIcons,
  setCaseTranslations,
} from './environment.js'
import { createFakeAuthClient, createFakeThemeProvider } from './fakes.js'
import { installCaseGlobals } from './globals.js'
import { normalizeArg, normalizeDom } from './normalize.js'
import {
  applyLayout,
  installAudio,
  installLocalStorage,
  installSessionStorage,
  layoutNote,
  resetCasePage,
} from './page.js'
import { capturePage, pixelCaptureDir } from './pixel-capture.js'
import { isLeftOut, shownChildren } from './shown-children.js'
import type {
  AppComposition,
  AppServices,
  CallbackResult,
  CaseResult,
  EventEffect,
  Interaction,
  RecordedCall,
  UICase,
  WindowContext,
} from './spec.js'
import { checkFields, checkStepFields, type FieldsOf, type StepFields } from './step-fields.js'
import { loadReferenceStylesheet, referenceStyles } from './stylesheet.js'
import { afterRenderMillisecond } from './user-input-time.js'

/** The services one case runs against, identical for every adapter. */
export interface CaseServices {
  i18n: I18nProvider
  router: Router
  theme: ThemeProvider
  auth?: AuthClient<Record<string, unknown>>
}

/**
 * Builds the case's services. Service calls are recorded on the recorder, so a
 * component that calls `logout()` in one framework must call it in all. Every adapter builds
 * these first, so this is also where the page goes back to `/` (`resetCasePage`), before an
 * area fake mounts the case on a URL of its own.
 *
 * @param testCase - The case.
 * @param recorder - The case's recorder.
 * @returns Services to hand to the framework's providers.
 */
export function buildServices(testCase: UICase, recorder: CallRecorder): CaseServices {
  resetCasePage()
  const sink = (name: string, args: unknown[]): void => {
    recorder.calls.push({ name, args: args.map(normalizeArg) })
  }
  const i18n = getI18nProvider()
  return {
    i18n,
    router: createCaseRouter(testCase.context),
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
  /** Each callback call's arguments as passed (`calls` holds them normalized), for `invoke` steps. */
  private readonly passed: { name: string; args: unknown[] }[] = []
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
      this.passed.push({ name, args })
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
      if ('effects' in result || 'read' in result) {
        this.actOnEvent(name, args[0], result.effects ?? [], result.read ?? [])
        return undefined
      }
      return new Promise((resolve, reject) => {
        const queue = this.pending.get(name) ?? []
        queue.push({ resolve, reject })
        this.pending.set(name, queue)
      })
    }
  }

  /**
   * Calls `effects` on the event a callback received, then records the `read` paths as a
   * call `<name> read` (see {@link CallbackResult}).
   *
   * @param name - The callback.
   * @param event - The callback's first argument.
   * @param effects - The event methods to call, in order.
   * @param read - Dotted paths to read from the event afterwards.
   * @throws {Error} When the argument has no such method: the case names an effect the
   * component's event does not support.
   */
  private actOnEvent(name: string, event: unknown, effects: EventEffect[], read: string[]): void {
    for (const effect of effects) {
      const method: unknown =
        typeof event === 'object' && event !== null ? Reflect.get(event, effect) : undefined
      if (typeof method !== 'function') {
        throw new Error(`conformance: ${name} received no event with ${effect}()`)
      }
      Reflect.apply(method, event, [])
    }
    if (read.length === 0) return
    const values: Record<string, unknown> = {}
    for (const path of read) {
      let value: unknown = event
      for (const key of path.split('.')) {
        value = typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
      }
      values[path] = this.normalize(value)
    }
    this.calls.push({ name: `${name} read`, args: [values] })
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

  /**
   * Calls a function the component passed to a callback (an `invoke` step).
   *
   * @param name - The callback.
   * @param path - Where the function sits in the arguments of the callback's latest call.
   * @param args - What to call it with.
   */
  async invoke(
    name: string,
    path: readonly (string | number)[],
    args: readonly unknown[],
  ): Promise<void> {
    let call: { name: string; args: unknown[] } | undefined
    for (let index = this.passed.length - 1; index >= 0 && !call; index--)
      if (this.passed[index].name === name) call = this.passed[index]
    if (!call)
      throw new Error(`conformance: ${name} was never called, so it handed over nothing to invoke`)
    const target = path.reduce<unknown>(
      (value, key) =>
        value === null || value === undefined
          ? undefined
          : (value as Record<string | number, unknown>)[key],
      call.args,
    )
    if (typeof target !== 'function')
      throw new Error(
        `conformance: the latest ${name} call has no function at [${path.join(', ')}]`,
      )
    await target(...args)
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
  return elementPath(active)
}

/**
 * A stable path to an element in the body (`body>div:0>button:1`: tag and index among element
 * siblings), the form `@focus` and `@ref` lines use. It follows the tree the snapshot shows, so a
 * host element one framework adds and the normalizer drops does not add a level.
 *
 * @param element - An element inside `document.body`.
 * @returns The path.
 */
export function elementPath(element: Element): string {
  const parts: string[] = []
  let el: Element | null = element
  while (el && el !== document.body) {
    let parent: Element | null = el.parentElement
    while (parent && parent !== document.body && isLeftOut(parent)) parent = parent.parentElement
    const index = parent ? shownChildren(parent).indexOf(el) : 0
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
 * `localStorage` (the kit's in-memory ones, for every case, so nothing one case writes
 * reaches the next), a recording `fetch` and a recording `AudioContext`. With a
 * `sessionStorage` or `localStorage` seed, the entries left when the case ends are
 * recorded as a `sessionStorage` / `localStorage` call. Every request is recorded as a
 * `fetch` call; with `fetch.defer` each one waits for {@link PageControls.answerFetch}.
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
  const local = installLocalStorage(context?.localStorage ?? {})
  const session = installSessionStorage(context?.sessionStorage ?? {})
  const restoreStorages = (): void => {
    local.restore()
    session.restore()
  }
  if (!context) return { restore: restoreStorages, answerFetch }
  const audio = context.audio
    ? installAudio((name, args) => recorder.calls.push({ name, args }))
    : null
  const url = `${location.pathname}${location.search}${location.hash}`
  const realFetch = globalThis.fetch
  if (context.url !== undefined) history.replaceState(null, '', context.url)
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
      if (context.localStorage !== undefined)
        recorder.calls.push({ name: 'localStorage', args: [local.contents()] })
      if (context.sessionStorage !== undefined)
        recorder.calls.push({ name: 'sessionStorage', args: [session.contents()] })
      audio?.restore()
      restoreStorages()
      globalThis.fetch = realFetch
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
  /**
   * Mount the component again after {@link MountedCase.unmount}, in the same app (its
   * services, router and the props it last had), for a `remount` step. An adapter without
   * it fails a case that remounts.
   */
  remount?(): Promise<void>
  /** Tear down what outlives the component (the application), after the case. */
  dispose?(): Promise<void>
  /** Current route (`pathname` + `search`) of the router the component sees. */
  location(): string
  /** The current history entry's state (`navigate(to, { state })`), when the router has one. */
  locationState?(): unknown
  /** Navigates the router the component sees. */
  navigate(to: string): void
  /**
   * Runs one DOM interaction, or one timer callback of an `advance` step, inside the
   * framework's update scope, for a framework that requires one (React's `act`). The
   * framework renders and runs its effects before it returns. Without it the work runs directly.
   */
  wrap?(step: () => Promise<void>): Promise<void>
  /**
   * The element the component handed a caller's ref through the kit's ref API, or null (see
   * {@link UICase.ref}). Required by a case that sets `ref`.
   */
  refElement?(): Element | null
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
 * @param deadlineMs - Milliseconds the steps may run, or `null` for no deadline; by default the
 *   current test's timeout less its teardown margin ({@link withinCaseDeadline}), read when the
 *   steps start.
 * @returns Snapshots and calls.
 */
export async function runSteps(
  testCase: UICase,
  mount: (container: HTMLElement) => Promise<MountedCase>,
  recorder: CallRecorder,
  app: AppServices | null = null,
  deadlineMs?: number | null,
): Promise<CaseResult> {
  checkCaseFields(testCase)
  installCaseClock(testCase)
  // The case's translations first: they name the locales the case may start in.
  setCaseTranslations(testCase.context?.translations ?? null)
  setCaseIcons(testCase.context?.icons ?? null)
  await getI18nProvider().setLocale(testCase.context?.locale ?? 'en')
  const globals = installCaseGlobals(testCase, (name, args) => {
    recorder.calls.push({ name, args: args.map(normalizeArg) })
  })
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
    globals.restore()
    page.restore()
    setCaseTranslations(null)
    setCaseIcons(null)
    if (testCase.fakeTimers || testCase.now !== undefined) vi.useRealTimers()
    throw error
  }
  // Set by an `unmount` step: the end of the case then has nothing left to tear down, and
  // the snapshots after it keep the route the component last saw.
  const state: { unmounted: boolean; location?: string; locationState?: unknown } = {
    unmounted: false,
  }
  let failed: { error: unknown } | null = null
  try {
    if (testCase.ref && !mounted.refElement)
      throw new Error(
        `conformance: "${testCase.name}" reads the component's ref element, and this adapter has no refElement`,
      )
    const snap = (note?: string): void => {
      applyLayout()
      const scroll = layoutNote()
      if (scroll) note = note ? `${note}\n${scroll}` : scroll
      const focus = focusPath()
      const where = state.unmounted ? (state.location ?? '') : mounted.location()
      const route = routeStateText(
        state.unmounted ? state.locationState : mounted.locationState?.(),
      )
      const refElement = testCase.ref ? (mounted.refElement?.() ?? null) : null
      const refLine = testCase.ref
        ? `\n@ref ${refElement?.isConnected ? elementPath(refElement) : 'none'}`
        : ''
      const tail = `\n@route ${where}${route ? ` state=${route}` : ''}${focus ? `\n@focus ${focus}` : ''}${refLine}${note ? `\n${note}` : ''}`
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
    // A step that never settles fails the case here, so the `finally` below still tears down.
    await withinCaseDeadline(
      testCase.name,
      async (progress) => {
        await mounted.flush()
        snap()
        let renderedAt = Date.now()
        for (const [index, step] of (testCase.interactions ?? []).entries()) {
          if (progress.abandoned) return
          progress.at = `step ${index + 1} (${step.type})`
          afterRenderMillisecond(renderedAt)
          applyLayout()
          snap(await runStep(step, mounted, recorder, app, page, state))
          renderedAt = Date.now()
        }
      },
      deadlineMs,
    )
  } catch (error) {
    failed = { error }
  }
  await tearDownCase(failed, [
    () => (state.unmounted ? undefined : mounted.unmount()),
    () => mounted.dispose?.(),
    () => globals.restore(),
    () => page.restore(),
    () => setCaseTranslations(null),
    () => setCaseIcons(null),
    () => {
      if (testCase.fakeTimers || testCase.now !== undefined) vi.useRealTimers()
    },
    () => {
      document.body.innerHTML = ''
    },
  ])
  return { snapshots, readable, ...(pages ? { pages } : {}), calls: recorder.calls }
}

/**
 * Runs every teardown step of a case even when one throws, then fails with what went wrong.
 * A step skipped here leaves its part of the case (the mounted app, the fake clock, the page
 * globals) in place for the cases after it, which then record its work as their own.
 *
 * @param failed - The error the case's steps failed with, if they did.
 * @param steps - The teardown steps, in order.
 * @returns Once every step ran, when neither the case nor its teardown failed.
 */
async function tearDownCase(
  failed: { error: unknown } | null,
  steps: readonly (() => unknown)[],
): Promise<void> {
  const errors: unknown[] = []
  for (const step of steps) {
    try {
      await step()
    } catch (error) {
      errors.push(error)
    }
  }
  if (failed && errors.length === 0) throw failed.error
  if (failed || errors.length > 1) {
    throw new AggregateError(
      failed ? [failed.error, ...errors] : errors,
      failed
        ? `${(failed.error as Error)?.message ?? String(failed.error)} (and the case's teardown failed too)`
        : "conformance: the case's teardown failed",
    )
  }
  if (errors.length === 1) throw errors[0]
}

/** The fields a UI case takes. */
const CASE_FIELDS: FieldsOf<UICase> = {
  name: 'required',
  ref: 'optional',
  props: 'optional',
  children: 'optional',
  slots: 'optional',
  callbacks: 'optional',
  callbackResults: 'optional',
  interactions: 'optional',
  context: 'optional',
  fakeTimers: 'optional',
  now: 'optional',
  random: 'optional',
  viewportWidth: 'optional',
  pointer: 'optional',
  layout: 'optional',
  a11y: 'optional',
  goldensGroup: 'optional',
}

/** The fields each interaction takes. */
const INTERACTION_FIELDS: StepFields<Interaction> = {
  click: { selector: 'required', modifiers: 'optional' },
  dblclick: { selector: 'required' },
  focus: { selector: 'required' },
  blur: { selector: 'required' },
  mouseenter: { selector: 'required' },
  mouseleave: { selector: 'required' },
  pointerdown: { selector: 'required' },
  keydown: {
    selector: 'required',
    key: 'required',
    isComposing: 'optional',
    keyCode: 'optional',
    metaKey: 'optional',
    ctrlKey: 'optional',
    shiftKey: 'optional',
    altKey: 'optional',
  },
  input: { selector: 'required', value: 'required' },
  check: { selector: 'required', checked: 'required' },
  submit: { selector: 'required' },
  advance: { ms: 'required' },
  props: { props: 'required' },
  settle: { callback: 'required', value: 'optional', error: 'optional' },
  invoke: { callback: 'required', path: 'required', args: 'optional' },
  navigate: { to: 'required' },
  event: { selector: 'required', event: 'required', bubbles: 'optional' },
  scroll: { selector: 'required', top: 'required' },
  windowFocus: { focused: 'required' },
  resize: { selector: 'required', width: 'optional', height: 'optional' },
  cues: { selector: 'required', cues: 'required' },
  locale: { locale: 'required' },
  mark: { selector: 'required' },
  http: {
    method: 'required',
    url: 'required',
    status: 'optional',
    data: 'optional',
    networkError: 'optional',
  },
  auth: { status: 'required', user: 'optional' },
  control: { name: 'required', args: 'optional' },
  pointer: { selector: 'required', event: 'required', clientX: 'optional', clientY: 'optional' },
  transfer: { selector: 'required', event: 'required', files: 'optional', data: 'optional' },
  message: { data: 'optional', origin: 'optional', from: 'optional' },
  localStorage: { key: 'required', value: 'required' },
  fetch: {},
  unmount: {},
  remount: {},
}

/**
 * Fails a UI case that carries a field the case or one of its interactions does
 * not take (a misspelled field is otherwise never read, and the case tests nothing).
 *
 * @param testCase - The case.
 */
export function checkCaseFields(testCase: UICase): void {
  checkFields(testCase, CASE_FIELDS, `the case "${testCase.name}"`)
  ;(testCase.interactions ?? []).forEach((step, index) =>
    checkStepFields(step, INTERACTION_FIELDS, `interaction ${index + 1} of "${testCase.name}"`),
  )
}

/** The steps that still mean something once the component is gone: they settle what it started, or mount it again. */
const AFTER_UNMOUNT = new Set<Interaction['type']>([
  'fetch',
  'settle',
  'invoke',
  'advance',
  'http',
  'auth',
  'control',
  'message',
  'localStorage',
  'remount',
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
  if (step.type === 'remount') {
    if (!mounted.remount)
      throw new Error('conformance: this adapter cannot remount a component (MountedCase.remount)')
    if (!state.unmounted) {
      await mounted.unmount()
      await settle()
    }
    await mounted.remount()
    state.unmounted = false
    await mounted.flush()
    return undefined
  }
  // A DOM step's note for the snapshot after it (whether an anchor click's default was prevented).
  let note: string | undefined
  if (step.type === 'advance') {
    // One timer callback at a time, each in the framework's update scope (`./clock.ts`); a
    // torn-down component has no scope left.
    const scope: ClockScope | undefined =
      !state.unmounted && mounted.wrap ? (work) => mounted.wrap!(work) : undefined
    await advanceClock(step.ms, scope)
    if (state.unmounted) {
      await settle()
      return undefined
    }
  } else if (step.type === 'props') {
    await mounted.setProps(step.props)
  } else {
    const perform = async (): Promise<void> => {
      if (step.type === 'settle') recorder.settle(step.callback, step.value, step.error)
      else if (step.type === 'invoke')
        await recorder.invoke(step.callback, step.path, step.args ?? [])
      else if (step.type === 'fetch') page.answerFetch()
      else if (step.type === 'navigate') mounted.navigate(step.to)
      else if (step.type === 'locale') await getI18nProvider().setLocale(step.locale)
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
 * on mount settle before the snapshot. Under fake timers it runs the timers due now, one at a
 * time (`advanceClock(0)`).
 *
 * @param scope - The framework's update scope (React's `act`) each piece of work runs in.
 */
export async function settle(scope: ClockScope = (work) => work()): Promise<void> {
  await scope(async () => {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve()
    }
  })
  if (vi.isFakeTimers()) {
    await advanceClock(0, scope)
  } else {
    await scope(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
  }
}
