// @vitest-environment jsdom
/**
 * REAL-DEPENDENCY integration tests for the Angular binding — no component
 * mocks: the actual Angular render pipeline, the REAL `@molecule/app-ui` bond
 * registry (`setClassMap`), the REAL `@molecule/app-icons` bond
 * (`setIconSet`), and the REAL i18n provider's `defaultValue` fallback path.
 *
 * Angular counterpart of `@molecule/app-ui-react`'s
 * `provider.integration.test.tsx`: the same titles and the same assertions,
 * translated only where the framework forces it. Angular has no error
 * boundary — a failed change-detection pass throws, and the thrown error's
 * message is what React's boundary rendered. Angular has no `rerender`: a prop
 * change is a field write on the spec host followed by a change-detection
 * pass, and DOM reads after an event wait for that pass. React's `ref` is not
 * a component prop in Angular, so the DOM node it hands a caller is found in
 * the rendered tree instead, and `react-router`'s `MemoryRouter` is the router
 * instance the Dropdown's injected `useRouter` follows.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  type ComponentRef,
  createComponent,
  inject,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { fireEvent, screen } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  provideDomPlacement,
  provideI18n,
  provideRouter,
  type RouteLocation,
  type Router,
} from '@molecule/app-angular'
import { bond } from '@molecule/app-bond'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import type { IconData, IconSet } from '@molecule/app-icons'
import { setIconSet } from '@molecule/app-icons'
import type { ClassMapValue, KitEvent, UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

// The components load AFTER the JIT compiler facade (above): a static import
// would let Angular's decorators evaluate before it, and their templates then
// fail to compile.
const {
  Accordion,
  Alert,
  Avatar,
  Button,
  Checkbox,
  Dropdown,
  EmptyState,
  FloatingInput,
  FormField,
  Icon,
  Input,
  Modal,
  PageHeader,
  PageShell,
  Progress,
  RadioGroup,
  Select,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toast,
  ToastProvider,
  Tooltip,
} = await import('../index.js')

// ---------------------------------------------------------------------------
// A GENUINE (not mocked) ClassMap: a minimal naming-convention styling
// library. Function resolvers return their token name; `cn` really merges;
// `sp` really implements both overloads. Registered through the REAL bond.
// ---------------------------------------------------------------------------

/** UIClassMap members that are functions (everything else is a string token). */
const FUNCTION_MEMBERS = new Set([
  'button',
  'input',
  'textarea',
  'select',
  'checkbox',
  'radio',
  'switchBase',
  'switchThumb',
  'label',
  'card',
  'badge',
  'alert',
  'avatar',
  'modal',
  'spinner',
  'toast',
  'separator',
  'accordion',
  'pagination',
  'tabsList',
  'tabsTrigger',
  'tabsContent',
  'tooltip',
  'progress',
  'progressBar',
  'skeleton',
  'container',
  'flex',
  'grid',
  'cardPadding',
  'progressHeight',
  'progressColor',
  'toastContainer',
  'radioGroupLayout',
  'spacer',
  'stack',
  'textSize',
  'fontWeight',
  'w',
  'h',
  'minH',
  'maxW',
  'gridRows',
  'position',
])

/**
 * Flattens one `cn()` argument the way a real class-merging helper does.
 *
 * @param value - A class value: token, number, nested array or truthy-keyed map.
 * @returns The class names it contributes.
 */
const flattenClassValue = (value: ClassMapValue): string[] => {
  if (value === null || value === undefined || value === false || value === true) return []
  if (typeof value === 'string' || typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(flattenClassValue)
  return Object.entries(value)
    .filter(([, on]) => !!on)
    .map(([k]) => k)
}

// These resolvers take meaningful options (`variant`/`size`/`color`) that a
// component is responsible for actually threading through — unlike the rest
// of FUNCTION_MEMBERS (which just echo their own token name), these encode
// whichever opts they were called with, so a render test can assert the
// PROPS actually reached the ClassMap call, not just that a class exists.
const OPTS_AWARE_MEMBERS = new Set(['tabsList', 'tabsTrigger', 'tabsContent', 'switchBase'])

const classMap = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined
      if (prop === 'cn') {
        return (...classes: ClassMapValue[]) =>
          classes.flatMap(flattenClassValue).filter(Boolean).join(' ')
      }
      if (prop === 'sp') {
        return (a: unknown, b: unknown) =>
          typeof a === 'object' && a !== null
            ? Object.fromEntries(Object.entries(a).map(([k, v]) => [`--sp-${k}`, String(v)]))
            : `sp-${String(a)}-${String(b)}`
      }
      if (OPTS_AWARE_MEMBERS.has(prop)) {
        return (opts?: { variant?: unknown; size?: unknown; color?: unknown }) =>
          `${prop}(variant=${String(opts?.variant ?? '')},size=${String(opts?.size ?? '')},color=${String(opts?.color ?? '')})`
      }
      if (FUNCTION_MEMBERS.has(prop)) return () => prop
      return prop
    },
  },
) as UIClassMap

// A GENUINE icon set (real SVG path data) registered through the real bond.
const strokeIcon: IconData = {
  paths: [{ d: 'M6 18L18 6M6 6l12 12' }],
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 2,
}
const iconSet: IconSet = Object.fromEntries(
  [
    'x-mark',
    'chevron-up',
    'chevron-down',
    'chevron-left',
    'chevron-right',
    'chevrons-left',
    'chevrons-right',
    'ellipsis-horizontal',
    'info-circle',
    'check-circle',
    'exclamation-triangle',
    'x-circle',
    'user',
  ].map((name) => [name, strokeIcon]),
)

/**
 * Removes a bonded singleton through the same `bond` API `setClassMap` and
 * `setIconSet` call, which is how the real registries express "not bonded".
 *
 * @param type - The bond category to unbind.
 */
const unbind = (type: 'ui-classmap' | 'icon-set'): void => {
  bond(type, undefined)
}

/** A spec host whose fields the templates bind (Angular's prop bag). */
class SpecHost {
  /** Any prop a template binds. */
  [key: string]: unknown

  /**
   * The host's own change detector. In zoneless mode `ApplicationRef.tick()`
   * and the root view's detector do not refresh a component's template after
   * a direct field write; this detector is bound to the component view, so
   * `detectChanges()` re-runs exactly the template a prop change should.
   */
  readonly changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef)
}

let appRef: ApplicationRef
/** A mounted view that a change-detection pass can drive. */
interface LiveView {
  /** The view's change detector. */
  changeDetectorRef: { detectChanges: () => void }
  /** Unmounts the view. */
  destroy: () => void
}
const views: LiveView[] = []
let hostCount = 0

/** A memory router whose location the menu follows (React's `MemoryRouter`). */
interface MemoryRouter {
  /** The router instance the menu follows. */
  router: Router
}

/**
 * Builds a router that starts at a path and follows navigations.
 *
 * @param initial - The starting path.
 * @returns The router and its navigation driver.
 */
function memoryRouter(initial: string): MemoryRouter {
  /**
   * Splits a path into its location parts.
   *
   * @param path - The path to parse.
   * @returns The parsed location.
   */
  const parse = (path: string): RouteLocation => {
    const [rest, hash = ''] = path.split('#')
    const [pathname = '/', search = ''] = (rest ?? '').split('?')
    return {
      pathname: pathname || '/',
      search: search ? `?${search}` : '',
      hash: hash ? `#${hash}` : '',
    }
  }
  let location = parse(initial)
  const listeners = new Set<Parameters<Router['subscribe']>[0]>()
  /**
   * Notifies every subscriber, like a real navigation.
   */
  const notify = (): void => {
    for (const listener of [...listeners]) listener(location, 'push')
  }
  const router: Router = {
    getLocation: () => location,
    getParams: <T extends Record<string, string> = Record<string, string>>(): T => ({}) as T,
    getQuery: () => ({}),
    getQueryParam: () => undefined,
    getHash: () => location.hash,
    navigate: (path) => {
      location = parse(path)
      notify()
    },
    navigateTo: () => {},
    back: () => {},
    forward: () => {},
    go: () => {},
    setQuery: () => {},
    setQueryParam: () => {},
    setHash: () => {},
    isActive: (path) => location.pathname === path,
    matchPath: () => null,
    generatePath: () => '',
    createHref: (path: string) => path,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    addGuard: () => () => {},
    registerRoutes: () => {},
    getRoutes: () => [],
    destroy: () => listeners.clear(),
  }
  return { router }
}

