// @vitest-environment jsdom
/**
 * The device trees of the kit's components: each resolves its classes through the ClassMap's native
 * split, so a device lays a label, a tab list and a trigger out in a row and applies a state's
 * classes, and holds its text in a Text with the classes of its container.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement, type CSSProperties, Fragment, type ReactNode } from 'react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { classMap } from '@molecule/app-ui-tailwind'

import { Accordion, Card, Checkbox, RadioGroup, Switch, Table, Tabs, Toast } from '../index.js'

/**
 * A stand-in for the device ClassMap's split, with the two rules the kit's components rely on: a
 * class for a state applies only to an element in that state, and a flex container with no
 * direction class lays its children out in a row.
 */
const device = vi.hoisted(() => {
  const calls: Array<{
    classes: string
    inherited: string
    data: Record<string, string | undefined> | undefined
  }> = []
  /** The classes of a string that do not wait for a state. */
  const plain = (classes: string): string =>
    classes
      .split(/\s+/)
      .filter((cls) => cls && !/^data-\[/.test(cls))
      .join(' ')
  const split = (
    classes: string,
    inherited = '',
    data: Record<string, string | undefined> = {},
  ): Record<string, unknown> => {
    calls.push({ classes, inherited, data })
    const kept = classes
      .split(/\s+/)
      .filter(Boolean)
      .flatMap((cls) => {
        const state = /^data-\[state=([a-z]+)\]:(.+)$/.exec(cls)
        return state ? (data.state === state[1] ? [state[2]] : []) : [cls]
      })
    const container = kept.includes('flex') || kept.includes('inline-flex')
    const row = container && !kept.some((cls) => /^flex-(row|col)/.test(cls)) ? ['flex-row'] : []
    const text = kept.filter((cls) => /^text-(?!center$|left$|right$)|^font-/.test(cls))
    return {
      view: [...kept, ...row].join(' '),
      text: [...inherited.split(/\s+/).filter(Boolean), ...text].join(' '),
      display: container ? 'flex' : kept.includes('block') ? 'block' : null,
      lines: null,
      weight: null,
    }
  }
  return { calls, plain, split }
})

// The ClassMap of a device: the web classes, each divided for a native element by the split above.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({ ...classMap, splitForNative: device.split }),
}))

// React Native's primitives stand in as plain elements that keep their classes, role and press.
vi.mock('react-native-safe-area-context', async () => {
  const { createContext } = await import('react')
  return { SafeAreaInsetsContext: createContext(null) }
})

vi.mock('react-native-svg', () => ({
  Svg: ({ children }: { children?: ReactNode }) => <svg>{children}</svg>,
  Path: ({ d }: { d: string }) => <path d={d} />,
}))

