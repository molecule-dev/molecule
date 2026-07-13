// @vitest-environment jsdom
/**
 * REAL-DEPENDENCY integration tests — no mocks: the actual react-dom render
 * pipeline, the REAL `@molecule/app-ui` bond registry (`setClassMap`), the
 * REAL `@molecule/app-icons` bond (`setIconSet`), and the REAL i18n
 * `defaultValue` fallback path.
 *
 * Every other render test in this package `vi.mock`s `@molecule/app-ui` — the
 * very interface layer these components wrap — so those suites can only
 * validate OUR assumptions about the contract, not the contract. This file
 * wires a genuine (deterministic, naming-convention) ClassMap and a genuine
 * icon set through the real bond APIs and exercises consumer-visible
 * lifecycles end-to-end, following the pattern of
 * `api/bonds/two-factor/otplib/src/__tests__/provider.integration.test.ts`:
 * at least one CONSUMER-EXPERIENCE property (does default behavior survive a
 * realistic flow?) and failure-mode DISAMBIGUATION (can a caller tell one
 * misconfiguration apart from another?).
 *
 * @module
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React, { useState } from 'react'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { IconData, IconSet } from '@molecule/app-icons'
import { setIconSet } from '@molecule/app-icons'
import type { ClassMapValue, UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

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

/** Error boundary so React 19's non-rethrowing render errors are observable. */
class Catcher extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  /**
   * Captures the render error into state.
   * @param error - The error thrown during descendant render.
   * @returns The state carrying the caught error.
   */
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }
  /**
   * Renders the caught error message, or the children when no error occurred.
   * @returns The caught-error marker element or the children.
   */
  render(): React.ReactNode {
    return this.state.error ? (
      <div data-testid="caught">{this.state.error.message}</div>
    ) : (
      this.props.children
    )
  }
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(iconSet)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.style.overflow = ''
})