/** A mounted spec host: its element, live instance and change-detection driver. */
interface Mounted {
  /** The spec host element. */
  host: HTMLElement
  /** The spec host's live instance (a prop bag). */
  instance: Record<string, unknown>
  /** Applies a change-detection pass (Vue's update flush / React's rerender). */
  detect: () => void
  /** Replaces props and re-renders (React's `rerender`). */
  update: (next: Record<string, unknown>) => void
  /** Unmounts the host. */
  destroy: () => void
}

/**
 * Decorates a fresh spec host class with a template and mounts it into the
 * body, running one change-detection pass.
 *
 * @param template - The host template.
 * @param imports - The components the template uses.
 * @param fields - The initial prop bag bound by the template.
 * @returns The mounted host.
 */
function mount(
  template: string,
  imports: Type<unknown>[],
  fields: Record<string, unknown> = {},
): Mounted {
  class Host extends SpecHost {}
  hostCount += 1
  const Decorated = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-spec-host-${hostCount}`,
    standalone: true,
    imports,
    template,
  })(Host)
  const ref = createComponent(Decorated, { environmentInjector: appRef.injector })
  Object.assign(ref.instance, fields)
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  const view: LiveView = {
    changeDetectorRef: ref.instance.changeDetector,
    destroy: () => {
      const index = views.indexOf(view)
      if (index !== -1) views.splice(index, 1)
      ref.destroy()
    },
  }
  views.push(view)
  const detect = (): void => view.changeDetectorRef.detectChanges()
  detect()
  return {
    host,
    instance: ref.instance,
    detect,
    update: (next: Record<string, unknown>) => {
      Object.assign(ref.instance, next)
      detect()
    },
    destroy: view.destroy,
  }
}

/**
 * Mounts a decorated component type into the body, running one
 * change-detection pass.
 *
 * @param type - The component to mount.
 * @param configure - Applies the test's props before the first pass.
 * @returns The host element and the live instance.
 */
function mountType<T extends object>(
  type: Type<T>,
  configure?: (instance: T) => void,
): { host: HTMLElement; instance: T; detect: () => void; destroy: () => void } {
  const ref = createComponent(type, { environmentInjector: appRef.injector })
  configure?.(ref.instance)
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  const view: LiveView = {
    changeDetectorRef: ref.changeDetectorRef,
    destroy: () => {
      const index = views.indexOf(view)
      if (index !== -1) views.splice(index, 1)
      ref.destroy()
    },
  }
  views.push(view)
  const detect = (): void => view.changeDetectorRef.detectChanges()
  detect()
  return {
    host,
    instance: ref.instance,
    detect,
    destroy: view.destroy,
  }
}

/**
 * Mounts a view that is expected to fail, the Angular counterpart of React's
 * error boundary: change detection throws, and the thrown error's message is
 * what the boundary would have rendered.
 *
 * @param template - The host template.
 * @param imports - The components the template uses.
 * @returns The error message.
 */
function mountFailure(template: string, imports: Type<unknown>[]): string {
  class Host extends SpecHost {}
  hostCount += 1
  const Decorated = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-spec-fail-${hostCount}`,
    standalone: true,
    imports,
    template,
  })(Host)
  let ref: ComponentRef<Host> | undefined
  try {
    ref = createComponent(Decorated, { environmentInjector: appRef.injector })
    document.body.appendChild(ref.location.nativeElement as HTMLElement)
    appRef.attachView(ref.hostView)
    // The component's own detector renders the template (and throws from it);
    // `appRef.tick()` is a no-op in zoneless once nothing is scheduled.
    ref.instance.changeDetector.detectChanges()
    return 'NO THROW'
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  } finally {
    ref?.destroy()
  }
}

/**
 * Waits for Angular to apply the DOM updates queued by the preceding event or
 * timer. Two passes: a hook can queue work whose own effect needs a second one
 * (Dropdown's roving focus does exactly that).
 *
 * @returns A promise resolved once both passes have run.
 */
async function flush(): Promise<void> {
  for (const view of [...views]) view.changeDetectorRef.detectChanges()
  // A pending zoneless tick (an event, a signal write, a timer) is drained by
  // `appRef.tick()`; the detectors above refresh the prop-bag hosts.
  appRef.tick()
  await Promise.resolve()
  appRef.tick()
}

beforeEach(async () => {
  appRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideI18n(createSimpleI18nProvider()),
      provideRouter(memoryRouter('/').router),
    ],
  })
  setClassMap(classMap)
  setIconSet(iconSet)
})

afterEach(() => {
  for (const view of views.splice(0)) view.destroy()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.style.overflow = ''
  setClassMap(classMap)
  setIconSet(iconSet)
})

