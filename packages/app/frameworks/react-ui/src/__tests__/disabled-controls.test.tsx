// @vitest-environment jsdom
/**
 * `BaseProps.disabled` disables the controls a component renders: a disabled Tabs, Accordion or
 * Dropdown takes no input, and a disabled Card never calls `onClick`.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as AppReact from '@molecule/app-react'

vi.mock('react-router', () => ({
  useLocation: () => ({ pathname: '/', search: '' }),
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'cn') {
            return (...classes: unknown[]) =>
              classes
                .flat(Infinity)
                .filter((c) => typeof c === 'string' && c.length > 0)
                .join(' ')
          }
          const token = String(prop)
          return (..._args: unknown[]) => token
        },
      },
    ),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ paths: [{ d: 'M0 0' }], viewBox: '0 0 16 16' }),
}))

vi.mock('@molecule/app-react', async () => ({
  ...(await vi.importActual<typeof AppReact>('@molecule/app-react')),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

const ui = await import('../index.js')

afterEach(cleanup)

describe('disabled controls', () => {
  it('a disabled Tabs disables every tab, and a click or an arrow key changes nothing', () => {
    const onChange = vi.fn()
    const { getAllByRole } = render(
      <ui.Tabs
        disabled
        onChange={onChange}
        items={[
          { value: 'a', label: 'A', content: 'A body' },
          { value: 'b', label: 'B', content: 'B body' },
        ]}
      />,
    )
    const tabs = getAllByRole('tab')
    expect(tabs.every((tab) => tab.hasAttribute('disabled'))).toBe(true)
    fireEvent.click(tabs[1])
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    expect(onChange).not.toHaveBeenCalled()
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('a disabled Accordion disables every header, and a click opens nothing', () => {
    const onChange = vi.fn()
    const { getByRole } = render(
      <ui.Accordion
        disabled
        onChange={onChange}
        items={[{ value: 'a', header: 'A', content: 'Body' }]}
      />,
    )
    const header = getByRole('button', { name: /A/ })
    expect(header.hasAttribute('disabled')).toBe(true)
    fireEvent.click(header)
    expect(onChange).not.toHaveBeenCalled()
    expect(header.getAttribute('aria-expanded')).toBe('false')
  })

  it('a disabled Dropdown disables its trigger and never opens', () => {
    const onOpenChange = vi.fn()
    const { getByRole } = render(
      <ui.Dropdown
        disabled
        onOpenChange={onOpenChange}
        trigger={<button type="button">Options</button>}
        items={[{ value: 'a', label: 'A' }]}
      />,
    )
    const trigger = getByRole('button', { name: 'Options' })
    expect(trigger.hasAttribute('disabled')).toBe(true)
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(document.querySelector('[role="menu"]')).toBeNull()
  })

  it('a disabled Dropdown with a text trigger is announced disabled and leaves the tab order', () => {
    const onOpenChange = vi.fn()
    const { getByRole } = render(
      <ui.Dropdown
        disabled
        onOpenChange={onOpenChange}
        trigger="Options"
        items={[{ value: 'a', label: 'A' }]}
      />,
    )
    const trigger = getByRole('button', { name: 'Options' })
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect(trigger.tabIndex).toBe(-1)
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('a disabled interactive Card is announced disabled and a click or Enter never calls onClick', () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <ui.Card interactive disabled onClick={onClick}>
        Clickable card
      </ui.Card>,
    )
    const card = getByRole('button')
    expect(card.getAttribute('aria-disabled')).toBe('true')
    expect(card.tabIndex).toBe(-1)
    expect(card.hasAttribute('disabled')).toBe(false)
    fireEvent.click(card)
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a disabled plain Card never calls onClick', () => {
    const onClick = vi.fn()
    const { getByTestId } = render(
      <ui.Card testId="plain-card" disabled onClick={onClick}>
        Plain card
      </ui.Card>,
    )
    fireEvent.click(getByTestId('plain-card'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
