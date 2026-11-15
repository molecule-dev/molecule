/**
 * Framework-neutral description of one render of a UI component.
 *
 * A {@link UICase} is rendered by every framework adapter (React, Vue, Solid,
 * Svelte, Angular). Each adapter turns the neutral props, children and slots
 * into its framework's own idiom (React elements, Vue VNodes/slots, Solid
 * JSX values, Svelte snippets, Angular inputs + projected nodes), mounts the
 * component into jsdom, runs the same interactions, and hands back the
 * normalized DOM and every callback call. The suite asserts they are equal.
 *
 * Equal DOM (tags, attributes, class tokens, inline styles, text) rendered
 * with the same ClassMap stylesheet is what makes the frameworks pixel-equal:
 * no framework injects its own styles, so nothing else can move a pixel.
 *
 * @module
 */

import type { Translations } from '@molecule/app-i18n'

import type { BindingServices } from '../bindings/spec.js'

/**
 * A neutral node: plain text, an element with attributes and children, or one
 * of the UI package's own components (for compound components such as
 * `Card` > `CardHeader`, or `UserMenuPopover` > `UserMenuPopoverTrigger`).
 */
export type NodeSpec = string | ElementSpec | ComponentSpec | ProbeSpec

/** A plain DOM element. */
export interface ElementSpec {
  /** Element tag name (`span`, `strong`, `svg`, …). */
  tag: string
  /** Attributes, written as HTML attribute names (`data-x`, `aria-label`). */
  attrs?: Record<string, string>
  /** Child nodes. */
  children?: NodeSpec[]
}

/** A component exported by the UI package under test (same name in every framework). */
export interface ComponentSpec {
  /** Export name (`CardHeader`). */
  component: string
  /** Neutral data props. */
  props?: Record<string, unknown>
  /** Default children. */
  children?: NodeSpec[]
  /** Node-valued props, as in {@link UICase.slots}. */
  slots?: Record<string, NodeSpec[]>
}

/**
 * A button that calls a context hook of the UI package when clicked, e.g.
 * `{ probe: 'useToast', method: 'addToast', args: [{ title: 'Saved' }], label: 'add' }`
 * renders `<button type="button" data-parity-probe="add">add</button>` inside the
 * component under test; clicking it runs `useToast().addToast({ title: 'Saved' })`.
 * Every framework renders the same button, so it reads the same in snapshots.
 */
export interface ProbeSpec {
  /** The UI package's hook export (`useToast`, `usePanelClose`). */
  probe: string
  /** The method of the hook's result to call (omit when the hook returns the function itself). */
  method?: string
  /** Arguments for the call (plain data). */
  args?: unknown[]
  /** The button's text and `data-parity-probe` value. */
  label: string
  /**
   * The hook returns a value (`useIsDesktop`): the probe shows it, kept
   * current, as `data-parity-value`. Without it the hook returns something to
   * call, and clicking the probe calls it.
   */
  value?: true
}

/*
 * How every adapter renders a probe:
 * `<button type="button" data-parity-probe={label}>{label}</button>`. For a
 * `value` probe the hook's result is unwrapped from the framework's reactive
 * container (Vue ref, Solid accessor, Svelte store, Angular signal) and shown as
 * `data-parity-value={JSON.stringify(value)}`. Clicking calls `method` of the
 * result when set, otherwise (for a probe that is not a `value` probe) the
 * result itself. `probeValue` and `callProbe` implement this.
 */

/**
 * Narrows a node to a probe node.
 *
 * @param node - The node.
 * @returns Whether it is a hook probe button.
 */
export const isProbeSpec = (node: NodeSpec): node is ProbeSpec =>
  typeof node === 'object' && 'probe' in node

/**
 * A node value placed anywhere inside props, for node-valued fields of data
 * props (`items[0].icon`, `tabs[1].content`). Each framework passes its own
 * node type there (React node, Vue VNode, Solid JSX, Svelte snippet, Angular
 * `TemplateRef`).
 */
export interface NodesValue {
  $nodes: NodeSpec[]
}

/**
 * A function placed anywhere inside props that is not a callback prop: a
 * render function (`TableColumn.render`), a key function (`rowKey`), a label
 * formatter (`labels.goToPage`). It returns `returns`; or `format` with `{0}`
 * and `{0.field}` replaced from its arguments; or `nodes` (strings
 * interpolated the same way) as the framework's node type. Its calls are NOT
 * recorded: frameworks call render functions a different number of times, and
 * what they return is already visible in the DOM.
 */