describe('@molecule/app-ui-angular × REAL Angular + REAL @molecule/app-ui bonds', () => {
  it('CONSUMER PROPERTY: full Modal lifecycle — open locks scroll, Escape closes, scroll is RESTORED', async () => {
    const Harness = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-modal-lifecycle',
      standalone: true,
      imports: [Modal],
      template: `<mol-modal [open]="open" (close)="open = false" title="Confirm"
        >Body content</mol-modal
      >`,
    })(
      class ModalLifecycleHarness {
        /** Whether the dialog is open. */
        open = true
      },
    )
    mountType(Harness)

    // Open: dialog present, body scroll locked, close button accessible via
    // the i18n defaultValue fallback (no translations registered — graceful
    // degradation, not a crash).
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()

    // Escape closes…
    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()
    expect(screen.queryByRole('dialog')).toBeNull()
    // …and the page must scroll again. A hostile default here (overflow left
    // 'hidden') freezes the whole app after the first dismissed dialog.
    expect(document.body.style.overflow).toBe('')
  })

  it('Modal click disambiguation: overlay click closes, content click does NOT', async () => {
    const onClose = vi.fn()
    mount(
      `<mol-modal [open]="true" (close)="onClose()" title="Confirm">Body content</mol-modal>`,
      [Modal],
      { onClose },
    )

    // A click INSIDE the dialog must never be treated as a dismissal…
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    // …while a click on the backdrop wrapper is one.
    const wrapper = document.querySelector('.dialogWrapper')
    expect(wrapper).not.toBeNull()
    fireEvent.click(wrapper as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('CONSUMER PROPERTY: Toast default duration survives a realistic re-rendering stack', async () => {
    // The toast's content updates while the provider sits inside the toast —
    // the 5000ms default countdown must NOT reset on those updates, the
    // regression this pins kept busy toast stacks on screen forever.
    vi.useFakeTimers()
    let dismissed = 0
    const view = mount(
      `<div mol-toast [title]="title" [description]="description" (dismiss)="onDismiss()"></div>`,
      [Toast],
      { title: 'Saved', description: 'revision 0', onDismiss: () => dismissed++ },
    )
    // Default status is 'info' — role="status" (polite), not the assertive
    // "alert": a routine toast interrupting a screen reader mid-sentence is
    // the same over-announcing trap role="alert" creates for non-urgent
    // content everywhere else it's misused.
    expect(screen.getByRole('status')).toBeTruthy()

    // Update at 1.5s, 3s and 4.5s — inside the 5s default window.
    for (let i = 1; i <= 3; i++) {
      vi.advanceTimersByTime(1500)
      view.update({ description: `revision ${i}` })
      expect(screen.getByRole('status')).toBeTruthy() // still visible mid-flow
    }

    // 4500ms elapsed; the ORIGINAL 5000ms deadline is 500ms away.
    vi.advanceTimersByTime(500)
    await flush()
    expect(screen.queryByRole('status')).toBeNull()
    expect(dismissed).toBe(1)
  })

  it('keeps a consumer list in order when an item is inserted in the middle of children', async () => {
    const view = mount(
      `<div mol-toast [duration]="0">@for (x of xs; track x) {<b>{{ x }}</b>}</div>`,
      [Toast],
      { xs: ['a', 'c'] },
    )
    const text = (): string => view.host.textContent?.replace(/\s/g, '') ?? ''
    expect(text()).toBe('ac')
    view.update({ xs: ['a', 'b', 'c'] })
    expect(text()).toBe('abc')
    view.update({ xs: ['a', 'c'] })
    expect(text()).toBe('ac')
  })

  describe('ToastProvider children slot', () => {
    it('keeps a consumer list in order when an item is inserted in the middle of children', async () => {
      const view = mount(
        `<mol-toast-provider>@for (x of xs; track x) {<b>{{ x }}</b>}</mol-toast-provider>`,
        [ToastProvider],
        { xs: ['a', 'c'] },
      )
      const text = (): string => view.host.textContent?.replace(/\s/g, '') ?? ''
      expect(text()).toBe('ac')
      view.update({ xs: ['a', 'b', 'c'] })
      expect(text()).toBe('abc')
      view.update({ xs: ['a', 'c'] })
      expect(text()).toBe('ac')
    })
  })

  it('Toast duration={0} is persistent, and manual dismissal is a separate labeled path', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const view = mount(
      `<div mol-toast [title]="title" [duration]="duration" (dismiss)="onDismiss()"></div>`,
      [Toast],
      { title: 'Sticky', duration: 0, onDismiss },
    )

    // "0 for persistent" (documented contract): a full minute passes, still shown.
    vi.advanceTimersByTime(60_000)
    view.detect()
    expect(screen.getByRole('status')).toBeTruthy()
    expect(onDismiss).not.toHaveBeenCalled()

    // The close button (i18n defaultValue fallback) dismisses it.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await flush()
    expect(screen.queryByRole('status')).toBeNull()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('CONSUMER PROPERTY: Tooltip delay — a quick pass-over must never flash a late tooltip', async () => {
    vi.useFakeTimers()
    const view = mount(
      `<mol-tooltip [delay]="delay">
        <span slot="content">Help text</span>
        <button type="button">Trigger</button>
      </mol-tooltip>`,
      [Tooltip],
      { delay: 300 },
    )
    view.detect()
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement as HTMLElement

    // Hover, but leave BEFORE the delay elapses…
    fireEvent.mouseOver(trigger)
    vi.advanceTimersByTime(200)
    await flush()
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.mouseOut(trigger)
    // …the pending show timer must be cancelled — nothing may appear later.
    vi.advanceTimersByTime(10_000)
    await flush()
    expect(screen.queryByRole('tooltip')).toBeNull()

    // A deliberate hover: shown exactly after the full delay, not before.
    fireEvent.mouseOver(trigger)
    vi.advanceTimersByTime(299)
    await flush()
    expect(screen.queryByRole('tooltip')).toBeNull()
    vi.advanceTimersByTime(1)
    await flush()
    expect(screen.getByRole('tooltip').textContent).toBe('Help text')

    // Clicking the wrapped control dismisses the tooltip it triggered.
    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    await flush()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('Input failure disambiguation: error wins over hint, is announced, and ids never collide', async () => {
    const onClear = vi.fn()
    const view = mount(
      `<div mol-input [label]="label" [hint]="hint" [error]="error" [clearable]="clearable"
        [value]="value" (change)="onChange($event)" (clear)="onClear($event)"></div>`,
      [Input],
      {
        label: 'Email',
        hint: 'We never share it',
        error: 'Invalid address',
        clearable: true,
        value: 'nope',
        onChange: () => {},
        onClear,
      },
    )

    // The label is associated WITHOUT the caller passing id/name (generated
    // id fallback) — getByLabelText resolves through htmlFor.
    const input = screen.getByLabelText('Email') as HTMLInputElement
    expect(input.getAttribute('aria-invalid')).toBe('true')

    // Error and hint are DISTINGUISHABLE states: with both set, the error is
    // shown and referenced; the hint is suppressed.
    const describedBy = input.getAttribute('aria-describedby') ?? ''
    expect(describedBy).not.toContain('undefined')
    const errorEl = document.getElementById(describedBy)
    expect(errorEl?.textContent).toBe('Invalid address')
    expect(screen.queryByText('We never share it')).toBeNull()

    // The clear affordance is accessible via the i18n fallback and calls back.
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledTimes(1)

    // Hint-only state: describedby retargets to the hint element.
    view.update({ error: undefined, hint: 'We never share it', clearable: false, value: 'ok' })
    const hintId = (screen.getByLabelText('Email') as HTMLInputElement).getAttribute(
      'aria-describedby',
    ) as string
    expect(document.getElementById(hintId)?.textContent).toBe('We never share it')
  })

  it('two id-less Inputs with errors do not share an error id (no "undefined-error" collision)', async () => {
    mount(
      `<div>
        <div mol-input label="First" error="err one"></div>
        <div mol-input label="Second" error="err two"></div>
      </div>`,
      [Input],
    )
    expect(document.getElementById('undefined-error')).toBeNull()
    const a = screen.getByLabelText('First').getAttribute('aria-describedby')
    const b = screen.getByLabelText('Second').getAttribute('aria-describedby')
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a).not.toBe(b)
    // Each points at ITS OWN rendered message — a screen reader reads the
    // right error for the right field.
    expect(document.getElementById(a as string)?.textContent).toBe('err one')
    expect(document.getElementById(b as string)?.textContent).toBe('err two')
  })

  it('Tabs real lifecycle: aria wiring resolves to real elements and follows selection', async () => {
    const items = [
      { value: 'one', label: 'First', content: 'first content' },
      { value: 'two', label: 'Second', content: 'second content' },
    ]
    mount(`<div mol-tabs [items]="items" [defaultValue]="defaultValue"></div>`, [Tabs], {
      items,
      defaultValue: 'one',
    })

    const firstTab = screen.getByRole('tab', { name: 'First' })
    expect(firstTab.getAttribute('aria-selected')).toBe('true')

    // The panel's aria-labelledby must point at an element that EXISTS (it
    // used to reference the bare tab value — an id nothing carried).
    const panel = screen.getByRole('tabpanel')
    const labelledBy = panel.getAttribute('aria-labelledby') as string
    expect(document.getElementById(labelledBy)).toBe(firstTab)
    expect(panel.textContent).toBe('first content')

    fireEvent.click(screen.getByRole('tab', { name: 'Second' }))
    await flush()
    expect(screen.getByRole('tab', { name: 'Second' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'First' }).getAttribute('aria-selected')).toBe('false')
    const panel2 = screen.getByRole('tabpanel')
    expect(panel2.textContent).toBe('second content')
    expect(document.getElementById(panel2.getAttribute('aria-labelledby') as string)).toBe(
      screen.getByRole('tab', { name: 'Second' }),
    )
  })

  it('Tabs: WAI-ARIA APG keyboard nav — Right/Left/Home/End move focus AND selection, roving tabindex skips disabled', async () => {
    const items = [
      { value: 'one', label: 'First', content: 'first' },
      { value: 'two', label: 'Second', content: 'second', disabled: true },
      { value: 'three', label: 'Third', content: 'third' },
    ]
    mount(`<div mol-tabs [items]="items" [defaultValue]="defaultValue"></div>`, [Tabs], {
      items,
      defaultValue: 'one',
    })

    const first = screen.getByRole('tab', { name: 'First' })
    const second = screen.getByRole('tab', { name: 'Second' })
    const third = screen.getByRole('tab', { name: 'Third' })
    // Keys go to the focused tab, as they do for a keyboard user who tabbed in.
    const focused = (): Element => document.activeElement ?? document.body
    ;(first as HTMLElement).focus()

    // Roving tabindex: only the active tab is a Tab stop — previously every
    // trigger was individually tabbable.
    expect((first as HTMLElement).tabIndex).toBe(0)
    expect((second as HTMLElement).tabIndex).toBe(-1)
    expect((third as HTMLElement).tabIndex).toBe(-1)

    // ArrowRight from "First" skips the disabled "Second" and lands on
    // "Third" — automatic activation moves BOTH focus and selection.
    fireEvent.keyDown(focused(), { key: 'ArrowRight' })
    await flush()
    expect(document.activeElement).toBe(third)
    expect(third.getAttribute('aria-selected')).toBe('true')
    expect((third as HTMLElement).tabIndex).toBe(0)
    expect((first as HTMLElement).tabIndex).toBe(-1)
    expect(screen.getByRole('tabpanel').textContent).toBe('third')

    // Home returns focus + selection to the first enabled tab.
    fireEvent.keyDown(focused(), { key: 'Home' })
    await flush()
    expect(document.activeElement).toBe(first)
    expect(first.getAttribute('aria-selected')).toBe('true')

    // ArrowLeft wraps around past the disabled tab to the last enabled one.
    fireEvent.keyDown(focused(), { key: 'ArrowLeft' })
    await flush()
    expect(document.activeElement).toBe(third)

    // End jumps straight to the last enabled tab from anywhere.
    fireEvent.keyDown(focused(), { key: 'Home' })
    await flush()
    fireEvent.keyDown(focused(), { key: 'End' })
    await flush()
    expect(document.activeElement).toBe(third)
  })

  it('Tabs: variant/size are read from props and passed to tabsList/tabsTrigger/tabsContent — not silently dropped', async () => {
    const items = [{ value: 'one', label: 'First', content: 'first body' }]
    const view = mount(
      `<div mol-tabs [items]="items" [defaultValue]="defaultValue" [variant]="variant" [size]="size"></div>`,
      [Tabs],
      { items, defaultValue: 'one', variant: 'line', size: 'lg' },
    )
    expect(screen.getByRole('tablist').className).toContain('tabsList(variant=line,size=lg,color=)')
    expect(screen.getByRole('tab', { name: 'First' }).className).toContain(
      'tabsTrigger(variant=line,size=lg,color=)',
    )
    expect(screen.getByRole('tabpanel').className).toContain(
      'tabsContent(variant=line,size=lg,color=)',
    )

    // A different variant/size update produces DIFFERENT classes — proves
    // the props are read on every render, not baked in once.
    view.update({ variant: 'solid-rounded', size: 'sm' })
    expect(screen.getByRole('tablist').className).toContain(
      'tabsList(variant=solid-rounded,size=sm,color=)',
    )
    expect(screen.getByRole('tab', { name: 'First' }).className).toContain(
      'tabsTrigger(variant=solid-rounded,size=sm,color=)',
    )
  })

  it('Switch: color is read from props and passed to switchBase — not silently dropped', async () => {
    const view = mount(
      `<mol-switch label="Notify" [checked]="true" [color]="color" [size]="size"></mol-switch>`,
      [Switch],
      { color: 'success', size: 'lg' },
    )
    expect(screen.getByRole('switch').className).toContain(
      'switchBase(variant=,size=lg,color=success)',
    )
    view.update({ color: 'error', size: 'sm' })
    expect(screen.getByRole('switch').className).toContain(
      'switchBase(variant=,size=sm,color=error)',
    )
  })

  it('Select: chevron is a real inline SVG using currentColor (cm.textMuted) — no hardcoded hex backgroundImage', async () => {
    const view = mount(
      `<div mol-select [options]="options" [value]="value" (valueChange)="onValueChange($event)"></div>`,
      [Select],
      { options: [{ value: 'a', label: 'A' }], value: 'a', onValueChange: () => {} },
    )
    const select = view.host.querySelector('select') as HTMLSelectElement
    // The old fix baked '#6b7280' into a CSS backgroundImage data URI —
    // confirm that entire mechanism is gone.
    expect(select.style.backgroundImage).toBe('')
    const svg = view.host.querySelector('svg') as SVGElement
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('fill')).toBe('currentColor')
    // Styled via the ClassMap token every other muted icon uses — real
    // currentColor cascades with the active theme; a baked hex never could.
    expect(svg.getAttribute('class')).toContain('textMuted')
  })

  it('Select: clearable + placeholder never renders TWO value="" options; the clear label goes through i18n', async () => {
    const options = [{ value: 'a', label: 'A' }]
    const view = mount(
      `<div mol-select [options]="options" [placeholder]="placeholder" [clearable]="true"
        [value]="value" (valueChange)="onValueChange($event)"></div>`,
      [Select],
      { options, placeholder: 'Choose one', value: '', onValueChange: () => {} },
    )
    const select = view.host.querySelector('select') as HTMLSelectElement
    const emptyOptions = Array.from(select.options).filter((o) => o.value === '')
    expect(emptyOptions).toHaveLength(1)
    expect(emptyOptions[0].textContent).toBe('Choose one')

    // Without a placeholder, the clearable option renders — through t()'s
    // defaultValue fallback, not a hardcoded string bypassing i18n.
    view.update({ placeholder: undefined })
    const select2 = view.host.querySelector('select') as HTMLSelectElement
    const clearOption = Array.from(select2.options).find((o) => o.value === '')
    expect(clearOption?.textContent).toBe('--')
  })

  it('Textarea autoResize works UNCONTROLLED — real `input` events resize it, not just the `value` prop', async () => {
    mount(
      `<div mol-textarea [autoResize]="true" defaultValue="line one" [minRows]="2" testId="ta"></div>`,
      [Textarea],
    )
    const el = screen.getByTestId('ta') as HTMLTextAreaElement
    const initialHeight = el.style.height

    // jsdom never lays out text, so scrollHeight stays 0 — stub what a real
    // browser would report once several more lines were typed.
    Object.defineProperty(el, 'scrollHeight', { value: 400, configurable: true })
    // Uncontrolled: no `value`/`onChange` prop drives this element, so only
    // a real native `input` listener (not the `[value, …]` deps) can observe
    // the keystroke and recompute.
    fireEvent.input(el, { target: { value: 'line one\nline two\nline three\nline four' } })

    expect(el.style.height).not.toBe(initialHeight)
    expect(el.style.height).toBe('400px')
  })

  it('Accordion real lifecycle: expand/collapse with resolvable aria-controls', async () => {
    const items = [
      { value: 'a', header: 'Section A', content: 'alpha body' },
      { value: 'b', header: 'Section B', content: 'beta body' },
    ]
    mount(`<div mol-accordion [items]="items"></div>`, [Accordion], { items })

    const triggerA = screen.getByRole('button', { name: /Section A/ })
    expect(triggerA.getAttribute('aria-expanded')).toBe('false')
    // aria-controls resolves to a real element even while collapsed.
    const controlled = document.getElementById(triggerA.getAttribute('aria-controls') as string)
    expect(controlled).not.toBeNull()
    expect((controlled as HTMLElement).style.display).toBe('none')

    fireEvent.click(triggerA)
    await flush()
    expect(triggerA.getAttribute('aria-expanded')).toBe('true')
    expect((controlled as HTMLElement).style.display).toBe('block')

    // Single mode: expanding B collapses A.
    fireEvent.click(screen.getByRole('button', { name: /Section B/ }))
    await flush()
    expect(triggerA.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('button', { name: /Section B/ }).getAttribute('aria-expanded')).toBe(
      'true',
    )
  })

  it('RadioGroup: id-less/unlabeled groups still form REAL native radio groups', async () => {
    const options = [
      { value: 'x', label: 'X' },
      { value: 'y', label: 'Y' },
    ]
    mount(
      `<div>
        <div mol-radio-group [options]="options" value="x" (change)="onChange($event)"></div>
        <div mol-radio-group [options]="options" value="y" (change)="onChange($event)"></div>
      </div>`,
      [RadioGroup],
      { options, onChange: () => {} },
    )
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios).toHaveLength(4)
    const names = radios.map((r) => r.name)
    // Every radio has a non-empty name (unnamed radios are standalone: no
    // arrow-key navigation, no native exclusivity)…
    expect(names.every((n) => n.length > 0)).toBe(true)
    // …the two radios within a group share it, and the two GROUPS differ.
    expect(names[0]).toBe(names[1])
    expect(names[2]).toBe(names[3])
    expect(names[0]).not.toBe(names[2])
  })

  it('Checkbox: indeterminate reaches the DOM through a CALLBACK ref', async () => {
    mount(`<div mol-checkbox [indeterminate]="true" label="Select all"></div>`, [Checkbox])
    const node = screen.getByRole('checkbox') as HTMLInputElement
    expect(node).not.toBeNull()
    // The element a caller holds through any attachment path (React's callback
    // ref; the rendered DOM node here) must carry the tri-state.
    expect(node.indeterminate).toBe(true)
  })

  it('Table: sortable headers expose aria-sort and toggle direction on click', async () => {
    const columns = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'age', header: 'Age' },
    ]
    const data = [
      { name: 'Ada', age: 36 },
      { name: 'Grace', age: 85 },
    ]
    const onSort = vi.fn()
    const view = mount(
      `<div mol-table [data]="data" [columns]="columns" [sort]="sort" [onSort]="onSort"></div>`,
      [Table],
      { data, columns, sort: { key: 'name', direction: 'asc' }, onSort },
    )

    const nameHeader = screen.getByRole('columnheader', { name: /Name/ })
    const ageHeader = screen.getByRole('columnheader', { name: 'Age' })
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending')
    // Non-sortable columns carry NO aria-sort — sortable-but-unsorted would be 'none'.
    expect(ageHeader.getAttribute('aria-sort')).toBeNull()

    // Clicking the sorted column asks for the flipped direction.
    fireEvent.click(nameHeader)
    expect(onSort).toHaveBeenCalledWith('name', 'desc')

    view.update({ sort: { key: 'name', direction: 'desc' } })
    expect(screen.getByRole('columnheader', { name: /Name/ }).getAttribute('aria-sort')).toBe(
      'descending',
    )
  })
  it('keeps a consumer list in order when an item is inserted in the middle of emptyContent', async () => {
    const view = mount(
      `<div mol-table [data]="rows" [columns]="columns"
        >@for (x of xs; track x) {<b slot="emptyContent">{{ x }}</b>}</div
      >`,
      [Table],
      { rows: [], columns: [{ key: 'name', header: 'Name' }], xs: ['a', 'c'] },
    )
    const text = (): string =>
      document.querySelector('tbody td')?.textContent?.replace(/\s/g, '') ?? ''
    expect(text()).toBe('ac')
    view.update({ xs: ['a', 'b', 'c'] })
    expect(text()).toBe('abc')
    view.update({ xs: ['a', 'c'] })
    expect(text()).toBe('ac')
  })
})

