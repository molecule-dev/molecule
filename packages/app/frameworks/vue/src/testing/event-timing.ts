/**
 * Event timing for Vue component tests in a DOM environment (jsdom, happy-dom).
 *
 * Vue skips a listener for an event that one of its listeners saw first no later than the
 * millisecond the skipped listener was attached in: its guard against a listener added during
 * the event's own dispatch (`createInvoker` in `@vue/runtime-dom`). A user never acts in the
 * millisecond a page rendered in, but a test does: it mounts, waits for `nextTick()` (which does
 * not move the clock) and fires an event, and when a descendant and an ancestor mounted together
 * both listen for it, the ancestor's listener is skipped in some runs and not others.
 *
 * {@link installEventTiming} handles both sides of that:
 *
 * - A test's own action (`dispatchEvent`, `fireEvent`, VTU `trigger`, `click()`,
 *   `requestSubmit()`) waits, without yielding, until `Date.now()` has passed the last listener
 *   attach, so it lands after the render the way a user's does. Under a faked `Date` (fake
 *   timers) it does not wait, and a `Date.now()` that never moves is left after
 *   {@link ATTACH_MILLISECOND_LIMIT_MS}.
 * - An event the page fires itself (a `focus()`, `requestSubmit()` or `dispatchEvent()` from
 *   component code, or a test's own `focus()`) in the task that attached a later Vue listener on
 *   its path is a defect a browser has too, whenever that render takes under a millisecond. It is
 *   recorded as a problem naming the element and listener; `@molecule/app-vue/testing/setup`
 *   fails the test with it. "Same task" does not depend on timing, so this check never flakes.
 *
 * Component code is told apart from the test by the call stack: Vue calls every component
 * callback (setup, lifecycle hooks, watchers, event handlers, refs) through
 * `callWithErrorHandling` or `callWithAsyncErrorHandling`.
 *
 * @module
 */

import { callWithErrorHandling, createApp, h } from 'vue'

/** How long a test's event waits for `Date.now()` to pass the last listener attach. */
export const ATTACH_MILLISECOND_LIMIT_MS = 5

/** The installed event timing of one window. */
export interface EventTiming {
  /** The problems recorded since the last call, oldest first; the list is emptied. */
  takeProblems(): string[]
  /** Restores the patched methods; {@link EventTiming.resume} patches them again. */
  pause(): void
  /** Patches the methods again after {@link EventTiming.pause}. */
  resume(): void
}

const VUE_FRAME = /\bcallWith(?:Async)?ErrorHandling\b/
const OPTION_MODIFIER = /(Once|Passive|Capture)$/
const OPTION_MODIFIER_EVENT = /^on:?(?:Once|Passive|Capture)$/

/** A Vue listener an event will reach, in dispatch order. */
interface VueListener {
  element: Element
  key: string
  invoker: unknown
}

/**
 * Whether the current call came from component code (Vue calls it through its error handling).
 *
 * @returns True when a `callWithErrorHandling` frame is on the stack.
 */
function insideVue(): boolean {
  const limit = Error.stackTraceLimit
  Error.stackTraceLimit = 80
  const stack = new Error().stack ?? ''
  Error.stackTraceLimit = limit
  return VUE_FRAME.test(stack)
}

/**
 * The DOM event name and capture flag of a key in Vue's listener map, as `@vue/runtime-dom` parses
 * it (`onKeydown` → keydown, `onClickCapture` → click in the capture phase).
 *
 * @param key - The key.
 * @returns The event name and whether the listener captures.
 */
function parseListenerKey(key: string): { type: string; capture: boolean } {
  let name = key
  let capture = false
  let match: RegExpMatchArray | null
  while ((match = name.match(OPTION_MODIFIER)) && !OPTION_MODIFIER_EVENT.test(name)) {
    name = name.slice(0, name.length - match[1].length)
    if (match[1] === 'Capture') capture = true
  }
  const type =
    name[2] === ':'
      ? name.slice(3)
      : name
          .slice(2)
          .replace(/\B([A-Z])/g, '-$1')
          .toLowerCase()
  return { type, capture }
}

