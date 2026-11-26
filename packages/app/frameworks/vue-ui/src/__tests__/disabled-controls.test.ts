// @vitest-environment jsdom
/**
 * `BaseProps.disabled` disables the controls a component renders: a disabled Tabs, Accordion or
 * Dropdown takes no input, and a disabled Card never calls `onClick`.
 *
 * Vue port of `@molecule/app-ui-react/src/__tests__/disabled-controls.test.tsx`: the same props
 * reach the same elements, and a listener the caller passes is Vue's `on<Event>` binding.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { location } = await vi.hoisted(async () => ({
  location: (await import('vue')).shallowRef({ pathname: '/', search: '' }),
}))

vi.mock('@molecule/app-vue', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('@molecule/app-vue')),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
  useLocation: () => location,
}))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ paths: [{ d: 'M0 0' }], viewBox: '0 0 16 16' }),
}))

import { type BoundFunctions, fireEvent, type queries, within } from '@testing-library/dom'
import { type App, createApp, h, type VNodeChild } from 'vue'

const ui = await import('../index.js')

const apps: App[] = []

/**
 * Mounts a render function into a fresh host in the document.
 *
 * @param render - The component render.
 */
function mount(render: () => VNodeChild): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render })
  apps.push(app)
  app.mount(host)
}

const page = (): BoundFunctions<typeof queries> => within(document.body)

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
  location.value = { pathname: '/', search: '' }
})

describe('disabled controls', () => {
  it('a disabled Tabs disables every tab, and a click or an arrow key changes nothing', () => {
    const onChange = vi.fn()
    mount(() =>
      h(ui.Tabs, {
        disabled: true,
        onChange,
        items: [
          { value: 'a', label: 'A', content: 'A body' },
          { value: 'b', label: 'B', content: 'B body' },
        ],
      }),
    )
    const tabs = page().getAllByRole('tab')
    expect(tabs.every((tab) => tab.hasAttribute('disabled'))).toBe(true)
    fireEvent.click(tabs[1])
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    expect(onChange).not.toHaveBeenCalled()
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
  })

  it('a disabled Accordion disables every header, and a click opens nothing', () => {
    const onChange = vi.fn()
    mount(() =>
      h(ui.Accordion, {
        disabled: true,
        onChange,
        items: [{ value: 'a', header: 'A', content: 'Body' }],
      }),
    )
    const header = page().getByRole('button', { name: /A/ })
    expect(header.hasAttribute('disabled')).toBe(true)
    fireEvent.click(header)
    expect(onChange).not.toHaveBeenCalled()
    expect(header.getAttribute('aria-expanded')).toBe('false')
  })

  it('a disabled Dropdown disables its trigger and never opens', () => {
    const onOpenChange = vi.fn()
    mount(() =>
      h(ui.Dropdown, {
        disabled: true,
        onOpenChange,
        trigger: h('button', { type: 'button' }, 'Options'),
        items: [{ value: 'a', label: 'A' }],
      }),
    )
    const trigger = page().getByRole('button', { name: 'Options' })
    expect(trigger.hasAttribute('disabled')).toBe(true)
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(document.querySelector('[role="menu"]')).toBeNull()
  })

  it('a disabled Dropdown with a text trigger is announced disabled and leaves the tab order', () => {
    const onOpenChange = vi.fn()
    mount(() =>
      h(ui.Dropdown, {
        disabled: true,
        onOpenChange,
        trigger: 'Options',
        items: [{ value: 'a', label: 'A' }],
      }),
    )
    const trigger = page().getByRole('button', { name: 'Options' })
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    expect(trigger.tabIndex).toBe(-1)
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('a disabled interactive Card is announced disabled and a click or Enter never calls onClick', () => {
    const onClick = vi.fn()
    mount(() => h(ui.Card, { interactive: true, disabled: true, onClick }, () => 'Clickable card'))
    const card = page().getByRole('button')
    expect(card.getAttribute('aria-disabled')).toBe('true')
    expect(card.tabIndex).toBe(-1)
    expect(card.hasAttribute('disabled')).toBe(false)
    fireEvent.click(card)
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('a disabled plain Card never calls onClick', () => {
    const onClick = vi.fn()
    mount(() => h(ui.Card, { testId: 'plain-card', disabled: true, onClick }, () => 'Plain card'))
    fireEvent.click(page().getByTestId('plain-card'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
