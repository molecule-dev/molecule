// @vitest-environment jsdom
/**
 * The web trees of Tabs and Accordion: tab buttons with a roving tab stop and arrow-key movement,
 * and accordion buttons whose panels stay mounted.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Accordion } from '../index.web.js'
import { Tabs } from '../index.web.js'

vi.mock('react-native', () => import('react-native-web'))

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

beforeAll(() => setClassMap(classMap))
beforeEach(() => setProvider(createSimpleI18nProvider()))
afterEach(cleanup)

describe('Tabs on React Native Web', () => {
  const items = [
    { value: 'a', label: 'Tab 1', content: 'Content 1' },
    { value: 'b', label: 'Tab 2', content: 'Content 2' },
    { value: 'c', label: 'Tab 3', content: 'Content 3' },
  ]

  it('renders a tablist of buttons with the active one selected and alone in the tab order', () => {
    const { container } = render(
      <Tabs items={items} variant="line" size="sm" fitted testId="tabs" />,
    )
    const list = one<HTMLElement>(container, '[data-testid="tabs"] > [role="tablist"]')
    expect(list.className).toBe(
      classMap.cn(classMap.tabsList({ variant: 'line', size: 'sm' }), classMap.tabsFitted),
    )
    const tabs = [...list.querySelectorAll<HTMLButtonElement>('button[role="tab"]')]
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Tab 1', 'Tab 2', 'Tab 3'])
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')
    expect(tabs[0]?.getAttribute('data-state')).toBe('active')
    expect(tabs[0]?.tabIndex).toBe(0)
    expect(tabs[0]?.className).toBe(
      classMap.cn(classMap.tabsTrigger({ variant: 'line', size: 'sm' }), classMap.tabTriggerFitted),
    )
    expect(
      tabs
        .slice(1)
        .map((tab) => [
          tab.getAttribute('aria-selected'),
          tab.getAttribute('data-state'),
          tab.tabIndex,
        ]),
    ).toEqual([
      ['false', 'inactive', -1],
      ['false', 'inactive', -1],
    ])
    const panel = one<HTMLElement>(container, '[role="tabpanel"]')
    expect(panel.textContent).toBe('Content 1')
    expect(panel.className).toBe(classMap.tabsContent({ variant: 'line', size: 'sm' }))
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[0]?.id)
    expect(tabs[0]?.getAttribute('aria-controls')).toBe(panel.id)
  })

  it('selects the tab the user clicks and reports it', () => {
    const onChange = vi.fn()
    const { container } = render(<Tabs items={items} onChange={onChange} />)
    const second = one<HTMLButtonElement>(container, '[role="tablist"] > button:nth-child(2)')
    fireEvent.click(second)
    expect(onChange).toHaveBeenCalledExactlyOnceWith('b')
    expect(second.getAttribute('aria-selected')).toBe('true')
    expect(second.tabIndex).toBe(0)
    expect(one<HTMLElement>(container, '[role="tabpanel"]').textContent).toBe('Content 2')
    expect(one<HTMLElement>(container, '[role="tablist"] > button:nth-child(1)').tabIndex).toBe(-1)
  })

  it('reports a click on a controlled Tabs without moving the selection itself', () => {
    const onChange = vi.fn()
    const { container } = render(<Tabs items={items} value="a" onChange={onChange} />)
    fireEvent.click(one(container, '[role="tablist"] > button:nth-child(3)'))
    expect(onChange).toHaveBeenCalledExactlyOnceWith('c')
    expect(
      one(container, '[role="tablist"] > button:nth-child(1)').getAttribute('aria-selected'),
    ).toBe('true')
    expect(one(container, '[role="tabpanel"]').textContent).toBe('Content 1')
  })

  it('moves focus and the selection with the arrow, Home and End keys, past disabled tabs', () => {
    const disabled = [
      { value: 'a', label: 'Tab 1', content: 'Content 1' },
      { value: 'b', label: 'Tab 2', content: 'Content 2', disabled: true },
      { value: 'c', label: 'Tab 3', content: 'Content 3' },
    ]
    const { container } = render(<Tabs items={disabled} />)
    const tab = (nth: number): HTMLButtonElement =>
      one<HTMLButtonElement>(container, `[role="tablist"] > button:nth-child(${nth})`)
    expect(tab(2).disabled).toBe(true)

    tab(1).focus()
    fireEvent.keyDown(tab(1), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tab(3))
    expect(tab(3).getAttribute('aria-selected')).toBe('true')

    fireEvent.keyDown(tab(3), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tab(1))
    fireEvent.keyDown(tab(1), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(tab(3))
    fireEvent.keyDown(tab(3), { key: 'Home' })
    expect(document.activeElement).toBe(tab(1))
    fireEvent.keyDown(tab(1), { key: 'End' })
    expect(document.activeElement).toBe(tab(3))
    expect(one(container, '[role="tabpanel"]').textContent).toBe('Content 3')
  })
})

describe('Accordion on React Native Web', () => {
  const sections = [
    { value: 'one', header: 'Section 1', content: 'Content 1' },
    { value: 'two', header: 'Section 2', content: 'Content 2' },
  ]

  it('renders a button per item with its chevron, and keeps the closed panel mounted and hidden', () => {
    const { container } = render(<Accordion items={sections} defaultValue="one" testId="list" />)
    const root = one<HTMLElement>(container, '[data-testid="list"]')
    expect(root.className).toBe(classMap.accordionRoot)
    const [open, closed] = root.children
    const openButton = one<HTMLButtonElement>(open, 'button')
    const openPanel = one<HTMLElement>(open, '[role="region"]')
    const closedButton = one<HTMLButtonElement>(closed, 'button')
    const closedPanel = one<HTMLElement>(closed, '[role="region"]')
    expect(open.getAttribute('data-state')).toBe('open')
    expect(openButton.getAttribute('aria-expanded')).toBe('true')
    expect(openButton.getAttribute('aria-controls')).toBe(openPanel.id)
    expect(openPanel.getAttribute('aria-labelledby')).toBe(openButton.id)
    expect(openPanel.style.display).toBe('block')
    expect(closed.getAttribute('data-state')).toBe('closed')
    expect(closedButton.getAttribute('aria-expanded')).toBe('false')
    expect(closedPanel.style.display).toBe('none')
    expect(closedPanel.textContent).toBe('Content 2')
    for (const button of [openButton, closedButton]) {
      expect(button.className).toBe(
        classMap.cn(classMap.accordion({ variant: 'default' }), classMap.accordionTriggerBase),
      )
      expect(button.textContent).toContain(button === openButton ? 'Section 1' : 'Section 2')
      const chevron = one<SVGElement>(button, 'svg')
      expect(chevron.getAttribute('class')).toBe(classMap.accordionChevron)
      expect(chevron.querySelector('path')?.getAttribute('d')).toBe('path of chevron-down')
    }
    expect(one<HTMLElement>(openPanel, ':scope > div').className).toBe(
      classMap.accordionContentInner,
    )
  })

  it('toggles an item from its button and reports the open items', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Accordion items={sections} defaultValue="one" onChange={onChange} />,
    )
    const item = (nth: number): HTMLElement =>
      one<HTMLElement>(container, `:scope > div > div:nth-child(${nth})`)
    const button = one<HTMLButtonElement>(item(1), 'button')
    fireEvent.click(button)
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(one<HTMLElement>(item(1), '[role="region"]').style.display).toBe('none')

    fireEvent.click(one(item(2), 'button'))
    expect(onChange).toHaveBeenLastCalledWith('two')
    expect(item(1).querySelector('[role="region"]')?.style.display).toBe('none')
    expect(item(2).querySelector('[role="region"]')?.style.display).toBe('block')
  })

  it('keeps the last open item when it cannot collapse, and opens several at once when told to', () => {
    const pinned = render(<Accordion items={sections} defaultValue="one" collapsible={false} />)
    fireEvent.click(one(pinned.container, 'button'))
    expect(one<HTMLElement>(pinned.container, 'button').getAttribute('aria-expanded')).toBe('true')

    const many = render(<Accordion items={sections} defaultValue="one" multiple />)
    fireEvent.click(one<HTMLElement>(many.container, ':scope > div > div:nth-child(2) > button'))
    const states = [...many.container.querySelectorAll('button')].map((button) =>
      button.getAttribute('aria-expanded'),
    )
    expect(states).toEqual(['true', 'true'])
  })

  it('leaves a disabled item alone', () => {
    const onChange = vi.fn()
    const sections = [
      { value: 'one', header: 'Section 1', content: 'Content 1', disabled: true },
      { value: 'two', header: 'Section 2', content: 'Content 2' },
    ]
    const { container } = render(<Accordion items={sections} onChange={onChange} />)
    const button = one<HTMLButtonElement>(container, 'button')
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onChange).not.toHaveBeenCalled()
  })
})