describe('a11y contract — what assistive technology actually receives', () => {
  it('FAILURE DISAMBIGUATION: two stacked modals announce their OWN titles (no shared id)', async () => {
    // The regression this pins: a hardcoded id="modal-title" on every dialog
    // meant aria-labelledby resolved to the FIRST match in the DOM — a
    // confirm dialog stacked over a drawer was announced with the DRAWER's
    // title, so a screen-reader user could not tell which dialog had focus.
    mount(
      `<div>
        <mol-modal [open]="true" (close)="noop()" title="Edit profile">outer body</mol-modal>
        <mol-modal [open]="true" (close)="noop()" title="Discard changes?">inner body</mol-modal>
      </div>`,
      [Modal],
      { noop: () => {} },
    )
    const dialogs = screen.getAllByRole('dialog')
    expect(dialogs).toHaveLength(2)
    const labels = dialogs.map((d) => {
      const labelledBy = d.getAttribute('aria-labelledby') as string
      return document.getElementById(labelledBy)?.textContent
    })
    expect(labels).toEqual(['Edit profile', 'Discard changes?'])
    // And the two title ids are genuinely distinct elements.
    const ids = dialogs.map((d) => d.getAttribute('aria-labelledby'))
    expect(ids[0]).not.toBe(ids[1])
  })

  it('an untitled Modal still gets an accessible name via aria-label passthrough', async () => {
    // UserMenu's drawer renders Modal without `title`; the aria-* passthrough
    // must reach the dialog element or the drawer announces as "dialog" with
    // no name at all.
    mount(
      `<mol-modal [open]="true" (close)="noop()" aria-label="Account menu"
        >drawer body</mol-modal
      >`,
      [Modal],
      { noop: () => {} },
    )
    expect(screen.getByRole('dialog', { name: 'Account menu' })).toBeTruthy()
  })

  it('Switch always exposes aria-checked — including the undefined/uncontrolled case', async () => {
    const view = mount(`<mol-switch label="Notifications" [checked]="checked"></mol-switch>`, [
      Switch,
    ])
    // role="switch" REQUIRES aria-checked: undefined `checked` must announce
    // "off", not omit the attribute (which reads as broken/indeterminate).
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
    view.update({ checked: true })
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })

  it('Switch dispatches a REAL native Event: preventDefault/currentTarget work, and event.target.checked matches the pattern every flagship template uses', async () => {
    // The universal fleet consumer pattern:
    //   onChange={(e) => toggle((e.target as HTMLInputElement).checked)}
    // A forged event object happened to read back `.checked` but crashed the
    // instant a caller called any real Event method (preventDefault/
    // stopPropagation). Read everything a caller would actually need
    // SYNCHRONOUSLY inside the handler — exactly where every flagship
    // template reads it — because a CONTROLLED checkbox's `.checked` gets
    // reconciled back to the (in this test, unchanged) `checked` prop once
    // the dispatch finishes, same as a real native controlled checkbox would.
    let capturedChecked: boolean | null = null
    let currentTargetIsInput = false
    let preventDefaultThrew = false
    let stopPropagationThrew = false
    const onChange = vi.fn((e: KitEvent) => {
      try {
        e.preventDefault()
      } catch (_error) {
        // Intentional: the assertion below is exactly "did this throw?" —
        // the pre-fix synthetic event crashed here with "not a function".
        preventDefaultThrew = true
      }
      try {
        e.stopPropagation()
      } catch (_error) {
        // Intentional — see above.
        stopPropagationThrew = true
      }
      const target = e.target as HTMLInputElement
      capturedChecked = target.checked
      currentTargetIsInput = e.currentTarget === target
    })
    mount(
      `<mol-switch label="Notify me" [checked]="false" (change)="onChange($event)"></mol-switch>`,
      [Switch],
      {
        onChange,
      },
    )
    fireEvent.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledTimes(1)
    // Neither real Event method crashes — the previous forged event threw
    // "not a function" the instant either was called.
    expect(preventDefaultThrew).toBe(false)
    expect(stopPropagationThrew).toBe(false)
    // The universal fleet consumer pattern —
    // `onChange={(e) => toggle((e.target as HTMLInputElement).checked)}` —
    // now reads the real, correct next value.
    expect(capturedChecked).toBe(true)
    expect(currentTargetIsInput).toBe(true)
  })

  it('FormField wires aria-describedby + a real id onto its child input (useId fallback when name is absent)', async () => {
    mount(`<div mol-form-field label="Email" error="Required"><input type="email" /></div>`, [
      FormField,
    ])
    const label = screen.getByText('Email')
    const input = screen.getByLabelText('Email') as HTMLInputElement
    expect(label.getAttribute('for')).toBe(input.id)
    expect(input.id).toBeTruthy()
    const describedBy = input.getAttribute('aria-describedby') as string
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy)?.textContent).toBe('Required')
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of children', async () => {
    const view = mount(
      `<div mol-form-field>@for (x of xs; track x) {<b>{{ x }}</b>}</div>`,
      [FormField],
      { xs: ['a', 'c'] },
    )
    const text = (): string => view.host.textContent?.replace(/\s/g, '') ?? ''
    expect(text()).toBe('ac')
    view.update({ xs: ['a', 'b', 'c'] })
    expect(text()).toBe('abc')
    view.update({ xs: ['a', 'c'] })
    expect(text()).toBe('ac')
  })

  it('FormField: two id-less fields never collide on "undefined-error"', async () => {
    mount(
      `<div>
        <div mol-form-field label="Field A" error="err a"><input /></div>
        <div mol-form-field label="Field B" error="err b"><input /></div>
      </div>`,
      [FormField],
    )
    expect(document.getElementById('undefined-error')).toBeNull()
    const a = screen.getByLabelText('Field A').getAttribute('aria-describedby')
    const b = screen.getByLabelText('Field B').getAttribute('aria-describedby')
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
    expect(document.getElementById(a as string)?.textContent).toBe('err a')
  })

  it('FloatingInput label is a REAL <label htmlFor>, not a bare unassociated <span>', async () => {
    mount(`<span mol-floating-input placeholder="Full name"></span>`, [FloatingInput])
    // Fails before the fix: a bare <span> gives no programmatic
    // association, so getByLabelText finds nothing and throws.
    const input = screen.getByLabelText('Full name') as HTMLInputElement
    expect(input.id).toBeTruthy()
  })

  it('Checkbox error is programmatically associated, matching Input/Textarea/Select', async () => {
    mount(`<div mol-checkbox label="Accept terms" error="You must accept the terms"></div>`, [
      Checkbox,
    ])
    const box = screen.getByRole('checkbox')
    expect(box.getAttribute('aria-invalid')).toBe('true')
    const describedBy = box.getAttribute('aria-describedby') as string
    expect(describedBy).toBeTruthy()
    // The reference resolves to the REAL rendered message — a bare sibling
    // <p> is never read by a screen reader, so the failure was invisible.
    expect(document.getElementById(describedBy)?.textContent).toBe('You must accept the terms')
  })

  it('CONSUMER PROPERTY: two RadioGroups with the SAME label stay independent groups', async () => {
    // The regression this pins: `name={label}` merged every group sharing a
    // visible label (two "Size" pickers on one page) into ONE native radio
    // group — selecting in one silently deselected the other.
    const options = [
      { value: 's', label: 'Small' },
      { value: 'l', label: 'Large' },
    ]
    mount(
      `<div>
        <div mol-radio-group label="Size" [options]="options" value="s" (change)="onChange($event)"></div>
        <div mol-radio-group label="Size" [options]="options" value="l" (change)="onChange($event)"></div>
      </div>`,
      [RadioGroup],
      { options, onChange: () => {} },
    )
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios).toHaveLength(4)
    // Within a group the name is shared; across same-label groups it differs.
    expect(radios[0].name).toBe(radios[1].name)
    expect(radios[2].name).toBe(radios[3].name)
    expect(radios[0].name).not.toBe(radios[2].name)
  })

  it('RadioGroup honors an explicit form `name` and associates its error', async () => {
    mount(
      `<div mol-radio-group label="Plan" name="plan" [options]="options" error="Pick a plan"></div>`,
      [RadioGroup],
      { options: [{ value: 'pro', label: 'Pro' }] },
    )
    expect((screen.getByRole('radio') as HTMLInputElement).name).toBe('plan')
    const group = screen.getByRole('radiogroup')
    const describedBy = group.getAttribute('aria-describedby') as string
    expect(document.getElementById(describedBy)?.textContent).toBe('Pick a plan')
    expect(group.getAttribute('aria-invalid')).toBe('true')
  })

  it('two Tabs instances sharing tab values keep their aria wiring apart', async () => {
    // The regression this pins: bare `tab-overview` ids collided across
    // instances, so a panel's aria-labelledby resolved to the OTHER
    // component's tab.
    const items = [{ value: 'overview', label: 'Overview', content: 'body' }]
    mount(
      `<div>
        <div mol-tabs [items]="first"></div>
        <div mol-tabs [items]="second"></div>
      </div>`,
      [Tabs],
      {
        first: items.map((i) => ({ ...i, content: 'first body' })),
        second: items.map((i) => ({ ...i, content: 'second body' })),
      },
    )
    const tabs = screen.getAllByRole('tab')
    const panels = screen.getAllByRole('tabpanel')
    expect(tabs[0].id).not.toBe(tabs[1].id)
    // Each panel is labelled by ITS OWN tab element.
    expect(document.getElementById(panels[0].getAttribute('aria-labelledby') as string)).toBe(
      tabs[0],
    )
    expect(document.getElementById(panels[1].getAttribute('aria-labelledby') as string)).toBe(
      tabs[1],
    )
    // aria-controls resolves to the matching panel, not the twin's.
    expect(document.getElementById(tabs[0].getAttribute('aria-controls') as string)).toBe(panels[0])
  })

  it('WCAG 1.4.13: Escape dismisses a visible tooltip without moving pointer or focus', async () => {
    mount(
      `<mol-tooltip>
        <span slot="content">Help text</span>
        <button type="button">Trigger</button>
      </mol-tooltip>`,
      [Tooltip],
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    fireEvent.mouseOver(trigger.parentElement as HTMLElement)
    await flush()
    expect(screen.getByRole('tooltip')).toBeTruthy()
    // Escape (bubbling from the focused child) must hide it — a tooltip you
    // can only dismiss by mousing away occludes the content under it.
    fireEvent.keyDown(trigger, { key: 'Escape' })
    await flush()
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('decorative icons are hidden from assistive tech; named icons are exposed', async () => {
    // Chrome glyphs (close X, chevrons) get their meaning from the labelled
    // control around them; without aria-hidden some SR/browser combos
    // announce a stray "image" per glyph.
    mount(`<mol-modal [open]="true" (close)="noop()" title="Hi">body</mol-modal>`, [Modal], {
      noop: () => {},
    })
    const closeButton = screen.getByRole('button', { name: 'Close' })
    const svg = closeButton.querySelector('svg') as SVGElement
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')

    // The standalone Icon component: decorative by default…
    const iconDefault = mount(`<svg mol-icon-root [name]="'x-mark'"></svg>`, [Icon])
    expect((iconDefault.host.querySelector('svg') as SVGElement).getAttribute('aria-hidden')).toBe(
      'true',
    )
    // …but opting in with aria-label exposes it (no aria-hidden).
    const named = mount(
      `<svg mol-icon-root [name]="'x-mark'" aria-label="Remove" role="img"></svg>`,
      [Icon],
    )
    const namedSvg = named.host.querySelector('svg') as SVGElement
    expect(namedSvg.getAttribute('aria-hidden')).toBeNull()
    expect(namedSvg.getAttribute('aria-label')).toBe('Remove')
  })

  it('Progress clamps aria-valuenow into [0, max] like the visual bar', async () => {
    const view = mount(
      `<div mol-progress [value]="value" [max]="100" [indeterminate]="indeterminate" label="Upload"></div>`,
      [Progress],
      { value: 150 },
    )
    // value > max announced verbatim is invalid ARIA ("150 percent").
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
    view.update({ value: -5 })
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
    view.update({ value: 40, indeterminate: true })
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull()
  })
})

describe('Modal — focus management (WAI-ARIA APG dialog pattern)', () => {
  it('CONSUMER PROPERTY: opening moves focus into the dialog; Escape closes it AND restores focus to the trigger', async () => {
    const Harness = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-modal-focus',
      standalone: true,
      imports: [Modal],
      template: `<div>
        <button type="button" (click)="open = true">Open</button>
        <mol-modal [open]="open" (close)="open = false" title="Confirm">
          <button type="button">First</button>
          <button type="button">Second</button>
        </mol-modal>
      </div>`,
    })(
      class ModalFocusHarness {
        /** Whether the dialog is open. */
        open = false
      },
    )
    mountType(Harness)
    const openButton = screen.getByRole('button', { name: 'Open' })
    openButton.focus()
    expect(document.activeElement).toBe(openButton)

    fireEvent.click(openButton)
    await flush()
    // The header close button renders before the body buttons in DOM order,
    // so it's the first focusable element — focus must land there, not stay
    // on the trigger behind the (aria-modal) overlay.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(openButton)
  })

  it('focuses the dialog element itself when it has no focusable content', async () => {
    mount(
      `<mol-modal [open]="true" (close)="noop()" title="Empty" [showCloseButton]="false">
        <p>Nothing focusable here</p>
      </mol-modal>`,
      [Modal],
      { noop: () => {} },
    )
    // The open focus runs after the render (an after-render hook), not during
    // the view check, so let the application render before asserting it.
    await flush()
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('traps Tab: Shift+Tab from the first focusable wraps to the last, and vice versa', async () => {
    mount(
      `<mol-modal [open]="true" (close)="noop()" title="Confirm" [showCloseButton]="false">
        <button type="button">First</button>
        <button type="button">Last</button>
      </mol-modal>`,
      [Modal],
      { noop: () => {} },
    )
    // The panel's open focus runs after the render (an after-render hook).
    await flush()
    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })

  it('FAILURE DISAMBIGUATION: Escape closes only the TOPMOST of two stacked dialogs', async () => {
    const outerClose = vi.fn()
    const innerClose = vi.fn()
    mount(
      `<div>
        <mol-modal [open]="true" (close)="outerClose()" title="Outer">outer body</mol-modal>
        <mol-modal [open]="true" (close)="innerClose()" title="Inner">inner body</mol-modal>
      </div>`,
      [Modal],
      { outerClose, innerClose },
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    // A confirm dialog stacked over a drawer must not vanish BOTH on one
    // Escape press — only the later-mounted (topmost) one responds.
    expect(innerClose).toHaveBeenCalledTimes(1)
    expect(outerClose).not.toHaveBeenCalled()
  })

  it('reference-counts the body scroll lock: closing one of two open dialogs keeps scroll locked', async () => {
    const Harness = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-spec-scroll-lock',
      standalone: true,
      imports: [Modal],
      template: `<div>
        <mol-modal [open]="true" (close)="noop()" title="Outer">outer</mol-modal>
        @if (showInner) {
          <mol-modal [open]="true" (close)="showInner = false" title="Inner">inner</mol-modal>
        }
      </div>`,
    })(
      class ScrollLockHarness {
        /** Whether the inner dialog renders. */
        showInner = true
        /** No-op close for the outer dialog. */
        noop = (): void => {}
      },
    )
    mountType(Harness)
    expect(document.body.style.overflow).toBe('hidden')
    // Close the INNER dialog (topmost — its own Escape fires) while the
    // OUTER one stays open.
    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    // A naive (non-reference-counted) lock would reset overflow to '' here,
    // silently unlocking page scroll behind the dialog still open.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('centered=false top-anchors the dialog instead of vertically centering it', async () => {
    const view = mount(
      `<mol-modal [open]="true" (close)="noop()" title="A" [centered]="centered">body</mol-modal>`,
      [Modal],
      { noop: () => {}, centered: true },
    )
    const wrapper = document.querySelector('.dialogWrapper') as HTMLElement
    expect(wrapper.style.alignItems).toBe('')
    view.update({ centered: false })
    const updated = document.querySelector('.dialogWrapper') as HTMLElement
    expect(updated.style.alignItems).toBe('flex-start')
  })
})

