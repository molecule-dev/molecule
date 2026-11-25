// @vitest-environment jsdom
/**
 * REAL-DEPENDENCY integration tests for the Vue binding — no component-level
 * mocks: the actual Vue render pipeline, the REAL `@molecule/app-ui` bond
 * registry (`setClassMap`), the REAL `@molecule/app-icons` bond
 * (`setIconSet`), and the REAL i18n `defaultValue` fallback path.
 *
 * Vue counterpart of `@molecule/app-ui-react`'s
 * `provider.integration.test.tsx`: the same titles and the same assertions,
 * translated only where the framework forces it. Vue has no error boundary —
 * a failed mount throws, and the thrown error's message is what React's
 * boundary rendered. Vue has no `rerender`: a prop change is a re-render of
 * the host component, and every DOM read after an event waits for the update
 * flush (`nextTick`). React's `ref` is not a component prop in Vue, so the
 * DOM node it hands a caller is found in the rendered tree instead, and
 * `react-router`'s `MemoryRouter` is the one static `useLocation` the Dropdown
 * reads.
 *
 * @module
 */

import { fireEvent, screen } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type App,
  type Component,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  shallowRef,
} from 'vue'

import { bond } from '@molecule/app-bond'
import type { IconData, IconSet } from '@molecule/app-icons'
import { setIconSet } from '@molecule/app-icons'
import type { ClassMapValue, KitEvent, UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'
import type * as appVue from '@molecule/app-vue'

import {
  Accordion,
  Alert,
  Button,
  Checkbox,
  Dropdown,
  FloatingInput,
  FormField,
  Icon,
  Input,
  Modal,
  Progress,
  RadioGroup,
  Select,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toast,
  Tooltip,
} from '../index.js'

// Dropdown resolves `useLocation`; keep every other app-vue export real and
// give it the one static location React's `MemoryRouter` supplied.
const { route } = await vi.hoisted(async () => {
  const { computed } = await import('vue')
  return { route: computed(() => ({ pathname: '/', search: '', hash: '' })) }
})

vi.mock('@molecule/app-vue', async (importOriginal) => {
  const actual = await importOriginal<typeof appVue>()
  return { ...actual, useLocation: () => route }
})

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

/** A mounted app plus the host element it rendered into. */
interface Tracked {
  app: App
  host: HTMLElement
  /** Whether the app is still mounted (an explicit unmount clears this). */
  live: boolean
}

const tracked: Tracked[] = []

/**
 * Unmounts a tracked app once and removes its host from the document.
 *
 * @param entry - The tracked app.
 */
function teardown(entry: Tracked): void {
  if (entry.live) {
    entry.live = false
    entry.app.unmount()
  }
  entry.host.remove()
}

/**
 * Mounts a render function into a fresh host appended to `document.body`.
 *
 * @param render - The root component's render function.
 * @returns The host element and a teardown for the mounted app.
 */
function mountView(render: () => unknown): { host: HTMLElement; unmount: () => void } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  app.mount(host)
  const entry: Tracked = { app, host, live: true }
  tracked.push(entry)
  return { host, unmount: () => teardown(entry) }
}

/** A mounted component whose props a test can replace, like React's `rerender`. */
interface MountedProps {
  host: HTMLElement
  update: (next: Record<string, unknown>) => Promise<void>
  unmount: () => void
}

/**
 * Mounts a component through a host that renders it from a replaceable prop
 * bag — the Vue form of React's `rerender`, since a prop change is a re-render
 * of the component that passes it.
 *
 * @param component - The component to mount.
 * @param initial - Its initial props.
 * @param slots - The default slot's render function, when it takes children.
 * @returns The host element, the prop updater and a teardown.
 */
function mountProps(
  component: Component,
  initial: Record<string, unknown>,
  slots?: () => unknown,
): MountedProps {
  const state = shallowRef<Record<string, unknown>>({ ...initial })
  const Host = defineComponent({
    name: 'PortHost',
    setup() {
      return () => h(component, state.value, slots ? () => slots() : undefined)
    },
  })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render: () => h(Host) })
  app.mount(host)
  const entry: Tracked = { app, host, live: true }
  tracked.push(entry)
  return {
    host,
    update: async (next) => {
      state.value = { ...state.value, ...next }
      await nextTick()
      await nextTick()
    },
    unmount: () => teardown(entry),
  }
}

