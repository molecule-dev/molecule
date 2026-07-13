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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { IconData, IconSet } from '@molecule/app-icons'
import { setIconSet } from '@molecule/app-icons'
import type { ClassMapValue, UIClassMap } from '@molecule/app-ui'
import { setClassMap } from '@molecule/app-ui'

import {
  Accordion,
  Button,
  Checkbox,
  Icon,
  Input,
  Modal,
  Progress,
  RadioGroup,
  Switch,
  Table,
  Tabs,
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
    expect(screen.getByRole('alert')).toBeTruthy()

    // Re-render at 1.5s, 3s and 4.5s — inside the 5s default window.
    for (let i = 0; i < 3; i++) {
      act(() => vi.advanceTimersByTime(1500))
      view.rerender(ui())
      expect(screen.getByRole('alert')).toBeTruthy() // still visible mid-flow
    }

    // 4500ms elapsed; the ORIGINAL 5000ms deadline is 500ms away.
    act(() => vi.advanceTimersByTime(500))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(dismissed).toBe(1)
  })

  it('Toast duration={0} is persistent, and manual dismissal is a separate labeled path', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toast title="Sticky" duration={0} onDismiss={onDismiss} />)

    // "0 for persistent" (documented contract): a full minute passes, still shown.
    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(onDismiss).not.toHaveBeenCalled()

    // The close button (i18n defaultValue fallback) dismisses it.
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('alert')).toBeNull()
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