vi.mock('react-native', () => {
  interface HostProps {
    children?: ReactNode
    className?: string
    testID?: string
    role?: string
    accessibilityRole?: string
    accessibilityLabel?: string
    accessibilityState?: Record<string, unknown>
    onPress?: () => void
    disabled?: boolean
    'aria-hidden'?: boolean
    'aria-checked'?: boolean | 'mixed'
    'aria-expanded'?: boolean
    'aria-selected'?: boolean
    'aria-disabled'?: boolean
    style?: CSSProperties
    value?: boolean
    onValueChange?: (value: boolean) => void
  }
  const host = (kind: string) => {
    function Host({
      children,
      className,
      testID,
      role,
      accessibilityRole,
      accessibilityLabel,
      'aria-hidden': hidden,
      'aria-checked': checked,
      'aria-expanded': expanded,
      'aria-selected': selected,
      'aria-disabled': ariaDisabled,
      onPress,
      disabled,
    }: HostProps) {
      return createElement(
        kind === 'text' ? 'span' : 'div',
        {
          className,
          'data-testid': testID,
          role: role ?? accessibilityRole,
          'aria-label': accessibilityLabel,
          'aria-hidden': hidden,
          'aria-checked': checked,
          'aria-expanded': expanded,
          'aria-selected': selected,
          'aria-disabled': ariaDisabled,
          'data-kind': kind,
          onClick: disabled
            ? undefined
            : (event: { stopPropagation(): void }) => {
                if (!onPress) return
                event.stopPropagation()
                onPress()
              },
        },
        children,
      )
    }
    return Host
  }
  return {
    View: host('view'),
    Text: host('text'),
    Pressable: host('pressable'),
    ScrollView: host('scroll'),
    Switch: ({ value, disabled, onValueChange, role, testID }: HostProps) =>
      createElement('input', {
        type: 'checkbox',
        checked: value,
        disabled,
        role,
        'data-testid': testID,
        onChange: (event: { currentTarget: { checked: boolean } }) =>
          onValueChange?.(event.currentTarget.checked),
      }),
    Platform: { OS: 'ios', select: (options: Record<string, unknown>) => options.default },
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (styles: unknown) => styles,
      hairlineWidth: 1,
    },
    useWindowDimensions: () => ({ width: 800, height: 600, scale: 1, fontScale: 1 }),
    AccessibilityInfo: {
      isScreenReaderEnabled: () => Promise.resolve(false),
      announceForAccessibilityWithOptions: vi.fn(),
    },
    findNodeHandle: () => null,
    processColor: (color: unknown) => color,
    I18nManager: { isRTL: false },
    Animated: { View: host('animated-view'), Value: class {}, timing: () => ({ start: () => {} }) },
    FlatList: <Item,>({
      data,
      keyExtractor,
      renderItem,
    }: {
      data: Item[]
      keyExtractor: (item: Item, index: number) => string
      renderItem: (info: { item: Item; index: number }) => ReactNode
    }) => (
      <div data-kind="flat-list">
        {data.slice(0, 10).map((item, index) => (
          <Fragment key={keyExtractor(item, index)}>{renderItem({ item, index })}</Fragment>
        ))}
      </div>
    ),
  }
})

/**
 * The one element a selector matches.
 *
 * @param root - Where to search.
 * @param selector - The selector.
 * @returns The element.
 */
function one<E extends Element>(root: ParentNode, selector: string): E {
  const element = root.querySelector<E>(selector)
  if (!element) throw new Error(`Missing ${selector}`)
  return element
}

/**
 * Asserts that an element carries every class of a ClassMap string that does not wait for a state.
 *
 * @param element - The element.
 * @param classes - The ClassMap's classes for it.
 */
function carries(element: Element | undefined, classes: string): void {
  if (!element) throw new Error(`Missing an element carrying ${classes}`)
  const applied = element.className.split(/\s+/)
  for (const cls of device.plain(classes).split(' ')) expect(applied, cls).toContain(cls)
}

beforeAll(() => setProvider(createSimpleI18nProvider()))
beforeEach(() => {
  device.calls.length = 0
})
afterEach(cleanup)

const data = [
  { id: '1', name: 'Alice', role: 'Engineer' },
  { id: '2', name: 'Bob', role: 'Designer' },
]
const columns = [
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role' },
]

describe('Card on a device', () => {
  it('holds its text in a Text with the classes the card hands its text', () => {
    const { container } = render(<Card testId="card">Hello</Card>)
    const card = one<HTMLElement>(container, '[data-testid="card"]')
    expect(card.getAttribute('data-kind')).toBe('view')
    const text = one<HTMLElement>(card, ':scope > span')
    expect(text.textContent).toBe('Hello')
    expect(text.className).toContain('text-foreground')
    carries(card, classMap.card({ variant: 'elevated' }))
  })

  it('names each visual variant as the ClassMap does', () => {
    const classes = (variant: 'elevated' | 'outlined' | 'filled'): string => {
      const { container, unmount } = render(<Card testId="card" variant={variant} padding="sm" />)
      const className = one<HTMLElement>(container, '[data-testid="card"]').className
      unmount()
      return className
    }
    expect(classes('elevated')).toContain(device.plain(classMap.card({ variant: 'elevated' })))
    expect(classes('outlined')).toContain(device.plain(classMap.card({ variant: 'outline' })))
    expect(classes('filled')).toContain(device.plain(classMap.card({ variant: 'default' })))
    expect(classes('filled')).toContain(classMap.cardPadding('sm'))
  })
})