/**
 * Mounts a view that is expected to fail, the Vue counterpart of React's
 * error boundary: Vue has no boundary, the mount throws.
 *
 * @param render - The root component's render function.
 * @returns The error the mount threw.
 */
function mountFailure(render: () => unknown): Error {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  try {
    app.mount(host)
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error))
  } finally {
    host.remove()
  }
  throw new Error('expected mounting the component to throw')
}

/**
 * Waits for Vue to apply the DOM updates queued by the preceding event or
 * timer. Two ticks: the first patch can queue a post-flush watcher whose own
 * write schedules a second one (Dropdown's roving focus does exactly that).
 *
 * @returns A promise resolved once both flushes have run.
 */
async function flush(): Promise<void> {
  await nextTick()
  await nextTick()
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(iconSet)
})

afterEach(() => {
  for (const entry of tracked.splice(0)) teardown(entry)
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.style.overflow = ''
  setClassMap(classMap)
  setIconSet(iconSet)
})

describe('@molecule/app-ui-vue × REAL vue + REAL @molecule/app-ui bonds', () => {
  it('FAILURE DISAMBIGUATION: missing ClassMap vs missing icon set produce distinct, actionable errors', () => {
    // Both misconfigurations surface at first render. A weak executor must be
    // able to tell "you never called setClassMap" apart from "your icon bond
    // is missing" without bisecting the component tree.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Vue logs the unhandled render error before rethrowing it out of mount.
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // 1. No ClassMap bonded at all.
      unbind('ui-classmap')
      const classMapError = mountFailure(() => h(Button, null, () => 'Save')).message
      expect(classMapError).toContain('No UIClassMap has been set')
      expect(classMapError).toContain('setClassMap()') // names the fix, not just the failure

      // 2. ClassMap bonded, but no icon set — a DIFFERENT failure with a
      //    DIFFERENT message naming the icon bond's fix.
      setClassMap(classMap)
      unbind('icon-set')
      const iconError = mountFailure(() =>
        h(Modal, { open: true, onClose: () => {}, title: 'Hi' }, () => 'Body'),
      ).message
      expect(iconError).toContain('@molecule/app-icons')
      expect(iconError).toContain('setIconSet()') // names the fix, not just the failure
      expect(iconError).toMatch(/@molecule\/app-icons-\w/) // …and a bond that satisfies it
      expect(iconError).not.toContain('UIClassMap')
      expect(iconError).not.toBe(classMapError)
    } finally {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
      setClassMap(classMap)
      setIconSet(iconSet)
    }
  })

  it('CONSUMER PROPERTY: full Modal lifecycle — open locks scroll, Escape closes, scroll is RESTORED', async () => {
    const Harness = defineComponent({
      name: 'ModalLifecycleHarness',
      setup() {
        const open = ref(true)
        return () =>
          h(
            Modal,
            { open: open.value, onClose: () => (open.value = false), title: 'Confirm' },
            () => 'Body content',
          )
      },
    })
    mountView(() => h(Harness))

    // Open: dialog present, body scroll locked, close button accessible via
    // the i18n defaultValue fallback (NO i18n bond is registered — graceful
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
    mountProps(Modal, { open: true, onClose, title: 'Confirm' }, () => 'Body content')
    await flush()

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
    // A re-rendering provider recreates each toast's `onDismiss` closure while
    // its content updates. The 5000ms default countdown must NOT reset on
    // those updates — the regression this pins kept busy toast stacks on
    // screen forever.
    vi.useFakeTimers()
    let dismissed = 0
    const revision = shallowRef(0)
    mountView(() =>
      h(Toast, {
        title: 'Saved',
        description: `revision ${revision.value}`,
        onDismiss: () => {
          dismissed++
        },
      }),
    )
    // Default status is 'info' — role="status" (polite), not the assertive
    // "alert": a routine toast interrupting a screen reader mid-sentence is
    // the same over-announcing trap role="alert" creates for non-urgent
    // content everywhere else it's misused.
    expect(screen.getByRole('status')).toBeTruthy()

    // Update at 1.5s, 3s and 4.5s — inside the 5s default window.
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(1500)
      revision.value++
      await flush()
      expect(screen.getByRole('status')).toBeTruthy() // still visible mid-flow
    }

    // 4500ms elapsed; the ORIGINAL 5000ms deadline is 500ms away.
    vi.advanceTimersByTime(500)
    await flush()
    expect(screen.queryByRole('status')).toBeNull()
    expect(dismissed).toBe(1)
  })

  it('Toast duration={0} is persistent, and manual dismissal is a separate labeled path', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    mountProps(Toast, { title: 'Sticky', duration: 0, onDismiss })

    // "0 for persistent" (documented contract): a full minute passes, still shown.
    vi.advanceTimersByTime(60_000)
    await flush()
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
    mountProps(Tooltip, { content: 'Help text', delay: 300 }, () =>
      h('button', { type: 'button' }, 'Trigger'),
    )
    await flush()
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
    const view = mountProps(Input, {
      label: 'Email',
      hint: 'We never share it',
      error: 'Invalid address',
      clearable: true,
      value: 'nope',
      onChange: () => {},
      onClear,
    })
    await flush()

    // The label is associated WITHOUT the caller passing id/name (generated
    // id fallback) — getByLabelText resolves through the label's `for`.
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
    await view.update({
      error: undefined,
      hint: 'We never share it',
      clearable: false,
      value: 'ok',
    })
    const hintId = (screen.getByLabelText('Email') as HTMLInputElement).getAttribute(
      'aria-describedby',
    ) as string
    expect(document.getElementById(hintId)?.textContent).toBe('We never share it')
  })

  it('two id-less Inputs with errors do not share an error id (no "undefined-error" collision)', async () => {
    mountView(() =>
      h('div', null, [
        h(Input, { label: 'First', error: 'err one' }),
        h(Input, { label: 'Second', error: 'err two' }),
      ]),
    )
    await flush()
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
    mountProps(Tabs, { items, defaultValue: 'one' })
    await flush()

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
    mountProps(Tabs, { items, defaultValue: 'one' })
    await flush()

    const first = screen.getByRole('tab', { name: 'First' })
    const second = screen.getByRole('tab', { name: 'Second' })
    const third = screen.getByRole('tab', { name: 'Third' })
    // Keys go to the focused tab, as they do for a keyboard user who tabbed in.
    const focused = (): Element => document.activeElement ?? document.body
    first.focus()

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
    const view = mountProps(Tabs, { items, defaultValue: 'one', variant: 'line', size: 'lg' })
    await flush()
    expect(screen.getByRole('tablist').className).toContain('tabsList(variant=line,size=lg,color=)')
    expect(screen.getByRole('tab', { name: 'First' }).className).toContain(
      'tabsTrigger(variant=line,size=lg,color=)',
    )
    expect(screen.getByRole('tabpanel').className).toContain(
      'tabsContent(variant=line,size=lg,color=)',
    )

    // A different variant/size update produces DIFFERENT classes — proves
    // the props are read on every render, not baked in once.
    await view.update({ variant: 'solid-rounded', size: 'sm' })
    expect(screen.getByRole('tablist').className).toContain(
      'tabsList(variant=solid-rounded,size=sm,color=)',
    )
    expect(screen.getByRole('tab', { name: 'First' }).className).toContain(
      'tabsTrigger(variant=solid-rounded,size=sm,color=)',
    )
  })

  it('Switch: color is read from props and passed to switchBase — not silently dropped', async () => {
    const view = mountProps(Switch, {
      label: 'Notify',
      checked: true,
      color: 'success',
      size: 'lg',
    })
    await flush()
    expect(screen.getByRole('switch').className).toContain(
      'switchBase(variant=,size=lg,color=success)',
    )
    await view.update({ color: 'error', size: 'sm' })
    expect(screen.getByRole('switch').className).toContain(
      'switchBase(variant=,size=sm,color=error)',
    )
  })

  it('Select: chevron is a real inline SVG using currentColor (cm.textMuted) — no hardcoded hex backgroundImage', async () => {
    const view = mountProps(Select, {
      options: [{ value: 'a', label: 'A' }],
      value: 'a',
      onValueChange: () => {},
    })
    await flush()
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
    const view = mountProps(Select, {
      options,
      placeholder: 'Choose one',
      clearable: true,
      value: '',
      onValueChange: () => {},
    })
    await flush()
    const select = view.host.querySelector('select') as HTMLSelectElement
    const emptyOptions = Array.from(select.options).filter((o) => o.value === '')
    expect(emptyOptions).toHaveLength(1)
    expect(emptyOptions[0].textContent).toBe('Choose one')

    // Without a placeholder, the clearable option renders — through t()'s
    // defaultValue fallback, not a hardcoded string bypassing i18n.
    await view.update({ placeholder: undefined })
    const select2 = view.host.querySelector('select') as HTMLSelectElement
    const clearOption = Array.from(select2.options).find((o) => o.value === '')
    expect(clearOption?.textContent).toBe('--')
  })

  it('Textarea autoResize sets the minimum in line-height units', async () => {
    const { update } = mountProps(Textarea, { autoResize: true, minRows: 3, testId: 'ta' })
    await flush()
    const field = screen.getByTestId('ta')
    expect(field.style.minHeight).toBe('3lh')
    expect(field.style.maxHeight).toBe('')
    await update({ maxRows: 4 })
    expect(field.getAttribute('style')).toBe(
      'resize: none; min-height: 3lh; max-height: 4lh; height: 0px;',
    )
    await update({ autoResize: false })
    expect(field.style.cssText).toBe('')
  })

  it('Textarea autoResize caps both bounds when maxRows is below minRows', async () => {
    mountProps(Textarea, { autoResize: true, minRows: 6, maxRows: 2, testId: 'ta' })
    await flush()
    expect(screen.getByTestId('ta').getAttribute('style')).toBe(
      'resize: none; min-height: 2lh; max-height: 2lh; height: 0px;',
    )
  })

  it('Textarea autoResize works UNCONTROLLED — real `input` events resize it, not just the `value` prop', async () => {
    mountProps(Textarea, { autoResize: true, defaultValue: 'line one', minRows: 2, testId: 'ta' })
    await flush()
    const el = screen.getByTestId('ta') as HTMLTextAreaElement
    const initialHeight = el.style.height

    // jsdom never lays out text, so scrollHeight stays 0 — stub what a real
    // browser would report once several more lines were typed.
    Object.defineProperty(el, 'scrollHeight', { value: 400, configurable: true })
    // Uncontrolled: no `value`/`onChange` prop drives this element, so only
    // a real native `input` listener (not the `[value, …]` watcher) can
    // observe the keystroke and recompute.
    fireEvent.input(el, { target: { value: 'line one\nline two\nline three\nline four' } })

    expect(el.style.height).not.toBe(initialHeight)
    expect(el.style.height).toBe('400px')
  })

  it('Textarea autoResize still measures input when the caller supplies an input listener', async () => {
    const onInput = vi.fn()
    mountProps(Textarea, { autoResize: true, onInput, testId: 'ta' })
    await flush()
    const field = screen.getByTestId('ta')
    Object.defineProperty(field, 'scrollHeight', { value: 120, configurable: true })

    fireEvent.input(field, { target: { value: 'more text' } })

    expect(onInput).toHaveBeenCalledTimes(1)
    expect(field.style.height).toBe('120px')
  })

  it('Accordion real lifecycle: expand/collapse with resolvable aria-controls', async () => {
    const items = [
      { value: 'a', header: 'Section A', content: 'alpha body' },
      { value: 'b', header: 'Section B', content: 'beta body' },
    ]
    mountProps(Accordion, { items })
    await flush()

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
    mountView(() =>
      h('div', null, [
        h(RadioGroup, { options, value: 'x', onChange: () => {} }),
        h(RadioGroup, { options, value: 'y', onChange: () => {} }),
      ]),
    )
    await flush()
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
    mountProps(Checkbox, { indeterminate: true, label: 'Select all' })
    await flush()
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
    const view = mountProps(Table, {
      data,
      columns,
      sort: { key: 'name', direction: 'asc' },
      onSort,
    })
    await flush()

    const nameHeader = screen.getByRole('columnheader', { name: /Name/ })
    const ageHeader = screen.getByRole('columnheader', { name: 'Age' })
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending')
    // Non-sortable columns carry NO aria-sort — sortable-but-unsorted would be 'none'.
    expect(ageHeader.getAttribute('aria-sort')).toBeNull()

    // Clicking the sorted column asks for the flipped direction.
    fireEvent.click(nameHeader)
    expect(onSort).toHaveBeenCalledWith('name', 'desc')

    await view.update({ sort: { key: 'name', direction: 'desc' } })
    expect(screen.getByRole('columnheader', { name: /Name/ }).getAttribute('aria-sort')).toBe(
      'descending',
    )
  })
})

