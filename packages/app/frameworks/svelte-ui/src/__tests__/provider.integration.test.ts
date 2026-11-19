// @vitest-environment jsdom
/**
 * REAL-DEPENDENCY integration tests — no mocks of the interface layer: the
 * REAL `@molecule/app-ui` bond registry (`setClassMap`), the REAL
 * `@molecule/app-icons` bond (`setIconSet`) and the REAL i18n
 * `defaultValue` fallback path, exercised through Svelte's real `mount`
 * pipeline.
 *
 * Port of `@molecule/app-ui-react/src/__tests__/provider.integration.test.tsx`:
 * the same consumer-visible lifecycles and failure-mode disambiguations, with
 * only the framework-forced translations —
 *
 * - a React error boundary becomes the error `mount()` throws (Svelte has no
 *   boundary; a render-time throw reaches the caller of `mount`),
 * - `rerender` becomes a stateful host component (a Svelte parent's re-render
 *   is what updates a child's props),
 * - React's ref callback becomes the DOM `indeterminate` property a caller
 *   observes on the rendered input.
 *
 * The Dropdown reads `useLocation()`, which needs a router in Svelte context
 * (React's harness supplies a `MemoryRouter`); the real hook is kept and only
 * the located route is replaced with a fixed one.
 *
 * @module
 */

import { fireEvent, screen } from '@testing-library/dom'
import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'
import type { IconData, IconSet } from '@molecule/app-icons'
import { setIconSet } from '@molecule/app-icons'
import type { ClassMapValue, UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

// Dropdown reads the route it is on (to close when it changes). React's file
// mounts a real `MemoryRouter`; Svelte reads the route from the router in
// component context, so the framework-forced translation is a fixed readable
// location — everything else in `@molecule/app-svelte` stays real.
vi.mock('@molecule/app-svelte', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@molecule/app-svelte')
  const { readable } = await import('svelte/store')
  return {
    ...actual,
    useLocation: () => readable({ pathname: '/', search: '' }),
  }
})

const { default: Accordion } = await import('../components/Accordion.svelte')
const { default: Button } = await import('../components/Button.svelte')
const { default: Checkbox } = await import('../components/Checkbox.svelte')
const { default: Dropdown } = await import('../components/Dropdown.svelte')
const { default: FloatingInput } = await import('../components/FloatingInput.svelte')
const { default: FormField } = await import('../components/FormField.svelte')
const { default: Icon } = await import('../components/Icon.svelte')
const { default: Input } = await import('../components/Input.svelte')
const { default: Modal } = await import('../components/Modal.svelte')
const { default: RadioGroup } = await import('../components/RadioGroup.svelte')
const { default: Select } = await import('../components/Select.svelte')
const { default: Switch } = await import('../components/Switch.svelte')
const { default: Tabs } = await import('../components/Tabs.svelte')
const { default: Textarea } = await import('../components/Textarea.svelte')
const { default: Toast } = await import('../components/Toast.svelte')
const { default: Tooltip } = await import('../components/Tooltip.svelte')

const { default: ProviderAlertHost } = await import('./ProviderAlertHost.svelte')
const { default: ProviderInputHost } = await import('./ProviderInputHost.svelte')
const { default: ProviderModalHost } = await import('./ProviderModalHost.svelte')
const { default: ProviderProgressHost } = await import('./ProviderProgressHost.svelte')
const { default: ProviderSelectHost } = await import('./ProviderSelectHost.svelte')
const { default: ProviderSwitchCheckedHost } = await import('./ProviderSwitchCheckedHost.svelte')
const { default: ProviderSwitchHost } = await import('./ProviderSwitchHost.svelte')
const { default: ProviderTableHost } = await import('./ProviderTableHost.svelte')
const { default: ProviderTabsHost } = await import('./ProviderTabsHost.svelte')
const { default: ProviderToastHost } = await import('./ProviderToastHost.svelte')

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
 * Flattens a ClassMapValue into its class tokens.
 *
 * @param value - The class value.
 * @returns The class tokens.
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

const classMap = new Proxy({} as UIClassMap, {
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
})

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

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

/** Unmounts everything this test mounted and empties the document. */
function teardown(): void {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
}

/**
 * Mounts a component into a fresh host appended to the document body.
 *
 * @param component - The compiled Svelte component.
 * @param props - The component's props.
 * @returns The host element.
 */
function mountIn<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host
}

/**
 * Mounts a component and returns the error it threw during render, if any.
 *
 * @param component - The compiled Svelte component.
 * @param props - The component's props.
 * @returns The thrown error's message, or `null` when the mount succeeded.
 */