export interface FnValue {
  $fn: string
  returns?: unknown
  format?: string
  nodes?: NodeSpec[]
}

/**
 * A callback placed inside a data prop (`oauthConfig.navigate`), where a
 * top-level {@link UICase.callbacks} entry cannot reach. Each adapter installs
 * the same recording spy it installs for a callback prop, so its calls are
 * recorded under `$callback` and it returns what {@link UICase.callbackResults}
 * says for that name.
 */
export interface CallbackValue {
  $callback: string
}

/**
 * Narrows a value to a nested callback marker.
 *
 * @param value - Any prop value.
 * @returns Whether it is `{ $callback }`.
 */
export const isCallbackValue = (value: unknown): value is CallbackValue =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as CallbackValue).$callback === 'string'

/**
 * Narrows a value to a node value.
 *
 * @param value - Any prop value.
 * @returns Whether it is `{ $nodes }`.
 */
export const isNodesValue = (value: unknown): value is NodesValue =>
  typeof value === 'object' && value !== null && Array.isArray((value as NodesValue).$nodes)

/**
 * Narrows a value to a function value.
 *
 * @param value - Any prop value.
 * @returns Whether it is `{ $fn }`.
 */
export const isFnValue = (value: unknown): value is FnValue =>
  typeof value === 'object' && value !== null && typeof (value as FnValue).$fn === 'string'

/**
 * Narrows a node to a component node.
 *
 * @param node - The node.
 * @returns Whether it names a UI component.
 */
export const isComponentSpec = (node: NodeSpec): node is ComponentSpec =>
  typeof node === 'object' && 'component' in node

/**
 * Modifier keys held during a `click` step (a ctrl/cmd-click opens a new tab,
 * shift-click a new window, alt-click downloads).
 */