describe('a11y contract — what assistive technology actually receives', () => {
  it('FAILURE DISAMBIGUATION: two stacked modals announce their OWN titles (no shared id)', async () => {
    // The regression this pins: a hardcoded id="modal-title" on every dialog
    // meant aria-labelledby resolved to the FIRST match in the DOM — a
    // confirm dialog stacked over a drawer was announced with the DRAWER's
    // title, so a screen-reader user could not tell which dialog had focus.
    mountView(() =>
      h('div', null, [
        h(Modal, { open: true, onClose: () => {}, title: 'Edit profile' }, () => 'outer body'),
        h(Modal, { open: true, onClose: () => {}, title: 'Discard changes?' }, () => 'inner body'),
      ]),
    )
    await flush()
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
    mountProps(Modal, { open: true, onClose: () => {}, 'aria-label': 'Account menu' }, () =>
      h('span', null, 'drawer body'),
    )
    await flush()
    expect(screen.getByRole('dialog', { name: 'Account menu' })).toBeTruthy()
  })

  it('Switch always exposes aria-checked — including the undefined/uncontrolled case', async () => {
    const view = mountProps(Switch, { label: 'Notifications' })
    await flush()
    // role="switch" REQUIRES aria-checked: undefined `checked` must announce
    // "off", not omit the attribute (which reads as broken/indeterminate).
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
    await view.update({ checked: true })
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
    mountProps(Switch, { label: 'Notify me', checked: false, onChange })
    await flush()
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
    mountProps(FormField, { label: 'Email', error: 'Required' }, () =>
      h('input', { type: 'email' }),
    )
    await flush()
    const label = screen.getByText('Email')
    const input = screen.getByLabelText('Email') as HTMLInputElement
    expect(label.getAttribute('for')).toBe(input.id)
    expect(input.id).toBeTruthy()
    const describedBy = input.getAttribute('aria-describedby') as string
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy)?.textContent).toBe('Required')
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('FormField: two id-less fields never collide on "undefined-error"', async () => {
    mountView(() =>
      h('div', null, [
        h(FormField, { label: 'Field A', error: 'err a' }, () => h('input')),
        h(FormField, { label: 'Field B', error: 'err b' }, () => h('input')),
      ]),
    )
    await flush()
    expect(document.getElementById('undefined-error')).toBeNull()
    const a = screen.getByLabelText('Field A').getAttribute('aria-describedby')
    const b = screen.getByLabelText('Field B').getAttribute('aria-describedby')
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
    expect(document.getElementById(a as string)?.textContent).toBe('err a')
  })

  it('FloatingInput label is a REAL <label htmlFor>, not a bare unassociated <span>', async () => {
    mountProps(FloatingInput, { placeholder: 'Full name' })
    await flush()
    // Fails before the fix: a bare <span> gives no programmatic
    // association, so getByLabelText finds nothing and throws.
    const input = screen.getByLabelText('Full name') as HTMLInputElement
    expect(input.id).toBeTruthy()
  })

  it('Checkbox error is programmatically associated, matching Input/Textarea/Select', async () => {
    mountProps(Checkbox, { label: 'Accept terms', error: 'You must accept the terms' })
    await flush()
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
    mountView(() =>
      h('div', null, [
        h(RadioGroup, { label: 'Size', options, value: 's', onChange: () => {} }),
        h(RadioGroup, { label: 'Size', options, value: 'l', onChange: () => {} }),
      ]),
    )
    await flush()
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios).toHaveLength(4)
    // Within a group the name is shared; across same-label groups it differs.
    expect(radios[0].name).toBe(radios[1].name)
    expect(radios[2].name).toBe(radios[3].name)
    expect(radios[0].name).not.toBe(radios[2].name)
  })

  it('RadioGroup honors an explicit form `name` and associates its error', async () => {
    mountProps(RadioGroup, {
      label: 'Plan',
      name: 'plan',
      options: [{ value: 'pro', label: 'Pro' }],
      error: 'Pick a plan',
    })
    await flush()
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
    mountView(() =>
      h('div', null, [
        h(Tabs, { items: items.map((i) => ({ ...i, content: 'first body' })) }),
        h(Tabs, { items: items.map((i) => ({ ...i, content: 'second body' })) }),
      ]),
    )
    await flush()
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
    mountProps(Tooltip, { content: 'Help text' }, () => h('button', { type: 'button' }, 'Trigger'))
    await flush()
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
    mountProps(Modal, { open: true, onClose: () => {}, title: 'Hi' }, () => h('span', null, 'body'))
    await flush()
    const closeButton = screen.getByRole('button', { name: 'Close' })
    const svg = closeButton.querySelector('svg') as SVGElement
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')

    // The standalone Icon component: decorative by default…
    const iconDefault = mountProps(Icon, { name: 'x-mark' })
    await flush()
    expect((iconDefault.host.querySelector('svg') as SVGElement).getAttribute('aria-hidden')).toBe(
      'true',
    )
    // …but opting in with aria-label exposes it (no aria-hidden).
    const named = mountProps(Icon, { name: 'x-mark', 'aria-label': 'Remove', role: 'img' })
    await flush()
    const namedSvg = named.host.querySelector('svg') as SVGElement
    expect(namedSvg.getAttribute('aria-hidden')).toBeNull()
    expect(namedSvg.getAttribute('aria-label')).toBe('Remove')
  })

  it('Progress clamps aria-valuenow into [0, max] like the visual bar', async () => {
    const view = mountProps(Progress, { value: 150, max: 100, label: 'Upload' })
    await flush()
    // value > max announced verbatim is invalid ARIA ("150 percent").
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
    await view.update({ value: -5 })
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
    await view.update({ value: 40, indeterminate: true })
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull()
  })
})