describe('Checkbox on a device', () => {
  it('lays its label out in a row and gives the box the classes of its state', () => {
    const { container } = render(<Checkbox checked label="Accept" testId="check" />)
    const box = one<HTMLElement>(container, '[data-testid="check"]')
    const label = box.parentElement
    expect(label?.className).toContain('flex-row')
    if (!label) throw new Error('Missing the checkbox label')
    carries(box, classMap.checkbox({ error: false }))
    expect(box.className).toContain('bg-primary')
    expect(box.className).toContain('border-primary')
    expect(one(box, 'svg path').getAttribute('d')).toBe(classMap.checkFieldMark?.('checked').path)
    expect(box.className).toContain('text-white')
    const text = one<HTMLElement>(label, ':scope > span')
    expect(text.textContent).toBe('Accept')
    expect(text.className).toContain(classMap.controlText)
    expect(text.className).not.toContain('text-white')
  })

  it('asks the ClassMap for the classes of an unchecked and a disabled box', () => {
    const { container } = render(<Checkbox label="Accept" testId="check" disabled />)
    const box = one<HTMLElement>(container, '[data-testid="check"]')
    const label = box.parentElement
    if (!label) throw new Error('Missing the checkbox label')
    carries(box, classMap.checkbox({ error: false }))
    expect(box.className).not.toContain('bg-primary')
    expect(box.querySelector('svg')).toBeNull()
    expect(box.getAttribute('aria-disabled')).toBe('true')
    expect(one<HTMLElement>(label, ':scope > span').className).toContain(classMap.controlDisabled)
    expect(device.calls).toContainEqual(
      expect.objectContaining({
        classes: classMap.checkbox({ error: false }),
        data: expect.objectContaining({ state: 'unchecked' }),
      }),
    )
  })
})

describe('RadioGroup on a device', () => {
  const options = [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]

  it('lays each option out in a row, with the selected circle in the state color', () => {
    const onChange = vi.fn()
    const { container } = render(<RadioGroup options={options} value="a" onChange={onChange} />)
    const radios = [...container.querySelectorAll<HTMLElement>('[role="radio"]')]
    expect(radios.map((radio) => radio.getAttribute('aria-checked'))).toEqual(['true', 'false'])
    const [chosen, other] = radios
    carries(chosen, classMap.radio({ error: false }))
    expect(chosen.className).toContain('border-primary')
    expect(other.className).not.toContain('border-primary')
    for (const radio of radios) {
      const label = radio.parentElement
      if (!label) throw new Error('Missing the option label')
      expect(label.className).toContain('flex-row')
      expect(one<HTMLElement>(label, ':scope > span').className).toContain(classMap.controlText)
    }
    const second = radios[1]
    if (!second) throw new Error('Missing the second radio')
    fireEvent.click(second)
    expect(onChange).toHaveBeenCalledExactlyOnceWith('b')
  })
})

describe('Switch on a device', () => {
  it('lays its label out in a row and hands the label its text classes', () => {
    const { container } = render(<Switch label="Sync" testId="switch" />)
    const input = one<HTMLElement>(container, 'input[data-testid="switch"]')
    const row = input.parentElement
    if (!row) throw new Error('Missing the switch label')
    expect(row.className).toContain('flex-row')
    expect(input.getAttribute('role')).toBe('switch')
    const text = one<HTMLElement>(row, ':scope > span')
    expect(text.textContent).toBe('Sync')
    expect(text.className).toContain(classMap.controlText)
  })
})