function mountError<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): string | null {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  try {
    mounted.push(mount(component, { target: host, props }))
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  flushSync()
  return null
}

/** A snippet rendering plain text (React's string children). */
const text = (value: string): Snippet => createRawSnippet(() => ({ render: () => value }))

/** A snippet rendering raw markup (React's element children). */
const markup = (value: string): Snippet => createRawSnippet(() => ({ render: () => value }))

/** Flushes a Svelte update after a click. */
const click = (element: Element): void => {
  flushSync(() => {
    fireEvent.click(element)
  })
}

/** Flushes a Svelte update after a keydown. */
const press = (element: Element | Document, init: KeyboardEventInit): void => {
  flushSync(() => {
    fireEvent.keyDown(element, init)
  })
}

/** Advances fake time and flushes the resulting component update. */
const advance = (ms: number): void => {
  flushSync(() => {
    vi.advanceTimersByTime(ms)
  })
}

/** Dispatches the bubbling event React derives `onMouseEnter` from. */
const pointerOver = (el: Element): void => {
  flushSync(() => {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })
}

/** Dispatches the bubbling event React derives `onMouseLeave` from. */
const pointerOut = (el: Element): void => {
  flushSync(() => {
    el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  })
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(iconSet)
})

afterEach(() => {
  teardown()
  vi.useRealTimers()
  document.body.style.overflow = ''
})