describe('@molecule/app-ui-react × REAL react-dom + REAL @molecule/app-ui bonds', () => {
  it('FAILURE DISAMBIGUATION: missing ClassMap vs missing icon set produce distinct, actionable errors', () => {
    // Both misconfigurations surface at first render. A weak executor must be
    // able to tell "you never called setClassMap" apart from "your icon bond
    // is missing" without bisecting the component tree.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      // 1. No ClassMap bonded at all.
      setClassMap(undefined as unknown as UIClassMap)
      const first = render(
        <Catcher>
          <Button>Save</Button>
        </Catcher>,
      )
      const classMapError = first.getByTestId('caught').textContent ?? ''
      expect(classMapError).toContain('No UIClassMap has been set')
      expect(classMapError).toContain('setClassMap()') // names the fix, not just the failure
      first.unmount()

      // 2. ClassMap bonded, but no icon set — a DIFFERENT failure with a
      //    DIFFERENT message naming the 'icon-set' bond.
      setClassMap(classMap)
      setIconSet(undefined as unknown as IconSet)
      const second = render(
        <Catcher>
          <Modal open onClose={() => {}} title="Hi">
            Body
          </Modal>
        </Catcher>,
      )
      const iconError = second.getByTestId('caught').textContent ?? ''
      expect(iconError).toContain("'icon-set'")
      expect(iconError).not.toContain('UIClassMap')
      expect(iconError).not.toBe(classMapError)
      second.unmount()
    } finally {
      consoleError.mockRestore()
      setClassMap(classMap)
      setIconSet(iconSet)
    }
  })

  it('CONSUMER PROPERTY: full Modal lifecycle — open locks scroll, Escape closes, scroll is RESTORED', () => {
    const Harness = (): React.JSX.Element => {
      const [open, setOpen] = useState(true)
      return (
        <Modal open={open} onClose={() => setOpen(false)} title="Confirm">
          Body content
        </Modal>
      )
    }
    render(<Harness />)

    // Open: dialog present, body scroll locked, close button accessible via
    // the i18n defaultValue fallback (NO i18n bond is registered — graceful
    // degradation, not a crash).
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()

    // Escape closes…
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    // …and the page must scroll again. A hostile default here (overflow left
    // 'hidden') freezes the whole app after the first dismissed dialog.
    expect(document.body.style.overflow).toBe('')
  })

  it('Modal click disambiguation: overlay click closes, content click does NOT', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirm">
        Body content
      </Modal>,
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

  it('CONSUMER PROPERTY: Toast default duration survives a realistic re-rendering stack', () => {
    // ToastProvider recreates each toast's `onDismiss` closure on every
    // provider re-render (new toasts arriving, parent state changes). The
    // 5000ms default countdown must NOT reset on those re-renders — the
    // regression this pins kept busy toast stacks on screen forever.
    vi.useFakeTimers()
    let dismissed = 0
    const ui = (): React.JSX.Element => (
      // A fresh arrow function each call — new identity, like ToastProvider.
      <Toast title="Saved" onDismiss={() => dismissed++} />
    )
    const view = render(ui())
    // Default status is 'info' — role="status" (polite), not the assertive
    // "alert": a routine toast interrupting a screen reader mid-sentence is
    // the same over-announcing trap role="alert" creates for non-urgent
    // content everywhere else it's misused.
    expect(screen.getByRole('status')).toBeTruthy()

    // Re-render at 1.5s, 3s and 4.5s — inside the 5s default window.
    for (let i = 0; i < 3; i++) {
      act(() => vi.advanceTimersByTime(1500))
      view.rerender(ui())
      expect(screen.getByRole('status')).toBeTruthy() // still visible mid-flow
    }

    // 4500ms elapsed; the ORIGINAL 5000ms deadline is 500ms away.
    act(() => vi.advanceTimersByTime(500))
    expect(screen.queryByRole('status')).toBeNull()
    expect(dismissed).toBe(1)
  })

  it('Toast duration={0} is persistent, and manual dismissal is a separate labeled path', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toast title="Sticky" duration={0} onDismiss={onDismiss} />)

    // "0 for persistent" (documented contract): a full minute passes, still shown.
    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.getByRole('status')).toBeTruthy()
    expect(onDismiss).not.toHaveBeenCalled()

    // The close button (i18n defaultValue fallback) dismisses it.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('CONSUMER PROPERTY: Tooltip delay — a quick pass-over must never flash a late tooltip', () => {
    vi.useFakeTimers()
    render(
      <Tooltip content="Help text" delay={300}>
        <button type="button">Trigger</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement as HTMLElement

    // Hover, but leave BEFORE the delay elapses…
    fireEvent.mouseOver(trigger)
    act(() => vi.advanceTimersByTime(200))
    expect(screen.queryByRole('tooltip')).toBeNull()
    fireEvent.mouseOut(trigger)
    // …the pending show timer must be cancelled — nothing may appear later.
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.queryByRole('tooltip')).toBeNull()

    // A deliberate hover: shown exactly after the full delay, not before.
    fireEvent.mouseOver(trigger)
    act(() => vi.advanceTimersByTime(299))
    expect(screen.queryByRole('tooltip')).toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('tooltip').textContent).toBe('Help text')

    // Clicking the wrapped control dismisses the tooltip it triggered.
    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }))
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('Input failure disambiguation: error wins over hint, is announced, and ids never collide', () => {
    const onClear = vi.fn()
    const { rerender } = render(
      <Input
        label="Email"
        hint="We never share it"
        error="Invalid address"
        clearable
        value="nope"
        onChange={() => {}}
        onClear={onClear}
      />,
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
    rerender(
      <Input label="Email" hint="We never share it" clearable value="ok" onChange={() => {}} />,
    )
    const hintId = (screen.getByLabelText('Email') as HTMLInputElement).getAttribute(
      'aria-describedby',
    ) as string
    expect(document.getElementById(hintId)?.textContent).toBe('We never share it')
  })

  it('two id-less Inputs with errors do not share an error id (no "undefined-error" collision)', () => {
    render(
      <div>
        <Input label="First" error="err one" />
        <Input label="Second" error="err two" />
      </div>,
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

  it('Tabs real lifecycle: aria wiring resolves to real elements and follows selection', () => {
    const items = [
      { value: 'one', label: 'First', content: 'first content' },
      { value: 'two', label: 'Second', content: 'second content' },
    ]
    render(<Tabs items={items} defaultValue="one" />)

    const firstTab = screen.getByRole('tab', { name: 'First' })
    expect(firstTab.getAttribute('aria-selected')).toBe('true')

    // The panel's aria-labelledby must point at an element that EXISTS (it
    // used to reference the bare tab value — an id nothing carried).
    const panel = screen.getByRole('tabpanel')
    const labelledBy = panel.getAttribute('aria-labelledby') as string
    expect(document.getElementById(labelledBy)).toBe(firstTab)
    expect(panel.textContent).toBe('first content')

    fireEvent.click(screen.getByRole('tab', { name: 'Second' }))
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
    render(<Tabs items={items} defaultValue="one" />)

    const first = screen.getByRole('tab', { name: 'First' })
    const second = screen.getByRole('tab', { name: 'Second' })
    const third = screen.getByRole('tab', { name: 'Third' })
    const tablist = screen.getByRole('tablist')

    // Roving tabindex: only the active tab is a Tab stop — previously every
    // trigger was individually tabbable.
    expect(first.tabIndex).toBe(0)
    expect(second.tabIndex).toBe(-1)
    expect(third.tabIndex).toBe(-1)

    // ArrowRight from "First" skips the disabled "Second" and lands on
    // "Third" — automatic activation moves BOTH focus and selection.
    fireEvent.keyDown(tablist, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(third)
    expect(third.getAttribute('aria-selected')).toBe('true')
    expect(third.tabIndex).toBe(0)
    expect(first.tabIndex).toBe(-1)
    expect(screen.getByRole('tabpanel').textContent).toBe('third')

    // Home returns focus + selection to the first enabled tab.
    fireEvent.keyDown(tablist, { key: 'Home' })
    expect(document.activeElement).toBe(first)
    expect(first.getAttribute('aria-selected')).toBe('true')

    // ArrowLeft wraps around past the disabled tab to the last enabled one.
    fireEvent.keyDown(tablist, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(third)

    // End jumps straight to the last enabled tab from anywhere.
    fireEvent.keyDown(tablist, { key: 'Home' })
    fireEvent.keyDown(tablist, { key: 'End' })
    expect(document.activeElement).toBe(third)
  })

  it('Tabs: variant/size are read from props and passed to tabsList/tabsTrigger/tabsContent — not silently dropped', () => {
    const items = [{ value: 'one', label: 'First', content: 'first body' }]
    const { rerender } = render(<Tabs items={items} defaultValue="one" variant="line" size="lg" />)
    expect(screen.getByRole('tablist').className).toContain('tabsList(variant=line,size=lg,color=)')
    expect(screen.getByRole('tab', { name: 'First' }).className).toContain(
      'tabsTrigger(variant=line,size=lg,color=)',
    )
    expect(screen.getByRole('tabpanel').className).toContain(
      'tabsContent(variant=line,size=lg,color=)',
    )

    // A different variant/size re-render produces DIFFERENT classes — proves
    // the props are read on every render, not baked in once.
    rerender(<Tabs items={items} defaultValue="one" variant="solid-rounded" size="sm" />)
    expect(screen.getByRole('tablist').className).toContain(
      'tabsList(variant=solid-rounded,size=sm,color=)',
    )
    expect(screen.getByRole('tab', { name: 'First' }).className).toContain(
      'tabsTrigger(variant=solid-rounded,size=sm,color=)',
    )
  })

  it('Switch: color is read from props and passed to switchBase — not silently dropped', () => {
    const { rerender } = render(<Switch label="Notify" checked color="success" size="lg" />)
    expect(screen.getByRole('switch').className).toContain(
      'switchBase(variant=,size=lg,color=success)',
    )
    rerender(<Switch label="Notify" checked color="error" size="sm" />)
    expect(screen.getByRole('switch').className).toContain(
      'switchBase(variant=,size=sm,color=error)',
    )
  })

  it('Select: chevron is a real inline SVG using currentColor (cm.textMuted) — no hardcoded hex backgroundImage', () => {
    const { container } = render(
      <Select options={[{ value: 'a', label: 'A' }]} value="a" onValueChange={() => {}} />,
    )
    const select = container.querySelector('select') as HTMLSelectElement
    // The old fix baked '#6b7280' into a CSS backgroundImage data URI —
    // confirm that entire mechanism is gone.
    expect(select.style.backgroundImage).toBe('')
    const svg = container.querySelector('svg') as SVGElement
    expect(svg).toBeTruthy()
    expect(svg.getAttribute('fill')).toBe('currentColor')
    // Styled via the ClassMap token every other muted icon uses — real
    // currentColor cascades with the active theme; a baked hex never could.
    expect(svg.getAttribute('class')).toContain('textMuted')
  })

  it('Select: clearable + placeholder never renders TWO value="" options; the clear label goes through i18n', () => {
    const options = [{ value: 'a', label: 'A' }]
    const { container, rerender } = render(
      <Select
        options={options}
        placeholder="Choose one"
        clearable
        value=""
        onValueChange={() => {}}
      />,
    )
    const select = container.querySelector('select') as HTMLSelectElement
    const emptyOptions = Array.from(select.options).filter((o) => o.value === '')
    expect(emptyOptions).toHaveLength(1)
    expect(emptyOptions[0].textContent).toBe('Choose one')

    // Without a placeholder, the clearable option renders — through t()'s
    // defaultValue fallback, not a hardcoded string bypassing i18n.
    rerender(<Select options={options} clearable value="" onValueChange={() => {}} />)
    const select2 = container.querySelector('select') as HTMLSelectElement
    const clearOption = Array.from(select2.options).find((o) => o.value === '')
    expect(clearOption?.textContent).toBe('--')
  })

  it('Textarea autoResize works UNCONTROLLED — real `input` events resize it, not just the `value` prop', () => {
    render(<Textarea autoResize defaultValue="line one" minRows={2} testId="ta" />)
    const el = screen.getByTestId('ta') as HTMLTextAreaElement
    const initialHeight = el.style.height

    // jsdom never lays out text, so scrollHeight stays 0 — stub what a real
    // browser would report once several more lines were typed.
    Object.defineProperty(el, 'scrollHeight', { value: 400, configurable: true })
    // Uncontrolled: no `value`/`onChange` prop drives this element, so only
    // a real native `input` listener (not the `[value, …]` effect deps) can
    // observe the keystroke and recompute.
    fireEvent.input(el, { target: { value: 'line one\nline two\nline three\nline four' } })

    expect(el.style.height).not.toBe(initialHeight)
    expect(el.style.height).toBe('400px')
  })

  it('Accordion real lifecycle: expand/collapse with resolvable aria-controls', () => {
    const items = [
      { value: 'a', header: 'Section A', content: 'alpha body' },
      { value: 'b', header: 'Section B', content: 'beta body' },
    ]
    render(<Accordion items={items} />)

    const triggerA = screen.getByRole('button', { name: /Section A/ })
    expect(triggerA.getAttribute('aria-expanded')).toBe('false')
    // aria-controls resolves to a real element even while collapsed.
    const controlled = document.getElementById(triggerA.getAttribute('aria-controls') as string)
    expect(controlled).not.toBeNull()
    expect((controlled as HTMLElement).style.display).toBe('none')

    fireEvent.click(triggerA)
    expect(triggerA.getAttribute('aria-expanded')).toBe('true')
    expect((controlled as HTMLElement).style.display).toBe('block')

    // Single mode: expanding B collapses A.
    fireEvent.click(screen.getByRole('button', { name: /Section B/ }))
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
    render(
      <div>
        <RadioGroup options={options} value="x" onChange={() => {}} />
        <RadioGroup options={options} value="y" onChange={() => {}} />
      </div>,
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

  it('Checkbox: indeterminate reaches the DOM through a CALLBACK ref', () => {
    let node: HTMLInputElement | null = null
    render(
      <Checkbox
        indeterminate
        label="Select all"
        ref={(n: HTMLInputElement | null) => {
          node = n
        }}
      />,
    )
    expect(node).not.toBeNull()
    // The old `(ref || internalRef).current` cast silently skipped this for
    // function refs — the tri-state visual just never appeared.
    expect((node as unknown as HTMLInputElement).indeterminate).toBe(true)
  })

  it('Table: sortable headers expose aria-sort and toggle direction on click', () => {
    const columns = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'age', header: 'Age' },
    ]
    const data = [
      { name: 'Ada', age: 36 },
      { name: 'Grace', age: 85 },
    ]
    const onSort = vi.fn()
    const { rerender } = render(
      <Table
        data={data}
        columns={columns}
        sort={{ key: 'name', direction: 'asc' }}
        onSort={onSort}
      />,
    )

    const nameHeader = screen.getByRole('columnheader', { name: /Name/ })
    const ageHeader = screen.getByRole('columnheader', { name: 'Age' })
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending')
    // Non-sortable columns carry NO aria-sort — sortable-but-unsorted would be 'none'.
    expect(ageHeader.getAttribute('aria-sort')).toBeNull()

    // Clicking the sorted column asks for the flipped direction.
    fireEvent.click(nameHeader)
    expect(onSort).toHaveBeenCalledWith('name', 'desc')

    rerender(
      <Table
        data={data}
        columns={columns}
        sort={{ key: 'name', direction: 'desc' }}
        onSort={onSort}
      />,
    )
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
    render(
      <div>
        <Modal open onClose={() => {}} title="Edit profile">
          outer body
        </Modal>
        <Modal open onClose={() => {}} title="Discard changes?">
          inner body
        </Modal>
      </div>,
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

  it('an untitled Modal still gets an accessible name via aria-label passthrough', () => {
    // UserMenu's drawer renders Modal without `title`; the aria-* passthrough
    // must reach the dialog element or the drawer announces as "dialog" with
    // no name at all.
    render(
      <Modal open onClose={() => {}} aria-label="Account menu">
        drawer body
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Account menu' })).toBeTruthy()
  })

  it('Switch always exposes aria-checked — including the undefined/uncontrolled case', () => {
    const { rerender } = render(<Switch label="Notifications" />)
    // role="switch" REQUIRES aria-checked: undefined `checked` must announce
    // "off", not omit the attribute (which reads as broken/indeterminate).
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
    rerender(<Switch label="Notifications" checked />)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })

  it('Switch dispatches a REAL native Event: preventDefault/currentTarget work, and event.target.checked matches the pattern every flagship template uses', () => {
    // The universal fleet consumer pattern (accounting-invoicing,
    // ai-data-analyst, ai-meeting-notes, discussion-boards …):
    //   onChange={(e) => toggle((e.target as HTMLInputElement).checked)}
    // The previous `{ target: { checked } } as unknown as Event` cast
    // happened to read back `.checked` but crashed the instant a caller
    // called any real Event method (preventDefault/stopPropagation).
    // Read everything a caller would actually need SYNCHRONOUSLY inside the
    // handler — exactly where every flagship template reads it — because a
    // CONTROLLED checkbox's `.checked` gets reconciled back to the (in this
    // test, unchanged) `checked` prop once the dispatch finishes, same as a
    // real native controlled `<input type="checkbox">` would.
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
    render(<Switch label="Notify me" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledTimes(1)
    // Neither real Event method crashes — the previous
    // `{ target: { checked } } as unknown as Event` cast threw "not a
    // function" the instant either was called.
    expect(preventDefaultThrew).toBe(false)
    expect(stopPropagationThrew).toBe(false)
    // The universal fleet consumer pattern —
    // `onChange={(e) => toggle((e.target as HTMLInputElement).checked)}` —
    // now reads the real, correct next value.
    expect(capturedChecked).toBe(true)
    expect(currentTargetIsInput).toBe(true)
  })

  it('FormField wires aria-describedby + a real id onto its child input (useId fallback when name is absent)', () => {
    render(
      <FormField label="Email" error="Required">
        <input type="email" />
      </FormField>,
    )
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
    render(
      <div>
        <FormField label="Field A" error="err a">
          <input />
        </FormField>
        <FormField label="Field B" error="err b">
          <input />
        </FormField>
      </div>,
    )
    expect(document.getElementById('undefined-error')).toBeNull()
    const a = screen.getByLabelText('Field A').getAttribute('aria-describedby')
    const b = screen.getByLabelText('Field B').getAttribute('aria-describedby')
    expect(a).toBeTruthy()
    expect(a).not.toBe(b)
    expect(document.getElementById(a as string)?.textContent).toBe('err a')
  })

  it('FloatingInput label is a REAL <label htmlFor>, not a bare unassociated <span>', () => {
    render(<FloatingInput placeholder="Full name" />)
    // Fails before the fix: a bare <span> gives no programmatic
    // association, so getByLabelText finds nothing and throws.
    const input = screen.getByLabelText('Full name') as HTMLInputElement
    expect(input.id).toBeTruthy()
  })

  it('Checkbox error is programmatically associated, matching Input/Textarea/Select', () => {
    render(<Checkbox label="Accept terms" error="You must accept the terms" />)
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
    render(
      <div>
        <RadioGroup label="Size" options={options} value="s" onChange={() => {}} />
        <RadioGroup label="Size" options={options} value="l" onChange={() => {}} />
      </div>,
    )
    const radios = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(radios).toHaveLength(4)
    // Within a group the name is shared; across same-label groups it differs.
    expect(radios[0].name).toBe(radios[1].name)
    expect(radios[2].name).toBe(radios[3].name)
    expect(radios[0].name).not.toBe(radios[2].name)
  })

  it('RadioGroup honors an explicit form `name` and associates its error', () => {
    render(
      <RadioGroup
        label="Plan"
        name="plan"
        options={[{ value: 'pro', label: 'Pro' }]}
        error="Pick a plan"
      />,
    )
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
    render(
      <div>
        <Tabs items={items.map((i) => ({ ...i, content: 'first body' }))} />
        <Tabs items={items.map((i) => ({ ...i, content: 'second body' }))} />
      </div>,
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

  it('WCAG 1.4.13: Escape dismisses a visible tooltip without moving pointer or focus', () => {
    render(
      <Tooltip content="Help text">
        <button type="button">Trigger</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    fireEvent.mouseOver(trigger.parentElement as HTMLElement)
    expect(screen.getByRole('tooltip')).toBeTruthy()
    // Escape (bubbling from the focused child) must hide it — a tooltip you
    // can only dismiss by mousing away occludes the content under it.
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('decorative icons are hidden from assistive tech; named icons are exposed', () => {
    // Chrome glyphs (close X, chevrons) get their meaning from the labelled
    // control around them; without aria-hidden some SR/browser combos
    // announce a stray "image" per glyph.
    render(
      <Modal open onClose={() => {}} title="Hi">
        body
      </Modal>,
    )
    const closeButton = screen.getByRole('button', { name: 'Close' })
    const svg = closeButton.querySelector('svg') as SVGElement
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')

    // The standalone Icon component: decorative by default…
    const { container } = render(<Icon name="x-mark" />)
    expect((container.querySelector('svg') as SVGElement).getAttribute('aria-hidden')).toBe('true')
    // …but opting in with aria-label exposes it (no aria-hidden).
    const named = render(<Icon name="x-mark" aria-label="Remove" role="img" />)
    const namedSvg = named.container.querySelector('svg') as SVGElement
    expect(namedSvg.getAttribute('aria-hidden')).toBeNull()
    expect(namedSvg.getAttribute('aria-label')).toBe('Remove')
  })

  it('Progress clamps aria-valuenow into [0, max] like the visual bar', () => {
    const { rerender } = render(<Progress value={150} max={100} label="Upload" />)
    // value > max announced verbatim is invalid ARIA ("150 percent").
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
    rerender(<Progress value={-5} max={100} label="Upload" />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0')
    rerender(<Progress value={40} max={100} label="Upload" indeterminate />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull()
  })
})

describe('Modal — focus management (WAI-ARIA APG dialog pattern)', () => {
  it('CONSUMER PROPERTY: opening moves focus into the dialog; Escape closes it AND restores focus to the trigger', () => {
    const Harness = (): React.JSX.Element => {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Modal open={open} onClose={() => setOpen(false)} title="Confirm">
            <button type="button">First</button>
            <button type="button">Second</button>
          </Modal>
        </div>
      )
    }
    render(<Harness />)
    const openButton = screen.getByRole('button', { name: 'Open' })
    openButton.focus()
    expect(document.activeElement).toBe(openButton)

    fireEvent.click(openButton)
    // The header close button renders before the body buttons in DOM order,
    // so it's the first focusable element — focus must land there, not stay
    // on the trigger behind the (aria-modal) overlay.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(openButton)
  })

  it('focuses the dialog element itself when it has no focusable content', () => {
    render(
      <Modal open onClose={() => {}} title="Empty" showCloseButton={false}>
        <p>Nothing focusable here</p>
      </Modal>,
    )
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('traps Tab: Shift+Tab from the first focusable wraps to the last, and vice versa', () => {
    render(
      <Modal open onClose={() => {}} title="Confirm" showCloseButton={false}>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>,
    )
    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })

  it('FAILURE DISAMBIGUATION: Escape closes only the TOPMOST of two stacked dialogs', () => {
    const outerClose = vi.fn()
    const innerClose = vi.fn()
    render(
      <div>
        <Modal open onClose={outerClose} title="Outer">
          outer body
        </Modal>
        <Modal open onClose={innerClose} title="Inner">
          inner body
        </Modal>
      </div>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    // A confirm dialog stacked over a drawer must not vanish BOTH on one
    // Escape press — only the later-mounted (topmost) one responds.
    expect(innerClose).toHaveBeenCalledTimes(1)
    expect(outerClose).not.toHaveBeenCalled()
  })

  it('reference-counts the body scroll lock: closing one of two open dialogs keeps scroll locked', () => {
    const Harness = (): React.JSX.Element => {
      const [showInner, setShowInner] = useState(true)
      return (
        <div>
          <Modal open onClose={() => {}} title="Outer">
            outer
          </Modal>
          {showInner && (
            <Modal open onClose={() => setShowInner(false)} title="Inner">
              inner
            </Modal>
          )}
        </div>
      )
    }
    render(<Harness />)
    expect(document.body.style.overflow).toBe('hidden')
    // Close the INNER dialog (topmost — its own Escape fires) while the
    // OUTER one stays open.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    // A naive (non-reference-counted) lock would reset overflow to '' here,
    // silently unlocking page scroll behind the dialog still open.
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('centered=false top-anchors the dialog instead of vertically centering it', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} title="A">
        body
      </Modal>,
    )
    const wrapper = document.querySelector('.dialogWrapper') as HTMLElement
    expect(wrapper.style.alignItems).toBe('')
    rerender(
      <Modal open onClose={() => {}} title="A" centered={false}>
        body
      </Modal>,
    )
    expect(wrapper.style.alignItems).toBe('flex-start')
  })
})

describe('Dropdown — WAI-ARIA APG menu-button pattern', () => {
  // Dropdown reads `useLocation()` (to auto-close on route change), so every
  // render needs a real Router context — this file exercises the REAL
  // dependency graph rather than mocking react-router-dom away.
  it('CONSUMER PROPERTY: ArrowDown on the trigger opens the menu and focuses the first item', () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
    ]
    render(
      <MemoryRouter>
        <Dropdown trigger={<button type="button">Actions</button>} items={items} />
      </MemoryRouter>,
    )
    const trigger = screen.getByRole('button', { name: 'Actions' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const menuItems = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(menuItems[0])
  })

  it('ArrowUp on the trigger opens the menu and focuses the LAST item', () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
    ]
    render(
      <MemoryRouter>
        <Dropdown trigger={<button type="button">Actions</button>} items={items} />
      </MemoryRouter>,
    )
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowUp' })
    const menuItems = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(menuItems[1])
  })

  it('ArrowDown/ArrowUp/Home/End roving-navigate the open menu (only the active item is tabbable)', () => {
    const items = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
      { value: 'c', label: 'Item C' },
    ]
    render(
      <MemoryRouter>
        <Dropdown trigger={<button type="button">Actions</button>} items={items} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    const menuItems = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(menuItems[0])
    expect(menuItems[0].tabIndex).toBe(0)
    expect(menuItems[1].tabIndex).toBe(-1)

    fireEvent.keyDown(menuItems[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(menuItems[1])

    fireEvent.keyDown(menuItems[1], { key: 'End' })
    expect(document.activeElement).toBe(menuItems[2])

    fireEvent.keyDown(menuItems[2], { key: 'Home' })
    expect(document.activeElement).toBe(menuItems[0])
  })

  it('FAILURE DISAMBIGUATION: Escape restores focus to the trigger; an outside click does NOT', () => {
    const items = [{ value: 'a', label: 'Item A' }]
    render(
      <MemoryRouter>
        <div>
          <Dropdown trigger={<button type="button">Actions</button>} items={items} />
          <button type="button">Elsewhere</button>
        </div>
      </MemoryRouter>,
    )
    const trigger = screen.getByRole('button', { name: 'Actions' })
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })
    elsewhere.focus()
    fireEvent.mouseDown(elsewhere)
    expect(screen.queryByRole('menu')).toBeNull()
    // The user's attention already moved elsewhere — an outside-click close
    // must not yank focus back to the trigger.
    expect(document.activeElement).toBe(elsewhere)
  })

  it('a non-element trigger (plain text) falls back to a keyboard-operable role="button" wrapper', () => {
    const items = [{ value: 'a', label: 'Item A' }]
    render(
      <MemoryRouter>
        <Dropdown trigger="Menu" items={items} />
      </MemoryRouter>,
    )
    const trigger = screen.getByRole('button', { name: 'Menu' })
    expect(trigger.tabIndex).toBe(0)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('width="trigger" never renders the invalid literal CSS value "trigger"', () => {
    const items = [{ value: 'a', label: 'Item A' }]
    render(
      <MemoryRouter>
        <Dropdown trigger={<button type="button">Actions</button>} items={items} width="trigger" />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Actions' }))
    // Before the fix, the first-open frame (before the trigger ref is
    // measurable) rendered the literal string 'trigger' as the CSS `width`
    // value — invalid, silently ignored by the browser.
    expect(screen.getByRole('menu').style.width).not.toBe('trigger')
  })
})

describe('Tooltip — hasArrow and programmatic content association', () => {
  it('hasArrow renders a themed pointer only when requested', () => {
    render(
      <Tooltip content="Help text">
        <button type="button">Trigger</button>
      </Tooltip>,
    )
    fireEvent.mouseOver(
      screen.getByRole('button', { name: 'Trigger' }).parentElement as HTMLElement,
    )
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.parentElement?.querySelector('[aria-hidden="true"]')).toBeNull()
    cleanup()

    render(
      <Tooltip content="Help text" hasArrow>
        <button type="button">Trigger</button>
      </Tooltip>,
    )
    fireEvent.mouseOver(
      screen.getByRole('button', { name: 'Trigger' }).parentElement as HTMLElement,
    )
    const tooltipWithArrow = screen.getByRole('tooltip')
    const arrow = tooltipWithArrow.parentElement?.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement
    expect(arrow).toBeTruthy()
    expect(arrow.style.transform).toContain('rotate(45deg)')
  })

  it('CONSUMER PROPERTY: the visible tooltip is programmatically associated with the focused trigger', () => {
    render(
      <Tooltip content="Help text">
        <button type="button">Trigger</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    expect(trigger.getAttribute('aria-describedby')).toBeNull()
    fireEvent.mouseOver(trigger.parentElement as HTMLElement)
    const tooltipId = screen.getByRole('tooltip').id
    expect(tooltipId).toBeTruthy()
    // The child that actually receives focus/hover carries the reference —
    // not the wrapper div, which is never itself the focused element.
    expect(trigger.getAttribute('aria-describedby')).toBe(tooltipId)
    fireEvent.mouseOut(trigger.parentElement as HTMLElement)
    expect(trigger.getAttribute('aria-describedby')).toBeNull()
  })
})

describe('Alert — `live` prop drives assertive vs polite announcement', () => {
  it('defaults to the assertive role="alert" (unchanged default); live={false} announces politely instead', () => {
    const { rerender } = render(<Alert>Static banner</Alert>)
    expect(screen.getByRole('alert')).toBeTruthy()
    rerender(<Alert live={false}>Static banner</Alert>)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('status')).toBeTruthy()
  })
})