describe('Tabs on a device', () => {
  const items = [
    { value: 'a', label: 'Tab 1', content: 'Content 1' },
    { value: 'b', label: 'Tab 2', content: 'Content 2' },
  ]

  it('lays its tabs out in a row and gives the active one the classes of its state', () => {
    const { container } = render(<Tabs items={items} variant="enclosed" size="lg" />)
    const list = one<HTMLElement>(container, '[role="tablist"]')
    expect(list.className).toContain('flex-row')
    carries(list, classMap.tabsList({ variant: 'enclosed', size: 'lg' }))
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')]
    expect(tabs[0]?.className).toContain('bg-background')
    expect(tabs[0]?.className).toContain('text-foreground')
    expect(tabs[1]?.className).not.toContain('bg-background')
    for (const tab of tabs) {
      expect(tab.className).toContain('flex-row')
      carries(tab, classMap.tabsTrigger({ variant: 'enclosed', size: 'lg' }))
      const label = one<HTMLElement>(tab, ':scope > span')
      expect(label.className).toContain('text-base')
      expect(label.className).toContain('text-foreground-secondary')
    }
    expect(device.calls).toContainEqual(
      expect.objectContaining({
        classes: classMap.tabsTrigger({ variant: 'enclosed', size: 'lg' }),
        data: { state: 'active' },
      }),
    )
  })

  it('selects the tab that is pressed and shows its panel in a Text', () => {
    const onChange = vi.fn()
    const { container } = render(<Tabs items={items} onChange={onChange} />)
    const tab = container.querySelectorAll<HTMLElement>('[role="tablist"] [role="tab"]')[1]
    if (!tab) throw new Error('Missing the second tab')
    fireEvent.click(tab)
    expect(onChange).toHaveBeenCalledExactlyOnceWith('b')
    const panel = one<HTMLElement>(container, '[role="tabpanel"]')
    expect(one<HTMLElement>(panel, ':scope > span').textContent).toBe('Content 2')
    expect(tab.getAttribute('aria-selected')).toBe('true')
  })

  it('does not select a disabled tab', () => {
    const onChange = vi.fn()
    const disabled = [
      { value: 'a', label: 'Tab 1', content: 'Content 1', disabled: true },
      { value: 'b', label: 'Tab 2', content: 'Content 2' },
    ]
    const { container } = render(<Tabs items={disabled} onChange={onChange} />)
    fireEvent.click(one(container, '[role="tab"]'))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Accordion on a device', () => {
  const sections = [
    { value: 'one', header: 'Section 1', content: 'Content 1' },
    { value: 'two', header: 'Section 2', content: 'Content 2', disabled: true },
  ]

  it('lays each trigger out in a row, its header in a Text and its chevron beside it', () => {
    const { container } = render(<Accordion items={sections} defaultValue="one" />)
    const [trigger] = [...container.querySelectorAll<HTMLElement>('[role="button"]')]
    if (!trigger) throw new Error('Missing the first trigger')
    expect(trigger.className).toContain('flex-row')
    carries(trigger, classMap.accordion({ variant: 'default' }))
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const [header, chevron] = trigger.children
    expect(header?.getAttribute('data-kind')).toBe('text')
    expect(header?.textContent).toBe('Section 1')
    expect(header?.className).toContain('font-medium')
    expect(chevron?.className).toContain(classMap.accordionChevron)
    const panel = one<HTMLElement>(container, '[role="region"]')
    expect(one<HTMLElement>(panel, ':scope > div > span').textContent).toBe('Content 1')
    expect(container.querySelectorAll('[role="region"]').length).toBe(1)
  })

  it('toggles an item from its trigger and leaves a disabled one alone', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Accordion items={sections} defaultValue="one" onChange={onChange} />,
    )
    const triggers = [...container.querySelectorAll<HTMLElement>('[role="button"]')]
    fireEvent.click(triggers[1])
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(triggers[0])
    expect(onChange).toHaveBeenCalledExactlyOnceWith('')
    expect(container.querySelector('[role="region"]')).toBeNull()
  })
})