/**
 * A short description of an element for a problem message.
 *
 * @param element - The element.
 * @returns Its tag, id, role, classes and the start of its text.
 */
function describeElement(element: Element): string {
  const id = element.id ? `#${element.id}` : ''
  const role = element.getAttribute('role')
  const classes = element.getAttribute('class')
  const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 30)
  return (
    `<${element.tagName.toLowerCase()}${id}` +
    `${role ? ` role="${role}"` : ''}${classes ? ` class="${classes.slice(0, 40)}"` : ''}>` +
    `${text ? ` "${text}"` : ''}`
  )
}

/**
 * The first stack frame outside this module and `node_modules`: where the event was fired.
 *
 * @param stack - A stack trace.
 * @returns The frame, or `unknown`.
 */
function callSite(stack: string): string {
  const frames = stack.split('\n').slice(1)
  const own = frames.find((frame) => !/event-timing|node_modules|node:internal/.test(frame))
  return own?.trim().replace(/^at /, '') ?? 'unknown'
}

/**
 * Finds the symbol Vue keeps an element's listener map under, by mounting one listener.
 *
 * @param document - The document to mount in.
 * @returns The symbol.
 * @throws {Error} When Vue no longer keeps its listeners where this module reads them.
 */
function findListenerMapKey(document: Document): symbol {
  const host = document.createElement('div')
  const app = createApp({ render: () => h('div', { onClick: () => undefined }) })
  app.mount(host)
  const element = host.firstElementChild
  const key = element
    ? Object.getOwnPropertySymbols(element).find((symbol) => symbol.description === '_vei')
    : undefined
  app.unmount()
  if (!key)
    throw new Error(
      "@molecule/app-vue/testing: Vue no longer keeps an element's listeners under Symbol(_vei), " +
        'so the event timing check cannot see them. Update findListenerMapKey for this Vue version.',
    )
  return key
}

/** Where an installed timing is kept on its window, so a second install returns it. */
const INSTALLED = Symbol.for('@molecule/app-vue/testing:event-timing')

/**
 * Patches a window's event methods so a test's actions land after the render they follow, and
 * records events the page fires itself into a Vue listener attached in the same task.
 *
 * Installing twice on one window returns the first installation.
 *
 * @param win - The window to patch (the test environment's global one by default).
 * @returns The installed timing.
 * @throws {Error} When Vue's listener map or error-handling frames cannot be read.
 */
