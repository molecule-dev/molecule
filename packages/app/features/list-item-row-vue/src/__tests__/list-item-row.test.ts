// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ListItemRow` — a port of
 * `@molecule/app-list-item-row-react/src/__tests__/list-item-row.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces. The disabled row's dimmed opacity is set
 * through the CSSOM, so jsdom serializes it with a space (`opacity: 0.5`) —
 * the same live-DOM spelling a mounted React tree produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { type App, createApp, defineComponent, h, nextTick } from 'vue'

import { ListItemRow } from '../ListItemRow.js'

const mounted: App[] = []

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

/** The open button a mounted clickable row produced. */
const openButton = (host: HTMLElement): HTMLButtonElement => {
  const button = host.querySelector<HTMLButtonElement>('button[data-mol-id="list-item-row-open"]')
  expect(button, 'a clickable row renders the open button').not.toBeNull()
  return button as HTMLButtonElement
}

/**
 * Mounts the row and keeps it mounted until the test ends, so real events
 * work; returns the host element holding the rendered DOM.
 * @param props - The props to render.
 * @returns The host element.
 */
const mountRow = (props: Record<string, unknown>): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ListItemRow, props) }))
  app.mount(host)
  mounted.push(app)
  return host
}

/** Renders a {@link ListItemRow} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = mountRow(props)
  const markup = host.innerHTML
  return markup
}

/** Waits for the toggle's asynchronous save and Vue's DOM update. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
  await nextTick()
}

describe('ListItemRow', () => {
  it('renders the title', () => {
    const markup = render({ title: 'Inbox' })
    expect(markup).toContain('Inbox')
  })

  it('renders subtitle and metadata when present and omits them otherwise', () => {
    const full = render({ title: 'T', subtitle: 'sub-x', metadata: 'meta-x' })
    expect(full).toContain('sub-x')
    expect(full).toContain('meta-x')
    const bare = render({ title: 'T' })
    expect(bare).not.toContain('sub-x')
    expect(bare).not.toContain('meta-x')
  })

  it('renders the leading and actions slots', () => {
    const markup = render({
      title: 'T',
      leading: h('span', { 'data-leading': '' }),
      actions: h('span', { 'data-actions': '' }),
    })
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('exposes a body button and clickable cursor only when onClick is supplied', () => {
    const clickable = render({ title: 'T', onClick: () => {} })
    expect(clickable).toContain('<button type="button"')
    expect(clickable).toContain('cursorPointer')
    const plain = render({ title: 'T' })
    expect(plain).not.toContain('<button')
    expect(plain).not.toContain('cursorPointer')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = mountRow({ title: 'T', onClick })
    openButton(host).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const host = mountRow({
      title: 'T',
      onClick,
      actions: h('span', { 'data-actions': '' }, 'Menu'),
    })
    host.querySelector('[data-actions]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const host = mountRow({ title: 'Inbox', onClick: () => {} })
    const button = openButton(host)
    const labelId = button.getAttribute('aria-labelledby')
    expect(labelId, 'the open button names its label').not.toBeNull()
    const label = host.querySelector(`[id="${labelId}"]`)
    expect(label?.textContent).toBe('Inbox')
  })

  it('without onClick there is no open button', () => {
    const markup = render({ title: 'T' })
    expect(markup).not.toContain('<button')
    expect(markup).not.toContain('cursorPointer')
    expect(markup).not.toContain('position')
    expect(markup).not.toContain('aria-pressed')
  })

  it('a disabled clickable row renders a disabled open button', () => {
    const onClick = vi.fn()
    const host = mountRow({ title: 'T', onClick, disabled: true })
    const button = openButton(host)
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.className).not.toContain('cursorPointer')
    const row = host.firstElementChild as HTMLElement
    expect(row.hasAttribute('tabindex')).toBe(false)
    expect(row.getAttribute('aria-disabled')).toBe('true')
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('reflects the selected state via aria-current', () => {
    const markup = render({ title: 'T', selected: true })
    expect(markup).toContain('aria-current="true"')
    expect(markup).not.toContain('aria-selected')
    expect(markup).not.toContain('aria-pressed')
    const clickable = render({ title: 'T', selected: true, onClick: () => {} })
    expect(clickable).toContain('aria-current="true"')
    expect(clickable).not.toContain('aria-selected')
    expect(clickable).not.toContain('aria-pressed')
    const unselected = render({ title: 'T', selected: false })
    expect(unselected).not.toContain('aria-current')
  })

  it('reflects the disabled state via aria-disabled and dimmed opacity', () => {
    const markup = render({ title: 'T', disabled: true })
    expect(markup).toContain('aria-disabled="true"')
    expect(markup).toContain('opacity: 0.5')
  })

  it('forwards className', () => {
    const markup = render({ title: 'T', className: 'lir-cls' })
    expect(markup).toContain('lir-cls')
  })
})

it('turns a loaded row toggle into its own button that persists the change', async () => {
  let saved = false
  const open = vi.fn()
  const commit = vi.fn(async (desired: boolean) => (saved = desired))
  const row = () => ({
    title: 'Sprint plan',
    metadata: '4 collaborators',
    onClick: open,
    toggle: {
      value: saved,
      commit,
      activeLabel: 'Unpin',
      inactiveLabel: 'Pin',
    },
  })
  const host = mountRow(row())
  const toggle = host.querySelector<HTMLButtonElement>('button[aria-pressed]')
  expect(toggle?.textContent).toBe('Pin')
  toggle!.click()
  await settle()
  expect(commit).toHaveBeenCalledExactlyOnceWith(true)
  expect(open).not.toHaveBeenCalled()
  expect(toggle?.textContent).toBe('Unpin')
  expect(mountRow(row()).querySelector('button[aria-pressed="true"]')?.textContent).toBe('Unpin')
})

it('counterexample: row metadata is read-only when there is no toggle', () => {
  const host = mountRow({ title: 'Sprint plan', metadata: '4 collaborators' })
  expect(host.textContent).toContain('4 collaborators')
  expect(host.querySelector('button')).toBeNull()
})
