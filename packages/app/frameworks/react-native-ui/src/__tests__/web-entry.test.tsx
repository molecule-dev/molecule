// @vitest-environment jsdom
/**
 * The kit's React Native Web entry (`index.web.js`, the package's `browser` export condition): the
 * same exports as the device entry, where each component the browser has an element for renders that
 * element as the React kit does.
 */
import { cleanup, render } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

// The device trees the entry also exports render React Native's primitives; each stands in as a
// plain element that names its primitive.
vi.mock('react-native-safe-area-context', async () => {
  const { createContext } = await import('react')
  return { SafeAreaInsetsContext: createContext(null) }
})

vi.mock('react-native-svg', () => ({
  Svg: 'svg',
  Path: 'path',
}))

vi.mock('react-native', () => {
  const stub = (tag: string) => {
    const StandIn = ({ children }: { children?: ReactNode }) =>
      createElement('div', { 'data-rn': tag }, children)
    return StandIn
  }
  return {
    View: stub('View'),
    Text: stub('Text'),
    Pressable: stub('Pressable'),
    ScrollView: stub('ScrollView'),
    Image: stub('Image'),
    ActivityIndicator: stub('ActivityIndicator'),
    FlatList: stub('FlatList'),
    TextInput: stub('TextInput'),
    Modal: stub('Modal'),
    Switch: stub('Switch'),
    StyleSheet: { create: (styles: unknown) => styles, flatten: (styles: unknown) => styles },
    Platform: {
      OS: 'web',
      select: (options: Record<string, unknown>) => options.web ?? options.default,
    },
    Animated: { View: stub('Animated.View'), Value: class {}, timing: () => ({ start: () => {} }) },
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
  }
})

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: (name: string) => ({ viewBox: '0 0 16 16', paths: [{ d: `path of ${name}` }] }),
}))

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

const device = await import('../index.js')
const web = await import('../index.web.js')

beforeAll(() => setClassMap(classMap))
beforeEach(() => setProvider(createSimpleI18nProvider()))
afterEach(cleanup)

const data = [
  { id: '1', name: 'Alice', role: 'Engineer' },
  { id: '2', name: 'Bob', role: 'Designer' },
]
const columns = [
  { key: 'name', header: 'Name' },
  { key: 'role', header: 'Role' },
]
const items = [{ value: 'a', label: 'Tab 1', content: 'Content 1' }]
const sections = [{ value: 'one', header: 'Section 1', content: 'Content 1' }]
const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

describe('the React Native Web entry', () => {
  it('exports every name the device entry exports', () => {
    expect(Object.keys(web).sort()).toEqual(Object.keys(device).sort())
  })

  it("renders the browser's own checkbox and radio", () => {
    const checkbox = render(<web.Checkbox label="Accept" checked />)
    const input = one<HTMLInputElement>(checkbox.container, 'label > input[type="checkbox"]')
    expect(input.type).toBe('checkbox')
    expect(input.getAttribute('data-state')).toBe('checked')
    expect(one(checkbox.container, 'label > span').textContent).toBe('Accept')
    checkbox.unmount()

    const group = render(<web.RadioGroup options={options} value="b" />)
    const radios = [...group.container.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    expect(radios.length).toBe(2)
    expect(radios[1]?.checked).toBe(true)
  })

  it('renders the drawn switch with a hidden checkbox for a form', () => {
    const { container } = render(<web.Switch label="Toggle" checked />)
    const button = one<HTMLButtonElement>(container, 'button[role="switch"]')
    expect(button.getAttribute('aria-checked')).toBe('true')
    expect(button.getAttribute('data-state')).toBe('checked')
    expect(one(container, 'button > span[data-state="checked"]').tagName).toBe('SPAN')
    expect(
      one<HTMLInputElement>(container, 'input[type="checkbox"][aria-hidden="true"]').type,
    ).toBe('checkbox')
    expect(one(container, 'label > span').textContent).toBe('Toggle')
  })

  it('renders a table element', () => {
    const { container } = render(<web.Table data={data} columns={columns} />)
    expect(container.querySelectorAll('table > thead > tr > th').length).toBe(2)
    expect(container.querySelectorAll('table > tbody > tr').length).toBe(2)
    expect(one(container, 'tbody tr > td').textContent).toBe('Alice')
  })

  it('renders tab buttons and their panel', () => {
    const { container } = render(<web.Tabs items={items} />)
    expect(
      one(container, '[role="tablist"] > button[role="tab"][aria-selected="true"]').textContent,
    ).toBe('Tab 1')
    expect(one(container, '[role="tabpanel"]').textContent).toBe('Content 1')
  })

  it('renders accordion buttons and their panels', () => {
    const { container } = render(<web.Accordion items={sections} defaultValue="one" />)
    expect(one<HTMLButtonElement>(container, 'button[aria-expanded="true"]').disabled).toBe(false)
    expect(one(container, '[role="region"]').textContent).toBe('Content 1')
  })

  it('renders the notification and the alert with their icons', () => {
    const toast = render(<web.Toast title="Saved" description="It is done." status="success" />)
    expect(one(toast.container, '[role="status"] > span > svg > path').getAttribute('d')).toBe(
      'path of check-circle',
    )
    expect(one(toast.container, '[role="status"]').textContent).toContain('It is done.')
    toast.unmount()

    const alert = render(
      <web.Alert title="Heads up" status="warning">
        Careful
      </web.Alert>,
    )
    expect(one(alert.container, '[role="alert"] > span > svg > path').getAttribute('d')).toBe(
      'path of exclamation-triangle',
    )
    expect(one(alert.container, '[role="alert"] > div > h5').textContent).toBe('Heads up')
    expect(one(alert.container, '[role="alert"] > div > div').textContent).toBe('Careful')
  })

  it('keeps the React Native tree of a component the browser has no element for', () => {
    const { container } = render(<device.Badge>New</device.Badge>)
    expect(one(container, '[data-rn="View"] > [data-rn="Text"]').textContent).toBe('New')
  })
})