export function installEventTiming(win: Window & typeof globalThis = window): EventTiming {
  const installed = (win as unknown as Record<symbol, EventTiming | undefined>)[INSTALLED]
  if (installed) return installed
  const listenerMap = findListenerMapKey(win.document)
  let seenFromVue = false
  callWithErrorHandling(() => (seenFromVue = insideVue()), null, 0)
  if (!seenFromVue)
    throw new Error(
      '@molecule/app-vue/testing: no callWithErrorHandling frame on the stack of a Vue callback, ' +
        'so component code cannot be told apart from the test. Update VUE_FRAME for this Vue version.',
    )

  const now = performance.now.bind(performance)
  const RealDate = globalThis.Date
  const later: (run: () => void) => void =
    typeof setImmediate === 'function'
      ? setImmediate.bind(globalThis)
      : (run) => void Promise.resolve().then(run)
  const target = win.EventTarget.prototype
  const element = win.HTMLElement.prototype
  const form = win.HTMLFormElement.prototype
  const original = {
    addEventListener: target.addEventListener,
    dispatchEvent: target.dispatchEvent,
    click: element.click,
    requestSubmit: form.requestSubmit as HTMLFormElement['requestSubmit'] | undefined,
  }

  let lastAttach = -Infinity
  /** Listeners attached in the current task, cleared at the next macrotask or test action. */
  const attachedThisTask = new Set<unknown>()
  let clearScheduled = false
  const watchedTypes = new Set<string>()
  const problems: string[] = []
  let testActions = 0

  const listenersOf = (node: EventTarget, type: string, capture: boolean): VueListener[] => {
    if (!(node instanceof win.Element)) return []
    const map = (node as unknown as Record<symbol, Record<string, unknown> | undefined>)[
      listenerMap
    ]
    if (!map) return []
    const found: VueListener[] = []
    for (const [key, invoker] of Object.entries(map)) {
      if (!invoker) continue
      const parsed = parseListenerKey(key)
      if (parsed.type === type && parsed.capture === capture)
        found.push({ element: node, key, invoker })
    }
    return found
  }

  /** Runs in the capture phase at the document, before any Vue listener sees the event. */
  const check = (event: Event): void => {
    if (attachedThisTask.size === 0) return
    if (testActions > 0 && !insideVue()) return
    const path = event.composedPath()
    const order = [
      ...[...path].reverse().flatMap((node) => listenersOf(node, event.type, true)),
      ...(event.bubbles ? path : path.slice(0, 1)).flatMap((node) =>
        listenersOf(node, event.type, false),
      ),
    ]
    if (order.length < 2) return
    const first = order[0]
    for (const listener of order.slice(1)) {
      if (!attachedThisTask.has(listener.invoker)) continue
      const message =
        `Vue can skip the ${listener.key} listener on ${describeElement(listener.element)} for this ` +
        `"${event.type}" event: ${describeElement(first.element)} handles it first, and the event was fired ` +
        `in the task that attached that listener. A browser skips it too when the render takes under a ` +
        `millisecond. Fired at: ${callSite(new Error().stack ?? '')}. ` +
        `Fire it in a later task (after a timer or an animation frame), or add that listener with ` +
        `addEventListener in onMounted; in a test, use fireEvent (fireEvent.focusIn for focus) ` +
        `instead of calling focus() directly.`
      if (!problems.includes(message)) problems.push(message)
    }
  }

  // On the document, in the capture phase: Vue attaches listeners to elements only, all below it.
  // (Not the window: in vitest's jsdom environment `window` is the runner's global object, which
  // the DOM's methods refuse as `this`.)
  const watch = (type: string): void => {
    if (watchedTypes.has(type)) return
    original.addEventListener.call(win.document, type, check as EventListener, true)
    watchedTypes.add(type)
  }

  const scheduleClear = (): void => {
    if (clearScheduled) return
    clearScheduled = true
    later(() => {
      attachedThisTask.clear()
      clearScheduled = false
    })
  }

  /** A test's action: land after the last attach, in what counts as a later task. */
  const testAction = <T>(run: () => T): T => {
    if (insideVue()) return run()
    if (globalThis.Date === RealDate) {
      const giveUpAt = now() + ATTACH_MILLISECOND_LIMIT_MS
      while (Date.now() <= lastAttach && now() < giveUpAt) {
        // Waits for the clock without yielding, so no timer or promise runs in between.
      }
    }
    attachedThisTask.clear()
    testActions++
    try {
      return run()
    } finally {
      testActions--
    }
  }

  const patched = {
    addEventListener(
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      lastAttach = Date.now()
      if (listener) {
        attachedThisTask.add(listener)
        scheduleClear()
      }
      watch(type)
      original.addEventListener.call(this, type, listener, options)
    },
    dispatchEvent(this: EventTarget, event: Event): boolean {
      return testAction(() => original.dispatchEvent.call(this, event))
    },
    click(this: HTMLElement): void {
      testAction(() => original.click.call(this))
    },
    requestSubmit(this: HTMLFormElement, submitter?: HTMLElement | null): void {
      testAction(() => original.requestSubmit?.call(this, submitter))
    },
  }

  const resume = (): void => {
    target.addEventListener = patched.addEventListener
    target.dispatchEvent = patched.dispatchEvent
    element.click = patched.click
    if (original.requestSubmit) form.requestSubmit = patched.requestSubmit
  }
  const pause = (): void => {
    target.addEventListener = original.addEventListener
    target.dispatchEvent = original.dispatchEvent
    element.click = original.click
    if (original.requestSubmit) form.requestSubmit = original.requestSubmit
  }
  resume()

  const timing: EventTiming = {
    takeProblems: () => problems.splice(0),
    pause,
    resume,
  }
  ;(win as unknown as Record<symbol, EventTiming>)[INSTALLED] = timing
  return timing
}