describe('Toast on a device', () => {
  it('lays its content and its close button out in a row, its text in the status color', () => {
    const { container } = render(<Toast title="Saved" description="It is done." testId="toast" />)
    const toast = one<HTMLElement>(container, '[data-testid="toast"]')
    carries(toast, classMap.toast({ variant: 'info' }))
    expect(toast.className).toContain('flex-row')
    const content = one<HTMLElement>(toast, ':scope > div')
    const [title, description] = content.children
    expect(title?.textContent).toBe('Saved')
    expect(title?.className).toContain(classMap.toastTitle)
    if (!title) throw new Error('Missing the toast title')
    expect(one(title, 'span').className).toContain('text-info')
    expect(description?.textContent).toBe('It is done.')
    expect(description?.className).toContain(classMap.toastDescription)
    expect(one(toast, ':scope > [data-kind="pressable"]').className).toContain(classMap.toastClose)
  })
})

describe('Table on a device', () => {
  it('renders its parts through the kit table elements, with the ClassMap classes', () => {
    const onRowClick = vi.fn()
    const { container } = render(
      <Table
        data={data}
        columns={columns}
        bordered
        striped
        testId="people"
        onRowClick={onRowClick}
      />,
    )
    const table = one<HTMLElement>(container, '[data-testid="people"]')
    expect(table.getAttribute('role')).toBe('table')
    carries(table, classMap.table)
    expect(table.className).toContain(classMap.tableBordered)
    const [head, body] = table.querySelectorAll<HTMLElement>('[role="rowgroup"]')
    carries(head, classMap.tableHeader)
    carries(body, classMap.tableBody)
    const heads = [...head.querySelectorAll<HTMLElement>('[role="columnheader"]')]
    expect(heads.map((cell) => cell.textContent)).toEqual(['Name', 'Role'])
    for (const cell of heads) carries(cell, classMap.tableHead)
    const rows = [...body.querySelectorAll<HTMLElement>('[role="row"]')]
    expect(rows[1]?.className).toContain(classMap.tableRowStriped)
    const cells = [...rows[0].querySelectorAll<HTMLElement>('[role="cell"]')]
    expect(cells.map((cell) => cell.textContent)).toEqual(['Alice', 'Engineer'])
    carries(cells[0], classMap.tableCell)
    fireEvent.click(rows[0])
    expect(onRowClick).toHaveBeenCalledExactlyOnceWith(data[0], 0)
  })

  it('shows the sort glyph on the sorted column and the empty state without rows', () => {
    const sortable = [
      { key: 'name', header: 'Name', sortable: true },
      { key: 'role', header: 'Role' },
    ]
    const { container, rerender } = render(
      <Table data={data} columns={sortable} sort={{ key: 'name', direction: 'desc' }} />,
    )
    const heading = one<HTMLElement>(container, '[role="columnheader"]')
    const glyph = one<HTMLElement>(heading, '[aria-hidden="true"]')
    expect(glyph.textContent).toBe('↓')
    expect(glyph.parentElement?.className).toContain(classMap.tableSortIcon)

    rerender(<Table data={[]} columns={columns} />)
    const empty = one<HTMLElement>(container, '[role="cell"]')
    expect(empty.textContent).toBe('No data available')
    carries(empty, classMap.tableEmptyCell)
  })
  it('passes large tables to FlatList before invoking any cell renderers', () => {
    const rows = Array.from({ length: 1000 }, (_, id) => ({ id }))
    const cell = vi.fn((value: unknown) => String(value))
    const { container } = render(
      <Table data={rows} columns={[{ key: 'id', header: 'ID', render: cell }]} rowKey="id" />,
    )
    expect(cell).toHaveBeenCalledTimes(10)
    const list = one(container, '[data-kind="flat-list"]')
    expect(list.querySelectorAll('[role="row"]')).toHaveLength(10)
    expect(list.textContent).toBe('0123456789')
  })
})