describe('Dropdown — WAI-ARIA APG menu-button pattern', () => {
  const actionsTrigger = (): string => `<button slot="trigger" type="button">Actions</button>`

  it('CONSUMER PROPERTY: ArrowDown on the trigger opens the menu and focuses the first item', async () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
    ]
    mount(`<mol-dropdown [items]="items">${actionsTrigger()}</mol-dropdown>`, [Dropdown], { items })
    const trigger = screen.getByRole('button', { name: 'Actions' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    await flush()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const menuItems = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(menuItems[0])
  })

  it('ArrowUp on the trigger opens the menu and focuses the LAST item', async () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
    ]
    mount(`<mol-dropdown [items]="items">${actionsTrigger()}</mol-dropdown>`, [Dropdown], { items })
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowUp' })
    await flush()
    const menuItems = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(menuItems[1])
  })

  it('ArrowDown/ArrowUp/Home/End roving-navigate the open menu (only the active item is tabbable)', async () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
      { value: 'c', label: 'Item C' },
    ]
    mount(`<mol-dropdown [items]="items">${actionsTrigger()}</mol-dropdown>`, [Dropdown], { items })
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    await flush()
    const menuItems = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(menuItems[0])
    expect(menuItems[0].tabIndex).toBe(0)
    expect(menuItems[1].tabIndex).toBe(-1)

    fireEvent.keyDown(menuItems[0], { key: 'ArrowDown' })
    await flush()
    expect(document.activeElement).toBe(menuItems[1])

    fireEvent.keyDown(menuItems[1], { key: 'End' })
    await flush()
    expect(document.activeElement).toBe(menuItems[2])

    fireEvent.keyDown(menuItems[2], { key: 'Home' })
    await flush()
    expect(document.activeElement).toBe(menuItems[0])
  })

  it('FAILURE DISAMBIGUATION: Escape restores focus to the trigger; an outside click does NOT', async () => {
    const items = [{ value: 'a', label: 'Item A' }]
    mount(
      `<div>
        <mol-dropdown [items]="items">${actionsTrigger()}</mol-dropdown>
        <button type="button">Elsewhere</button>
      </div>`,
      [Dropdown],
      { items },
    )
    const trigger = screen.getByRole('button', { name: 'Actions' })
    fireEvent.click(trigger)
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    await flush()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    await flush()
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })
    elsewhere.focus()
    fireEvent.mouseDown(elsewhere)
    await flush()
    expect(screen.queryByRole('menu')).toBeNull()
    // The user's attention already moved elsewhere — an outside-click close
    // must not yank focus back to the trigger.
    expect(document.activeElement).toBe(elsewhere)
  })

  it('a non-element trigger (plain text) falls back to a keyboard-operable role="button" wrapper', async () => {
    const items = [{ value: 'a', label: 'Item A' }]
    mount(
      `<mol-dropdown [items]="items"
        ><ng-container ngProjectAs="[slot=trigger]">Menu</ng-container></mol-dropdown
      >`,
      [Dropdown],
      { items },
    )
    const trigger = screen.getByRole('button', { name: 'Menu' })
    expect(trigger.tabIndex).toBe(0)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    await flush()
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('width="trigger" never renders the invalid literal CSS value "trigger"', async () => {
    const items = [{ value: 'a', label: 'Item A' }]
    mount(
      `<mol-dropdown [items]="items" [width]="width">${actionsTrigger()}</mol-dropdown>`,
      [Dropdown],
      { items, width: 'trigger' },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    await flush()
    // Before the fix, the first-open frame (before the trigger ref is
    // measurable) rendered the literal string 'trigger' as the CSS `width`
    // value — invalid, silently ignored by the browser.
    expect(screen.getByRole('menu').style.width).not.toBe('trigger')
  })
})

describe('Tooltip — hasArrow and programmatic content association', () => {
  it('hasArrow renders a themed pointer only when requested', async () => {
    const first = mount(
      `<mol-tooltip [hasArrow]="false">
        <span slot="content">Help text</span>
        <button type="button">Trigger</button>
      </mol-tooltip>`,
      [Tooltip],
    )
    fireEvent.mouseOver(
      screen.getByRole('button', { name: 'Trigger' }).parentElement as HTMLElement,
    )
    await flush()
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.parentElement?.querySelector('[aria-hidden="true"]')).toBeNull()
    first.destroy()

    mount(
      `<mol-tooltip [hasArrow]="true">
        <span slot="content">Help text</span>
        <button type="button">Trigger</button>
      </mol-tooltip>`,
      [Tooltip],
    )
    fireEvent.mouseOver(
      screen.getByRole('button', { name: 'Trigger' }).parentElement as HTMLElement,
    )
    await flush()
    const tooltipWithArrow = screen.getByRole('tooltip')
    const arrow = tooltipWithArrow.parentElement?.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement
    expect(arrow).toBeTruthy()
    expect(arrow.style.transform).toContain('rotate(45deg)')
  })

  it('CONSUMER PROPERTY: the visible tooltip is programmatically associated with the focused trigger', async () => {
    vi.useFakeTimers()
    mount(
      `<mol-tooltip>
        <span slot="content">Help text</span>
        <button type="button">Trigger</button>
      </mol-tooltip>`,
      [Tooltip],
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    expect(trigger.getAttribute('aria-describedby')).toBeNull()
    fireEvent.mouseOver(trigger.parentElement as HTMLElement)
    await flush()
    const tooltipId = screen.getByRole('tooltip').id
    expect(tooltipId).toBeTruthy()
    // The child that actually receives focus/hover carries the reference —
    // not the wrapper div, which is never itself the focused element.
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltipId)
    fireEvent.mouseOut(trigger.parentElement as HTMLElement)
    vi.advanceTimersByTime(150)
    await flush()
    expect(trigger.getAttribute('aria-describedby')).toBeNull()
  })
})