export interface ClickModifiers {
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

/**
 * One user action, run against `document` after mount. `selector` is a CSS
 * selector resolved with `document.querySelector` (portals included).
 *
 * A `click` inside an `a[href]` adds `@click default prevented` or
 * `@click default kept` to the snapshot after it: whether the browser would
 * still follow the anchor. A router link must prevent a plain click and keep a
 * modified one.
 */
export type Interaction =
  | { type: 'click'; selector: string; modifiers?: ClickModifiers }
  | { type: 'dblclick'; selector: string }
  | { type: 'focus'; selector: string }
  | { type: 'blur'; selector: string }
  | { type: 'mouseenter'; selector: string }
  | { type: 'mouseleave'; selector: string }
  | { type: 'pointerdown'; selector: string }
  /** A key press on the element; it bubbles, so `document`/`window` shortcut listeners see it too. */
  | ({ type: 'keydown'; selector: string; key: string } & ClickModifiers)
  /** Sets `.value` (or `.checked` for checkbox/radio) and dispatches `input` + `change`. */
  | { type: 'input'; selector: string; value: string }
  | { type: 'check'; selector: string; checked: boolean }
  | { type: 'submit'; selector: string }
  /** Advances fake timers by `ms` (cases that use timers set `fakeTimers: true`). */
  | { type: 'advance'; ms: number }
  /** Re-renders with these props merged over the current ones. */
  | { type: 'props'; props: Record<string, unknown> }
  /** Settles the oldest pending call of a callback listed with `defer` in {@link UICase.callbackResults}. */
  | { type: 'settle'; callback: string; value?: unknown; error?: string }
  /** Navigates the router the component sees (as a link elsewhere in the app would). */
  | { type: 'navigate'; to: string }
  /**
   * Dispatches a plain DOM event (`error` / `load` on an image, `scroll`, `resize`).
   * `selector` may be `window` or `document`.
   */
  | { type: 'event'; selector: string; event: string; bubbles?: boolean }
  /**
   * Switches the bonded i18n provider's locale, as a language picker elsewhere in the app
   * would. Translated text must follow at once: React's components re-render through
   * `useTranslation()`.
   */
  | { type: 'locale'; code: string }
  /**
   * Stamps `data-conformance-mark="<n>"` on every element matching `selector`, from outside
   * the framework. A later snapshot shows which DOM nodes the component kept: a node it
   * re-created has lost its mark. React keeps a node while its `key` is unchanged.
   */
  | { type: 'mark'; selector: string }
  /**
   * Answers the oldest pending request for this method + URL, one the case's
   * scripted HTTP held back (a `context.http` entry with `defer: true`), so the
   * snapshots before it show the loading state. Needs the full composition
   * (`composition: 'app'`).
   */
  | {
      type: 'http'
      method: string
      url: string
      status?: number
      data?: unknown
      networkError?: string
    }
  /**
   * Changes auth state from outside the component, as a sign-in elsewhere,
   * another account or an expired session would. Needs the full composition
   * (`composition: 'app'`).
   */
  | {
      type: 'auth'
      status: 'authenticated' | 'unauthenticated' | 'loading' | 'unavailable'
      user?: Record<string, unknown>
    }
  /**
   * Calls a control an area's fakes registered (`chat.emit`, `chat.finish`, `chat.fail`, …),
   * as the service on the other side would: a stream event arriving, a run ending. Needs the
   * full composition (`composition: 'app'`) and the area seeded in `context.areas`.
   */
  | { type: 'control'; name: string; args?: unknown[] }
  /**
   * Answers the oldest page `fetch` still waiting, with the case's
   * `context.window.fetch` answer (one with `defer: true`).
   */
  | { type: 'fetch' }
  /**
   * Tears the component down, as leaving the page would. Later steps (`fetch`,
   * `settle`, `advance`, `http`, `auth`) settle what it started; each snapshot
   * shows the page it left. React calls no callback prop after unmount, so work
   * that settles afterwards must not reach one.
   */
  | { type: 'unmount' }

/** Framework-neutral app context a component may read (auth, theme, route, locale). */
export interface CaseContext {
  /** Auth state served by the fake auth client. Omit for components that do not read auth. */
  auth?: {
    status: 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable'
    user?: Record<string, unknown> | null
  }
  /** Initial theme mode served by the fake theme provider. */
  theme?: 'light' | 'dark'
  /** Initial route path for the memory router. */
  route?: string
  /** Initial locale for the i18n provider (default `en`). */
  locale?: string
  /**
   * Translations the bonded i18n provider serves for this case only, per
   * locale (`{ en: { content: { privacyPolicy: '…' } } }`). A locale without
   * the key falls back to `en`. Values interpolate `{{name}}` like any translation.
   */
  translations?: Partial<Record<string, Translations>>
  /** Browser state outside the router, for components that read the page itself. */
  window?: WindowContext
}

/**
 * Browser state a case starts from. The kit sets it before mount and restores
 * it after, so every framework sees the same page.
 */
export interface WindowContext {
  /** `window.location` path and query (`/login?code=c1&state=s1`), set with `history.replaceState`. */
  url?: string
  /** `sessionStorage` entries. */
  sessionStorage?: Record<string, string>
  /**
   * What `fetch` answers, for every request. Each request is recorded as a
   * `fetch` call: `[url, { method, body }]`, with a JSON body parsed.
   */
  fetch?: FetchAnswer
}

/** One `fetch` answer. */
export interface FetchAnswer {
  status: number
  /** JSON body. */
  body?: unknown
  headers?: Record<string, string>
  /** Holds every request until a `fetch` step answers it, oldest first. */
  defer?: boolean
}

/** One render case of one component. */
export interface UICase {
  /** Short unique name within the component (`solid primary`, `loading with text`). */
  name: string
  /** Neutral props. Callback props are listed in {@link UICase.callbacks}, not here. */
  props?: Record<string, unknown>
  /** Default children. */
  children?: NodeSpec[]
  /**
   * Node-valued props (`leftIcon`, `footer`, `title` when it is a node, …). In React
   * these are element props; Vue receives them as both a VNode prop and a named slot;
   * Solid as JSX values; Svelte as snippet props; Angular as projected content with
   * `[slot=<name>]`.
   */
  slots?: Record<string, NodeSpec[]>
  /**
   * Callback prop names (React spelling, e.g. `onClick`, `onChange`, `onOpenChange`).
   * Each adapter installs a recording spy under that framework's name for it.
   */
  callbacks?: string[]
  /**
   * What a callback returns (default `undefined`): a value, a resolved or
   * rejected promise, or a promise that stays pending until a `settle` step.
   */
  callbackResults?: Record<string, CallbackResult>
  /** Actions to run after mount; a snapshot is compared after each one. */
  interactions?: Interaction[]
  /** App context. */
  context?: CaseContext
  /** Use fake timers for this case (needed by `advance` interactions). */
  fakeTimers?: boolean
  /**
   * Viewport width for `matchMedia('(min-width: …)')` queries (default 1280).
   * Responsive components (shells, drawers) are rendered at this width.
   */
  viewportWidth?: number
}

/**
 * What a recorded callback returns. `pick` returns part of its arguments
 * (`[0, 'count']` is `args[0].count`; a missing step gives `undefined`).
 */
export type CallbackResult =
  | { returns: unknown }
  | { resolve: unknown }
  | { reject: string }
  | { defer: true }
  | { pick: (string | number)[] }

/** All cases of one component, keyed by its React export name. */
export interface UIComponentCases {
  /** The export name in `@molecule/app-ui-react` (and every other UI package). */
  component: string
  cases: UICase[]
  /**
   * List props whose items React renders keyed. For each entry the kit derives two cases
   * from the named case (default: the first): the rendered items are marked, then the same
   * items are passed again as new, equal objects; or passed again reversed. The snapshots
   * show which DOM nodes survive, so a framework that keys by object identity (re-creating
   * every row on equal data) or by position (where React keys by value) fails.
   */
  keyedLists?: KeyedList[]
}

/** One keyed list of a component; see {@link UIComponentCases.keyedLists}. */
export interface KeyedList {
  /** The array prop (`data`, `options`, `items`). */
  prop: string
  /** The rendered element of one item (`tbody tr`, `option`, `[role="tab"]`). */
  selector: string
  /** The case to derive from (default: the family's first case). */
  caseName?: string
}

/** A recorded callback invocation, with arguments normalized to plain data. */
export interface RecordedCall {
  name: string
  args: unknown[]
}

/** What one adapter returns for one case: a snapshot per step plus every callback call. */
export interface CaseResult {
  /**
   * Normalized DOM with hashed class tokens. `snapshots[0]` is after mount;
   * `snapshots[i]` is after interaction `i - 1`. This is what is compared.
   */
  snapshots: string[]
  /** The same snapshots with real class names, for failure messages only. */
  readable?: string[]
  /**
   * Each snapshot as a static page for the pixel comparison, only while
   * `CONFORMANCE_PIXEL_DIR` is set (see `pixel-capture.ts`). Never compared here.
   */
  pages?: string[]
  /** Callback and service calls, in order. */
  calls: RecordedCall[]
}

/** The contract every framework adapter implements. */
export interface FrameworkAdapter {
  /** `react`, `vue`, `solid`, `svelte` or `angular`. */
  name: string
  /** Whether this adapter's UI package exports the component at all. */
  has(component: string): boolean
  /** Every name the UI package exports (components, hooks, utilities). */
  exportNames: readonly string[]
  /** Mount, run interactions, snapshot after each step, unmount. */
  run(component: string, testCase: UICase, options?: RunOptions): Promise<CaseResult>
}

/** How one case is mounted, beyond the case itself. */
export interface RunOptions {
  /**
   * Mount through the framework binding's full composition root (React's
   * `MoleculeProvider`, Vue's `moleculePlugin`, …) with these services, instead
   * of the UI providers (i18n, theme, router, auth). Feature packages whose
   * components read HTTP, push, device or storage run this way.
   */
  app?: AppComposition
}

/** Builds the full service set one case mounts with. */
export interface AppComposition {
  /**
   * Builds the case's services.
   *
   * @param testCase - The case (its context seeds the services).
   * @param record - Receives every service call.
   * @returns The services and what undoes their global changes after the case.
   */
  services(testCase: UICase, record: (name: string, args: unknown[]) => void): AppServices
}

/** One case's full service set. */
export interface AppServices {
  services: BindingServices
  /** What the case's `http` and `auth` interactions drive. */
  controls: AppControls
  /** Undoes the services' global changes (bonds, stubs) after the case. */
  dispose(): Promise<void>
}

/** Kit-side handles the `http` and `auth` interactions use to change the services from outside. */
export interface AppControls {
  /** Answers the oldest deferred request for this method + URL. */
  answerHttp(answer: Omit<Extract<Interaction, { type: 'http' }>, 'type'>): void
  /** Sets auth state as another tab, account switch or token refresh would. */
  setAuth(
    status: Extract<Interaction, { type: 'auth' }>['status'],
    user?: Record<string, unknown>,
  ): void
  /** Calls a control an area's fakes registered (a `control` step). */
  control(name: string, args: unknown[]): Promise<void>
}