describe('Modal — focus management (WAI-ARIA APG dialog pattern)', () => {
  it('CONSUMER PROPERTY: opening moves focus into the dialog; Escape closes it AND restores focus to the trigger', async () => {
    const Harness = defineComponent({
      name: 'ModalFocusHarness',
      setup() {
        const open = ref(false)
        return () =>
          h('div', null, [
            h('button', { type: 'button', onClick: () => (open.value = true) }, 'Open'),
            h(
              Modal,
              { open: open.value, onClose: () => (open.value = false), title: 'Confirm' },
              () => [
                h('button', { type: 'button' }, 'First'),
                h('button', { type: 'button' }, 'Second'),
              ],
            ),
          ])
      },
    })
    mountView(() => h(Harness))
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
    mountProps(
      Modal,
      { open: true, onClose: () => {}, title: 'Empty', showCloseButton: false },
      () => h('p', null, 'Nothing focusable here'),
    )
    await flush()
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('traps Tab: Shift+Tab from the first focusable wraps to the last, and vice versa', async () => {
    mountProps(
      Modal,
      { open: true, onClose: () => {}, title: 'Confirm', showCloseButton: false },
      () => [h('button', { type: 'button' }, 'First'), h('button', { type: 'button' }, 'Last')],
    )
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
    mountView(() =>
      h('div', null, [
        h(Modal, { open: true, onClose: outerClose, title: 'Outer' }, () => 'outer body'),
        h(Modal, { open: true, onClose: innerClose, title: 'Inner' }, () => 'inner body'),
      ]),
    )
    await flush()
    fireEvent.keyDown(document, { key: 'Escape' })
    // A confirm dialog stacked over a drawer must not vanish BOTH on one
    // Escape press — only the later-mounted (topmost) one responds.
    expect(innerClose).toHaveBeenCalledTimes(1)
    expect(outerClose).not.toHaveBeenCalled()
  })

  it('reference-counts the body scroll lock: closing one of two open dialogs keeps scroll locked', async () => {
    const Harness = defineComponent({
      name: 'ScrollLockHarness',
      setup() {
        const showInner = ref(true)
        return () =>
          h('div', null, [
            h(Modal, { open: true, onClose: () => {}, title: 'Outer' }, () => 'outer'),
            showInner.value
              ? h(
                  Modal,
                  { open: true, onClose: () => (showInner.value = false), title: 'Inner' },
                  () => 'inner',
                )
              : null,
          ])
      },
    })
    mountView(() => h(Harness))
    await flush()
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
    const view = mountProps(Modal, { open: true, onClose: () => {}, title: 'A' }, () => 'body')
    await flush()
    const wrapper = document.querySelector('.dialogWrapper') as HTMLElement
    expect(wrapper.style.alignItems).toBe('')
    await view.update({ centered: false })
    const updated = document.querySelector('.dialogWrapper') as HTMLElement
    expect(updated.style.alignItems).toBe('flex-start')
  })
})

describe('Dropdown — WAI-ARIA APG menu-button pattern', () => {
  const actionsTrigger = (): Record<string, unknown> => ({
    trigger: h('button', { type: 'button' }, 'Actions'),
  })

  it('CONSUMER PROPERTY: ArrowDown on the trigger opens the menu and focuses the first item', async () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
    ]
    mountProps(Dropdown, { ...actionsTrigger(), items })
    await flush()
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
    mountProps(Dropdown, { ...actionsTrigger(), items })
    await flush()
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
    mountProps(Dropdown, { ...actionsTrigger(), items })
    await flush()
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
    mountView(() =>
      h('div', null, [
        h(Dropdown, { ...actionsTrigger(), items }),
        h('button', { type: 'button' }, 'Elsewhere'),
      ]),
    )
    await flush()
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
    mountProps(Dropdown, { trigger: 'Menu', items })
    await flush()
    const trigger = screen.getByRole('button', { name: 'Menu' })
    expect((trigger as HTMLElement).tabIndex).toBe(0)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    await flush()
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('width="trigger" never renders the invalid literal CSS value "trigger"', async () => {
    const items = [{ value: 'a', label: 'Item A' }]
    mountProps(Dropdown, { ...actionsTrigger(), items, width: 'trigger' })
    await flush()
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
    const first = mountProps(Tooltip, { content: 'Help text' }, () =>
      h('button', { type: 'button' }, 'Trigger'),
    )
    await flush()
    fireEvent.mouseOver(
      screen.getByRole('button', { name: 'Trigger' }).parentElement as HTMLElement,
    )
    await flush()
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.parentElement?.querySelector('[aria-hidden="true"]')).toBeNull()
    first.unmount()

    mountProps(Tooltip, { content: 'Help text', hasArrow: true }, () =>
      h('button', { type: 'button' }, 'Trigger'),
    )
    await flush()
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
    mountProps(Tooltip, { content: 'Help text' }, () => h('button', { type: 'button' }, 'Trigger'))
    await flush()
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
    const view = mountProps(Alert, {}, () => 'Static banner')
    await flush()
    expect(screen.getByRole('alert')).toBeTruthy()
    await view.update({ live: false })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })
})