describe('Alert — `live` prop drives assertive vs polite announcement', () => {
  it('defaults to the assertive role="alert" (unchanged default); live={false} announces politely instead', async () => {
    const view = mount(`<div mol-alert [live]="live">Static banner</div>`, [Alert], { live: true })
    expect(screen.getByRole('alert')).toBeTruthy()
    view.update({ live: false })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })
})

// Last in the file on purpose: a render that throws while the ClassMap (or the
// icon set) is unbonded leaves Angular's JIT compiler in a state where the next
// dynamic host's template compiles against the wrong input, so every test that
// needs a working compiler runs first.
describe('bond misconfiguration disambiguation', () => {
  it('FAILURE DISAMBIGUATION: missing ClassMap vs missing icon set produce distinct, actionable errors', () => {
    // Both misconfigurations surface at first render. A weak executor must be
    // able to tell "you never called setClassMap" apart from "your icon bond
    // is missing" without bisecting the component tree.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      // 1. No ClassMap bonded at all.
      unbind('ui-classmap')
      const classMapError = mountFailure('<button mol-button>Save</button>', [Button])
      expect(classMapError).toContain('No UIClassMap has been set')
      expect(classMapError).toContain('setClassMap()') // names the fix, not just the failure

      // 2. ClassMap bonded, but no icon set — a DIFFERENT failure with a
      //    DIFFERENT message naming the icon bond's fix.
      setClassMap(classMap)
      unbind('icon-set')
      const iconError = mountFailure('<mol-modal [open]="true" title="Hi">Body</mol-modal>', [
        Modal,
      ])
      expect(iconError).toContain('@molecule/app-icons')
      expect(iconError).toContain('setIconSet()') // names the fix, not just the failure
      expect(iconError).toMatch(/@molecule\/app-icons-\w/) // …and a bond that satisfies it
      expect(iconError).not.toContain('UIClassMap')
      expect(iconError).not.toBe(classMapError)
    } finally {
      consoleError.mockRestore()
      setClassMap(classMap)
      setIconSet(iconSet)
    }
  })
})