describe('@molecule/app-ui-svelte × REAL Svelte mount + REAL @molecule/app-ui bonds', () => {
  it('FAILURE DISAMBIGUATION: missing ClassMap vs missing icon set produce distinct, actionable errors', () => {
    // Both misconfigurations surface at first render. A weak executor must be
    // able to tell "you never called setClassMap" apart from "your icon bond
    // is missing" without bisecting the component tree.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      // 1. No ClassMap bonded at all.
      unbond('ui-classmap')
      const classMapError = mountError(Button, { children: text('Save') }) ?? ''
      teardown()
      expect(classMapError).toContain('No UIClassMap has been set')
      expect(classMapError).toContain('setClassMap()') // names the fix, not just the failure

      // 2. ClassMap bonded, but no icon set — a DIFFERENT failure with a
      //    DIFFERENT message naming the '@molecule/app-icons' bond package.
      setClassMap(classMap)
      unbond('icon-set')
      const iconError =
        mountError(Modal, {
          open: true,
          onClose: () => {},
          title: 'Hi',
          children: text('Body'),
        }) ?? ''
      teardown()
      // Assert what the message must ACHIEVE, not the bond-type string it used
      // to leak: it names the fix and a concrete bond to reach for.
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

  it('CONSUMER PROPERTY: full Modal lifecycle — open locks scroll, Escape closes, scroll is RESTORED', () => {
    mountIn(ProviderModalHost, { mode: 'lifecycle' })

    // Open: dialog present, body scroll locked, close button accessible via
    // the i18n defaultValue fallback (NO i18n bond is registered — graceful
    // degradation, not a crash).
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()

    // Escape closes…
    press(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    // …and the page must scroll again. A hostile default here (overflow left
    // 'hidden') freezes the whole app after the first dismissed dialog.
    expect(document.body.style.overflow).toBe('')
  })

  it('Modal click disambiguation: overlay click closes, content click does NOT', () => {
    const onClose = vi.fn()
    mountIn(Modal, {
      open: true,
      onClose,
      title: 'Confirm',
      children: text('Body content'),
    })

    // A click INSIDE the dialog must never be treated as a dismissal…
    click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    // …while a click on the backdrop wrapper is one.
    const wrapper = document.querySelector('.dialogWrapper')
    expect(wrapper).not.toBeNull()
    click(wrapper as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('CONSUMER PROPERTY: Toast default duration survives a realistic re-rendering stack', () => {
    // Every host re-render hands the Toast a fresh `onDismiss` closure, like
    // ToastProvider recreating each toast's callback on every provider
    // re-render. The 5000ms default countdown must NOT reset on those
    // re-renders — the regression this pins kept busy toast stacks on screen
    // forever.
    vi.useFakeTimers()
    const dismissed = vi.fn()
    mountIn(ProviderToastHost, { onDismiss: dismissed })
    // Default status is 'info' — role="status" (polite), not the assertive
    // "alert": a routine toast interrupting a screen reader mid-sentence is
    // the same over-announcing trap role="alert" creates for non-urgent
    // content everywhere else it's misused.
    expect(screen.getByRole('status')).toBeTruthy()

    const bump = document.querySelector('[data-bump]') as HTMLElement
    // Re-render at 1.5s, 3s and 4.5s — inside the 5s default window.
    for (let i = 0; i < 3; i++) {
      advance(1500)
      click(bump)
      expect(screen.getByRole('status')).toBeTruthy() // still visible mid-flow
    }

    // 4500ms elapsed; the ORIGINAL 5000ms deadline is 500ms away.
    advance(500)
    expect(screen.queryByRole('status')).toBeNull()
    expect(dismissed).toHaveBeenCalledTimes(1)
  })

  it('Toast duration={0} is persistent, and manual dismissal is a separate labeled path', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    mountIn(Toast, { title: 'Sticky', duration: 0, onDismiss })

    // "0 for persistent" (documented contract): a full minute passes, still shown.
    advance(60_000)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(onDismiss).not.toHaveBeenCalled()

    // The close button (i18n defaultValue fallback) dismisses it.
    click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('CONSUMER PROPERTY: Tooltip delay — a quick pass-over must never flash a late tooltip', () => {
    vi.useFakeTimers()
    mountIn(Tooltip, {
      content: 'Help text',
      delay: 300,
      children: markup('<button type="button">Trigger</button>'),
    })
    const trigger = screen.getByRole('button', { name: 'Trigger' })

    // Hover, but leave BEFORE the delay elapses…
    pointerOver(trigger.parentElement as HTMLElement)
    advance(200)
    expect(screen.queryByRole('tooltip')).toBeNull()
    pointerOut(trigger)
    // …the pending show timer must be cancelled — nothing may appear later.
    advance(10_000)
    expect(screen.queryByRole('tooltip')).toBeNull()

    // A deliberate hover: shown exactly after the full delay, not before.
    pointerOver(trigger.parentElement as HTMLElement)
    advance(299)
    expect(screen.queryByRole('tooltip')).toBeNull()
    advance(1)
    expect(screen.getByRole('tooltip').textContent).toBe('Help text')

    // Clicking the wrapped control dismisses the tooltip it triggered.
    click(screen.getByRole('button', { name: 'Trigger' }))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('Input failure disambiguation: error wins over hint, is announced, and ids never collide', () => {
    const onClear = vi.fn()
    mountIn(ProviderInputHost, { onClear })

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
    click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledTimes(1)

    // Hint-only state: describedby retargets to the hint element.
    click(document.querySelector('[data-toggle]') as HTMLElement)
    const hintId = (screen.getByLabelText('Email') as HTMLInputElement).getAttribute(
      'aria-describedby',
    ) as string
    expect(document.getElementById(hintId)?.textContent).toBe('We never share it')
  })

  it('two id-less Inputs with errors do not share an error id (no "undefined-error" collision)', () => {
    mountIn(Input, { label: 'First', error: 'err one' })
    mountIn(Input, { label: 'Second', error: 'err two' })
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

  it('Tabs real lifecycle: aria wiring resolves to real elements and follows selection', () => {
    const items = [
      { value: 'one', label: 'First', content: 'first content' },
      { value: 'two', label: 'Second', content: 'second content' },
    ]
    mountIn(Tabs, { items, defaultValue: 'one' })

    const firstTab = screen.getByRole('tab', { name: 'First' })
    expect(firstTab.getAttribute('aria-selected')).toBe('true')

    // The panel's aria-labelledby must point at an element that EXISTS (it
    // used to reference the bare tab value — an id nothing carried).
    const panel = screen.getByRole('tabpanel')
    const labelledBy = panel.getAttribute('aria-labelledby') as string
    expect(document.getElementById(labelledBy)).toBe(firstTab)
    expect(panel.textContent).toBe('first content')

    click(screen.getByRole('tab', { name: 'Second' }))
    expect(screen.getByRole('tab', { name: 'Second' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'First' }).getAttribute('aria-selected')).toBe('false')
    const panel2 = screen.getByRole('tabpanel')
    expect(panel2.textContent).toBe('second content')
    expect(document.getElementById(panel2.getAttribute('aria-labelledby') as string)).toBe(
      screen.getByRole('tab', { name: 'Second' }),
    )
  })

  it('Tabs: WAI-ARIA APG keyboard nav — Right/Left/Home/End move focus AND selection, roving tabindex skips disabled', () => {
    const items = [
      { value: 'one', label: 'First', content: 'first' },
      { value: 'two', label: 'Second', content: 'second', disabled: true },
      { value: 'three', label: 'Third', content: 'third' },
    ]
    mountIn(Tabs, { items, defaultValue: 'one' })

    const first = screen.getByRole('tab', { name: 'First' })
    const second = screen.getByRole('tab', { name: 'Second' })
    const third = screen.getByRole('tab', { name: 'Third' })
    // Keys go to the focused tab, as they do for a keyboard user who tabbed in.
    const focused = (): Element => document.activeElement ?? document.body
    first.focus()

    // Roving tabindex: only the active tab is a Tab stop — previously every
    // trigger was individually tabbable.
    expect(first.tabIndex).toBe(0)
    expect(second.tabIndex).toBe(-1)
    expect(third.tabIndex).toBe(-1)

    // ArrowRight from "First" skips the disabled "Second" and lands on
    // "Third" — automatic activation moves BOTH focus and selection.
    press(focused(), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(third)
    expect(third.getAttribute('aria-selected')).toBe('true')
    expect(third.tabIndex).toBe(0)
    expect(first.tabIndex).toBe(-1)
    expect(screen.getByRole('tabpanel').textContent).toBe('third')

    // Home returns focus + selection to the first enabled tab.
    press(focused(), { key: 'Home' })
    expect(document.activeElement).toBe(first)
    expect(first.getAttribute('aria-selected')).toBe('true')

    // ArrowLeft wraps around past the disabled tab to the last enabled one.
    press(focused(), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(third)

    // End jumps straight to the last enabled tab from anywhere.
    press(focused(), { key: 'Home' })
    press(focused(), { key: 'End' })
    expect(document.activeElement).toBe(third)
  })

  it('Tabs: variant/size are read from props and passed to tabsList/tabsTrigger/tabsContent — not silently dropped', () => {
    mountIn(ProviderTabsHost, {})
    expect(screen.getByRole('tablist').className).toContain('tabsList(variant=line,size=lg,color=)')
    expect(screen.getByRole('tab', { name: 'First' }).className).toContain(
      'tabsTrigger(variant=line,size=lg,color=)',
    )
    expect(screen.getByRole('tabpanel').className).toContain(
      'tabsContent(variant=line,size=lg,color=)',
    )

    // A different variant/size re-render produces DIFFERENT classes — proves
    // the props are read on every render, not baked in once.
    click(document.querySelector('[data-toggle]') as HTMLElement)
    expect(screen.getByRole('tablist').className).toContain(
      'tabsList(variant=solid-rounded,size=sm,color=)',
    )
    expect(screen.getByRole('tab', { name: 'First' }).className).toContain(
      'tabsTrigger(variant=solid-rounded,size=sm,color=)',
    )
  })

  it('Switch: color is read from props and passed to switchBase — not silently dropped', () => {
    mountIn(ProviderSwitchHost, {})
    expect(screen.getByRole('switch').className).toContain(
      'switchBase(variant=,size=lg,color=success)',
    )
    click(document.querySelector('[data-toggle]') as HTMLElement)
    expect(screen.getByRole('switch').className).toContain(
      'switchBase(variant=,size=sm,color=error)',
    )
  })

  it('Select: chevron is a real inline SVG using currentColor (cm.textMuted) — no hardcoded hex backgroundImage', () => {
    const host = mountIn(Select, {
      options: [{ value: 'a', label: 'A' }],
      value: 'a',
      onValueChange: () => {},
    })
    const select = host.querySelector('select') as HTMLSelectElement
    // The old fix baked '#6b7280' into a CSS backgroundImage data URI —
    // confirm that entire mechanism is gone.
    expect(select.style.backgroundImage).toBe('')
    const svg = host.querySelector('svg') as SVGElement
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('fill')).toBe('currentColor')
    // Styled via the ClassMap token every other muted icon uses — real
    // currentColor cascades with the active theme; a baked hex never could.
    expect(svg.getAttribute('class')).toContain('textMuted')
  })

  it('Select: clearable + placeholder never renders TWO value="" options; the clear label goes through i18n', () => {
    const host = mountIn(ProviderSelectHost, {})
    const select = host.querySelector('select') as HTMLSelectElement
    const emptyOptions = Array.from(select.options).filter((o) => o.value === '')
    expect(emptyOptions).toHaveLength(1)
    expect(emptyOptions[0].textContent).toBe('Choose one')

    // Without a placeholder, the clearable option renders — through t()'s
    // defaultValue fallback, not a hardcoded string bypassing i18n.
    click(document.querySelector('[data-toggle]') as HTMLElement)
    const select2 = host.querySelector('select') as HTMLSelectElement
    const clearOption = Array.from(select2.options).find((o) => o.value === '')
    expect(clearOption?.textContent).toBe('--')
  })

  it('Textarea autoResize works UNCONTROLLED — real `input` events resize it, not just the `value` prop', () => {
    mountIn(Textarea, {
      autoResize: true,
      defaultValue: 'line one',
      minRows: 2,
      testId: 'ta',
    })
    const el = screen.getByTestId('ta') as HTMLTextAreaElement
    const initialHeight = el.style.height

    // jsdom never lays out text, so scrollHeight stays 0 — stub what a real
    // browser would report once several more lines were typed.
    Object.defineProperty(el, 'scrollHeight', { value: 400, configurable: true })
    // Uncontrolled: no `value`/`onChange` prop drives this element, so only
    // a real native `input` listener (not the `[value, …]` effect deps) can
    // observe the keystroke and recompute.
    flushSync(() => {
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(el.style.height).not.toBe(initialHeight)
    expect(el.style.height).toBe('400px')
  })

  it('Accordion real lifecycle: expand/collapse with resolvable aria-controls', () => {
    const items = [
      { value: 'a', header: 'Section A', content: 'alpha body' },
      { value: 'b', header: 'Section B', content: 'beta body' },
    ]
    mountIn(Accordion, { items })

    const triggerA = screen.getByRole('button', { name: /Section A/ })
    expect(triggerA.getAttribute('aria-expanded')).toBe('false')
    // aria-controls resolves to a real element even while collapsed.
    const controlled = document.getElementById(triggerA.getAttribute('aria-controls') as string)
    expect(controlled).not.toBeNull()
    expect((controlled as HTMLElement).style.display).toBe('none')

    click(triggerA)
    expect(triggerA.getAttribute('aria-expanded')).toBe('true')
    expect((controlled as HTMLElement).style.display).toBe('block')

    // Single mode: expanding B collapses A.
    click(screen.getByRole('button', { name: /Section B/ }))
    expect(triggerA.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('button', { name: /Section B/ }).getAttribute('aria-expanded')).toBe(
      'true',
    )
  })

  it('RadioGroup: id-less/unlabeled groups still form REAL native radio groups', () => {
    const options = [
      { value: 'x', label: 'X' },
      { value: 'y', label: 'Y' },
    ]
    mountIn(RadioGroup, { options, value: 'x', onChange: () => {} })
    mountIn(RadioGroup, { options, value: 'y', onChange: () => {} })
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

  it('Checkbox: indeterminate reaches the DOM through a CALLBACK ref', () => {
    // Svelte has no ref callbacks; what a caller observes is the DOM property
    // on the rendered input, which is what React's callback ref sets too.
    mountIn(Checkbox, { indeterminate: true, label: 'Select all' })
    const node = document.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(node).not.toBeNull()
    // The old `(ref || internalRef).current` cast silently skipped this for
    // function refs — the tri-state visual just never appeared.
    expect(node.indeterminate).toBe(true)
  })

  it('Table: sortable headers expose aria-sort and toggle direction on click', () => {
    const onSort = vi.fn()
    mountIn(ProviderTableHost, { onSort })

    const nameHeader = screen.getByRole('columnheader', { name: /Name/ })
    const ageHeader = screen.getByRole('columnheader', { name: 'Age' })
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending')
    // Non-sortable columns carry NO aria-sort — sortable-but-unsorted would be 'none'.
    expect(ageHeader.getAttribute('aria-sort')).toBeNull()

    // Clicking the sorted column asks for the flipped direction.
    click(nameHeader)
    expect(onSort).toHaveBeenCalledWith('name', 'desc')
    expect(screen.getByRole('columnheader', { name: /Name/ }).getAttribute('aria-sort')).toBe(
      'descending',
    )
  })
})

describe('a11y contract — what assistive technology actually receives', () => {
  it('FAILURE DISAMBIGUATION: two stacked modals announce their OWN titles (no shared id)', () => {
    // The regression this pins: a hardcoded id="modal-title" on every dialog
    // meant aria-labelledby resolved to the FIRST match in the DOM — a
    // confirm dialog stacked over a drawer was announced with the DRAWER's
    // title, so a screen-reader user could not tell which dialog had focus.
    mountIn(Modal, {
      open: true,
      onClose: () => {},
      title: 'Edit profile',
      children: text('outer body'),
    })
    mountIn(Modal, {
      open: true,
      onClose: () => {},
      title: 'Discard changes?',
      children: text('inner body'),
    })
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

  it('an untitled Modal still gets an accessible name via aria-label passthrough', () => {
    // UserMenu's drawer renders Modal without `title`; the aria-* passthrough
    // must reach the dialog element or the drawer announces as "dialog" with
    // no name at all.
    mountIn(Modal, {
      open: true,
      onClose: () => {},
      'aria-label': 'Account menu',
      children: text('drawer body'),
    })
    expect(screen.getByRole('dialog', { name: 'Account menu' })).toBeTruthy()
  })

  it('Switch always exposes aria-checked — including the undefined/uncontrolled case', () => {
    mountIn(ProviderSwitchCheckedHost, {})
    // role="switch" REQUIRES aria-checked: undefined `checked` must announce
    // "off", not omit the attribute (which reads as broken/indeterminate).
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
    click(document.querySelector('[data-toggle]') as HTMLElement)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })

  it('Switch dispatches a REAL native Event: preventDefault/currentTarget work, and event.target.checked matches the pattern every flagship template uses', () => {
    // The universal fleet consumer pattern (accounting-invoicing,
    // ai-data-analyst, ai-meeting-notes, discussion-boards …):
    //   onChange={(e) => toggle((e.target as HTMLInputElement).checked)}
    // A synthetic `{ target: { checked } }` cast happened to read back
    // `.checked` but crashed the instant a caller called any real Event
    // method (preventDefault/stopPropagation). Read everything a caller
    // would actually need SYNCHRONOUSLY inside the handler — exactly where
    // every flagship template reads it — because a CONTROLLED checkbox's
    // `.checked` gets reconciled back to the (in this test, unchanged)
    // `checked` prop once the dispatch finishes.
    let capturedChecked: boolean | null = null
    let currentTargetIsInput = false
    let preventDefaultThrew = false
    let stopPropagationThrew = false
    const onChange = vi.fn((e: Event) => {
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
    mountIn(Switch, { label: 'Notify me', checked: false, onChange })
    click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledTimes(1)
    // Neither real Event method crashes.
    expect(preventDefaultThrew).toBe(false)
    expect(stopPropagationThrew).toBe(false)
    // The universal fleet consumer pattern —
    // `onChange={(e) => toggle((e.target as HTMLInputElement).checked)}` —
    // now reads the real, correct next value.
    expect(capturedChecked).toBe(true)
    expect(currentTargetIsInput).toBe(true)
  })

  it('FormField wires aria-describedby + a real id onto its child input (useId fallback when name is absent)', () => {
    mountIn(FormField, {
      label: 'Email',
      error: 'Required',
      children: markup('<input type="email" />'),
    })
    const label = screen.getByText('Email')
    const input = screen.getByLabelText('Email') as HTMLInputElement
    expect(label.getAttribute('for')).toBe(input.id)
    expect(input.id).toBeTruthy()
    const describedBy = input.getAttribute('aria-describedby') as string
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy)?.textContent).toBe('Required')
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('FormField: two id-less fields never collide on "undefined-error"', () => {
    mountIn(FormField, {
      label: 'Field A',
      error: 'err a',
      children: markup('<input />'),
    })
    mountIn(FormField, {
      label: 'Field B',
      error: 'err b',
      children: markup('<input />'),
    })
    expect(document.getElementById('undefined-error')).toBeNull()
    const a = screen.getByLabelText('Field A').getAttribute('aria-describedby')
    const b = screen.getByLabelText('Field B').getAttribute('aria-describedby')
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
    expect(document.getElementById(a as string)?.textContent).toBe('err a')
  })

  it('FloatingInput label is a REAL <label htmlFor>, not a bare unassociated <span>', () => {
    mountIn(FloatingInput, { placeholder: 'Full name' })
    // Fails before the fix: a bare <span> gives no programmatic
    // association, so getByLabelText finds nothing and throws.
    const input = screen.getByLabelText('Full name') as HTMLInputElement
    expect(input.id).toBeTruthy()
  })

  it('Checkbox error is programmatically associated, matching Input/Textarea/Select', () => {
    mountIn(Checkbox, {
      label: 'Accept terms',
      error: 'You must accept the terms',
    })
    const box = screen.getByRole('checkbox')
    expect(box.getAttribute('aria-invalid')).toBe('true')
    const describedBy = box.getAttribute('aria-describedby') as string
    expect(describedBy).toBeTruthy()
    // The reference resolves to the REAL rendered message — a bare sibling
    // <p> is never read by a screen reader, so the failure was invisible.
    expect(document.getElementById(describedBy)?.textContent).toBe('You must accept the terms')
  })

  it('CONSUMER PROPERTY: two RadioGroups with the SAME label stay independent groups', () => {
    // The regression this pins: `name={label}` merged every group sharing a
    // visible label (two "Size" pickers on one page) into ONE native radio
    // group — selecting in one silently deselected the other.
    const options = [
      { value: 's', label: 'Small' },
      { value: 'l', label: 'Large' },
    ]
    mountIn(RadioGroup, { label: 'Size', options, value: 's', onChange: () => {} })
    mountIn(RadioGroup, { label: 'Size', options, value: 'l', onChange: () => {} })
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios).toHaveLength(4)
    // Within a group the name is shared; across same-label groups it differs.
    expect(radios[0]!.name).toBe(radios[1]!.name)
    expect(radios[2]!.name).toBe(radios[3]!.name)
    expect(radios[0]!.name).not.toBe(radios[2]!.name)
  })

  it('RadioGroup honors an explicit form `name` and associates its error', () => {
    mountIn(RadioGroup, {
      label: 'Plan',
      name: 'plan',
      options: [{ value: 'pro', label: 'Pro' }],
      error: 'Pick a plan',
    })
    expect((screen.getByRole('radio') as HTMLInputElement).name).toBe('plan')
    const group = screen.getByRole('radiogroup')
    const describedBy = group.getAttribute('aria-describedby') as string
    expect(document.getElementById(describedBy)?.textContent).toBe('Pick a plan')
    expect(group.getAttribute('aria-invalid')).toBe('true')
  })

  it('two Tabs instances sharing tab values keep their aria wiring apart', () => {
    // The regression this pins: bare `tab-overview` ids collided across
    // instances, so a panel's aria-labelledby resolved to the OTHER
    // component's tab.
    const items = [{ value: 'overview', label: 'Overview', content: 'body' }]
    mountIn(Tabs, { items: items.map((i) => ({ ...i, content: 'first body' })) })
    mountIn(Tabs, { items: items.map((i) => ({ ...i, content: 'second body' })) })
    const tabs = screen.getAllByRole('tab')
    const panels = screen.getAllByRole('tabpanel')
    expect(tabs[0]!.id).not.toBe(tabs[1]!.id)
    // Each panel is labelled by ITS OWN tab element.
    expect(document.getElementById(panels[0]!.getAttribute('aria-labelledby') as string)).toBe(
      tabs[0],
    )
    expect(document.getElementById(panels[1]!.getAttribute('aria-labelledby') as string)).toBe(
      tabs[1],
    )
    // aria-controls resolves to the matching panel, not the twin's.
    expect(document.getElementById(tabs[0]!.getAttribute('aria-controls') as string)).toBe(
      panels[0],
    )
  })

  it('WCAG 1.4.13: Escape dismisses a visible tooltip without moving pointer or focus', () => {
    mountIn(Tooltip, {
      content: 'Help text',
      children: markup('<button type="button">Trigger</button>'),
    })
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    pointerOver(trigger.parentElement as HTMLElement)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    // Escape (bubbling from the focused child) must hide it — a tooltip you
    // can only dismiss by mousing away occludes the content under it.
    press(trigger, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('decorative icons are hidden from assistive tech; named icons are exposed', () => {
    // Chrome glyphs (close X, chevrons) get their meaning from the labelled
    // control around them; without aria-hidden some SR/browser combos
    // announce a stray "image" per glyph.
    mountIn(Modal, {
      open: true,
      onClose: () => {},
      title: 'Hi',
      children: text('body'),
    })
    const closeButton = screen.getByRole('button', { name: 'Close' })
    const svg = closeButton.querySelector('svg') as SVGElement
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')

    // The standalone Icon component: decorative by default…
    const decorativeHost = mountIn(Icon, { name: 'x-mark' })
    expect((decorativeHost.querySelector('svg') as SVGElement).getAttribute('aria-hidden')).toBe(
      'true',
    )
    // …but opting in with aria-label exposes it (no aria-hidden).
    const namedHost = mountIn(Icon, {
      name: 'x-mark',
      'aria-label': 'Remove',
      role: 'img',
    })
    const namedSvg = namedHost.querySelector('svg') as SVGElement
    expect(namedSvg.getAttribute('aria-hidden')).toBeNull()
    expect(namedSvg.getAttribute('aria-label')).toBe('Remove')
  })

  it('Progress clamps aria-valuenow into [0, max] like the visual bar', () => {
    mountIn(ProviderProgressHost, {})
    // value > max announced verbatim is invalid ARIA ("150 percent").
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
    click(document.querySelector('[data-toggle]') as HTMLElement)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
    click(document.querySelector('[data-toggle]') as HTMLElement)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull()
  })
})

describe('Modal — focus management (WAI-ARIA APG dialog pattern)', () => {
  it('CONSUMER PROPERTY: opening moves focus into the dialog; Escape closes it AND restores focus to the trigger', () => {
    mountIn(ProviderModalHost, { mode: 'focus' })
    const openButton = screen.getByRole('button', { name: 'Open' })
    openButton.focus()
    expect(document.activeElement).toBe(openButton)

    click(openButton)
    // The header close button renders before the body buttons in DOM order,
    // so it's the first focusable element — focus must land there, not stay
    // on the trigger behind the (aria-modal) overlay.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))

    press(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(openButton)
  })

  it('focuses the dialog element itself when it has no focusable content', () => {
    mountIn(Modal, {
      open: true,
      onClose: () => {},
      title: 'Empty',
      showCloseButton: false,
      children: markup('<p>Nothing focusable here</p>'),
    })
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('traps Tab: Shift+Tab from the first focusable wraps to the last, and vice versa', () => {
    mountIn(Modal, {
      open: true,
      onClose: () => {},
      title: 'Confirm',
      showCloseButton: false,
      children: markup(
        '<div><button type="button">First</button><button type="button">Last</button></div>',
      ),
    })
    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })
    expect(document.activeElement).toBe(first)

    press(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    press(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })

  it('FAILURE DISAMBIGUATION: Escape closes only the TOPMOST of two stacked dialogs', () => {
    const outerClose = vi.fn()
    const innerClose = vi.fn()
    mountIn(Modal, {
      open: true,
      onClose: outerClose,
      title: 'Outer',
      children: text('outer body'),
    })
    mountIn(Modal, {
      open: true,
      onClose: innerClose,
      title: 'Inner',
      children: text('inner body'),
    })
    press(document, { key: 'Escape' })
    // A confirm dialog stacked over a drawer must not vanish BOTH on one
    // Escape press — only the later-mounted (topmost) one responds.
    expect(innerClose).toHaveBeenCalledTimes(1)
    expect(outerClose).not.toHaveBeenCalled()
  })

  it('reference-counts the body scroll lock: closing one of two open dialogs keeps scroll locked', () => {
    mountIn(ProviderModalHost, { mode: 'stack' })
    expect(document.body.style.overflow).toBe('hidden')
    // Close the INNER dialog (topmost — its own Escape fires) while the
    // OUTER one stays open.
    press(document, { key: 'Escape' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    // A naive (non-reference-counted) lock would reset overflow to '' here,
    // silently unlocking page scroll behind the dialog still open.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('centered=false top-anchors the dialog instead of vertically centering it', () => {
    mountIn(ProviderModalHost, { mode: 'centered' })
    const wrapper = document.querySelector('.dialogWrapper') as HTMLElement
    expect(wrapper.style.alignItems).toBe('')
    click(document.querySelector('[data-toggle]') as HTMLElement)
    expect((document.querySelector('.dialogWrapper') as HTMLElement).style.alignItems).toBe(
      'flex-start',
    )
  })
})

describe('Dropdown — WAI-ARIA APG menu-button pattern', () => {
  // Dropdown reads `useLocation()` (to auto-close on route change), so every
  // mount needs a router-provided location — the file-level mock supplies the
  // fixed route a MemoryRouter would in React.
  const trigger = (): Snippet => markup('<button type="button">Actions</button>')

  it('CONSUMER PROPERTY: ArrowDown on the trigger opens the menu and focuses the first item', () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
    ]
    mountIn(Dropdown, { trigger: trigger(), items })
    const button = screen.getByRole('button', { name: 'Actions' })
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-expanded')).toBe('false')

    press(button, { key: 'ArrowDown' })
    expect(button.getAttribute('aria-expanded')).toBe('true')
    const menuItems = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(menuItems[0])
  })

  it('ArrowUp on the trigger opens the menu and focuses the LAST item', () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
    ]
    mountIn(Dropdown, { trigger: trigger(), items })
    press(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowUp' })
    const menuItems = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(menuItems[1])
  })

  it('ArrowDown/ArrowUp/Home/End roving-navigate the open menu (only the active item is tabbable)', () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
      { value: 'c', label: 'Item C' },
    ]
    mountIn(Dropdown, { trigger: trigger(), items })
    click(screen.getByRole('button', { name: 'Actions' }))
    const menuItems = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(menuItems[0])
    expect(menuItems[0]!.tabIndex).toBe(0)
    expect(menuItems[1]!.tabIndex).toBe(-1)

    press(menuItems[0]!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(menuItems[1])

    press(menuItems[1]!, { key: 'End' })
    expect(document.activeElement).toBe(menuItems[2])

    press(menuItems[2]!, { key: 'Home' })
    expect(document.activeElement).toBe(menuItems[0])
  })

  it('FAILURE DISAMBIGUATION: Escape restores focus to the trigger; an outside click does NOT', () => {
    const items = [{ value: 'a', label: 'Item A' }]
    const elsewhere = document.createElement('button')
    elsewhere.type = 'button'
    elsewhere.textContent = 'Elsewhere'
    document.body.appendChild(elsewhere)
    mountIn(Dropdown, { trigger: trigger(), items })
    const button = screen.getByRole('button', { name: 'Actions' })
    click(button)
    press(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(button)

    click(button)
    elsewhere.focus()
    flushSync(() => {
      fireEvent.mouseDown(elsewhere)
    })
    expect(screen.queryByRole('menu')).toBeNull()
    // The user's attention already moved elsewhere — an outside-click close
    // must not yank focus back to the trigger.
    expect(document.activeElement).toBe(elsewhere)
  })

  it('a non-element trigger (plain text) falls back to a keyboard-operable role="button" wrapper', () => {
    const items = [{ value: 'a', label: 'Item A' }]
    mountIn(Dropdown, { trigger: 'Menu', items })
    const button = screen.getByRole('button', { name: 'Menu' })
    expect(button.tabIndex).toBe(0)
    press(button, { key: 'Enter' })
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('width="trigger" never renders the invalid literal CSS value "trigger"', () => {
    const items = [{ value: 'a', label: 'Item A' }]
    mountIn(Dropdown, { trigger: trigger(), items, width: 'trigger' })
    click(screen.getByRole('button', { name: 'Actions' }))
    // Before the fix, the first-open frame (before the trigger ref is
    // measurable) rendered the literal string 'trigger' as the CSS `width`
    // value — invalid, silently ignored by the browser.
    expect(screen.getByRole('menu').style.width).not.toBe('trigger')
  })
})

describe('Tooltip — hasArrow and programmatic content association', () => {
  it('hasArrow renders a themed pointer only when requested', () => {
    mountIn(Tooltip, {
      content: 'Help text',
      children: markup('<button type="button">Trigger</button>'),
    })
    pointerOver(screen.getByRole('button', { name: 'Trigger' }).parentElement as HTMLElement)
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.parentElement?.querySelector('[aria-hidden="true"]')).toBeNull()
    teardown()

    mountIn(Tooltip, {
      content: 'Help text',
      hasArrow: true,
      children: markup('<button type="button">Trigger</button>'),
    })
    pointerOver(screen.getByRole('button', { name: 'Trigger' }).parentElement as HTMLElement)
    const tooltipWithArrow = screen.getByRole('tooltip')
    const arrow = tooltipWithArrow.parentElement?.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement
    expect(arrow).toBeTruthy()
    expect(arrow.style.transform).toContain('rotate(45deg)')
  })

  it('CONSUMER PROPERTY: the visible tooltip is programmatically associated with the focused trigger', () => {
    vi.useFakeTimers()
    mountIn(Tooltip, {
      content: 'Help text',
      children: markup('<button type="button">Trigger</button>'),
    })
    const tooltipTrigger = screen.getByRole('button', { name: 'Trigger' })
    expect(tooltipTrigger.getAttribute('aria-describedby')).toBeNull()
    pointerOver(tooltipTrigger.parentElement as HTMLElement)
    const tooltipId = screen.getByRole('tooltip').id
    expect(tooltipId).toBeTruthy()
    // The child that actually receives focus/hover carries the reference —
    // not the wrapper div, which is never itself the focused element.
    expect(tooltipTrigger.getAttribute('aria-describedby')).toBe(tooltipId)
    pointerOut(tooltipTrigger.parentElement as HTMLElement)
    advance(150)
    expect(tooltipTrigger.getAttribute('aria-describedby')).toBeNull()
  })
})

describe('Alert — `live` prop drives assertive vs polite announcement', () => {
  it('defaults to the assertive role="alert" (unchanged default); live={false} announces politely instead', () => {
    mountIn(ProviderAlertHost, {})
    expect(screen.getByRole('alert')).toBeTruthy()
    click(document.querySelector('[data-toggle]') as HTMLElement)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })
})