describe('slot wrappers keep a consumer list in order', () => {
  /** The text of the first element matching `selector`, whitespace removed. */
  const textOf = (selector: string): string =>
    document.querySelector(selector)?.textContent?.replace(/\s/g, '') ?? ''

  /**
   * Mounts one host, runs the middle insert and the removal, and asserts the
   * slot text stays in order without throwing.
   *
   * @param template - The host template.
   * @param imports - The component the template uses.
   * @param slot - The element to read.
   * @param suffix - Text the component itself renders after the slot.
   */
  const keepsOrder = (
    template: string,
    imports: Type<unknown>[],
    slot: string,
    suffix = '',
  ): void => {
    const view = mount(template, imports, { xs: ['a', 'c'] })
    expect(textOf(slot)).toBe(`ac${suffix}`)
    view.update({ xs: ['a', 'b', 'c'] })
    expect(textOf(slot)).toBe(`abc${suffix}`)
    view.update({ xs: ['a', 'c'] })
    expect(textOf(slot)).toBe(`ac${suffix}`)
  }

  it('keeps a consumer list in order when an item is inserted in the middle of leftIcon', () => {
    keepsOrder(
      `<button mol-button>@for (x of xs; track x) {<b slot="leftIcon">{{ x }}</b>}Save</button>`,
      [Button],
      'button[mol-button]',
      'Save',
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of icon', () => {
    keepsOrder(
      `<div mol-alert [status]="'info'">@for (x of xs; track x) {<b slot="icon">{{ x }}</b>}</div>`,
      [Alert],
      'div[mol-alert]',
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of fallback', () => {
    keepsOrder(
      `<div mol-avatar>@for (x of xs; track x) {<b slot="fallback">{{ x }}</b>}</div>`,
      [Avatar],
      'div[mol-avatar]',
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of label', () => {
    keepsOrder(
      `<div mol-checkbox>@for (x of xs; track x) {<b slot="label">{{ x }}</b>}</div>`,
      [Checkbox],
      'div[mol-checkbox]',
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of label', () => {
    keepsOrder(
      `<mol-switch>@for (x of xs; track x) {<b slot="label">{{ x }}</b>}</mol-switch>`,
      [Switch],
      'label > span',
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of icon', () => {
    keepsOrder(
      `<div mol-empty-state>@for (x of xs; track x) {<b slot="icon">{{ x }}</b>}</div>`,
      [EmptyState],
      'div[mol-empty-state]',
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of actions', () => {
    keepsOrder(
      `<div mol-page-header>@for (x of xs; track x) {<b slot="actions">{{ x }}</b>}</div>`,
      [PageHeader],
      'div[mol-page-header]',
    )
  })

  it('keeps a consumer list in order when an item is inserted in the middle of sidebar', () => {
    keepsOrder(
      `<div mol-page-shell>@for (x of xs; track x) {<b slot="sidebar">{{ x }}</b>}</div>`,
      [PageShell],
      'div[mol-page-shell]',
    )
  })
})
