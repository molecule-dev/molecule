// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

const { ListItemRow } = await import('../ListItemRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

/** One mounted element: its container, and the root that unmounts it. */
interface Mounted {
  /** The container the component rendered into. */
  container: HTMLElement
  /** The React root, unmounted after the test. */
  root: Root
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) act(() => m.root.unmount())
})

/**
 * Mounts the element into the document (real events work) and returns its
 * container, unmounted again after the test.
 * @param el - The element to render.
 * @returns The container holding the rendered DOM.
 */
const mountEl = (el: ReactNode) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(el))
  mounted.push({ container, root })
  return container
}

/** The open button a mounted clickable row produced. */
const openButton = (container: HTMLElement): HTMLButtonElement => {
  const button = container.querySelector<HTMLButtonElement>(
    'button[data-mol-id="list-item-row-open"]',
  )
  expect(button, 'a clickable row renders the open button').not.toBeNull()
  return button as HTMLButtonElement
}

describe('ListItemRow', () => {
  it('renders the title', () => {
    const markup = html(createElement(ListItemRow, { title: 'Inbox' }))
    expect(markup).toContain('Inbox')
  })

  it('renders subtitle and metadata when present and omits them otherwise', () => {
    const full = html(
      createElement(ListItemRow, { title: 'T', subtitle: 'sub-x', metadata: 'meta-x' }),
    )
    expect(full).toContain('sub-x')
    expect(full).toContain('meta-x')
    const bare = html(createElement(ListItemRow, { title: 'T' }))
    expect(bare).not.toContain('sub-x')
    expect(bare).not.toContain('meta-x')
  })

  it('renders the leading and actions slots', () => {
    const markup = html(
      createElement(ListItemRow, {
        title: 'T',
        leading: createElement('span', { 'data-leading': '' }),
        actions: createElement('span', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-actions=""')
  })

  it('exposes a body button and clickable cursor only when onClick is supplied', () => {
    const clickable = html(createElement(ListItemRow, { title: 'T', onClick: () => {} }))
    expect(clickable).toContain('<button type="button"')
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(ListItemRow, { title: 'T' }))
    expect(plain).not.toContain('<button')
    expect(plain).not.toContain('cursorPointer')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const container = mountEl(createElement(ListItemRow, { title: 'T', onClick }))
    act(() => {
      openButton(container).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const container = mountEl(
      createElement(ListItemRow, {
        title: 'T',
        onClick,
        actions: createElement('span', { 'data-actions': '' }, 'Menu'),
      }),
    )
    act(() => {
      container
        .querySelector('[data-actions]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const container = mountEl(createElement(ListItemRow, { title: 'Inbox', onClick: () => {} }))
    const button = openButton(container)
    const labelId = button.getAttribute('aria-labelledby')
    expect(labelId, 'the open button names its label').not.toBeNull()
    const label = container.querySelector(`[id="${labelId}"]`)
    expect(label?.textContent).toBe('Inbox')
  })

  it('without onClick there is no open button', () => {
    const markup = html(createElement(ListItemRow, { title: 'T' }))
    expect(markup).not.toContain('<button')
    expect(markup).not.toContain('cursorPointer')
    expect(markup).not.toContain('position')
    expect(markup).not.toContain('aria-pressed')
  })

  it('a disabled clickable row renders a disabled open button', () => {
    const onClick = vi.fn()
    const container = mountEl(createElement(ListItemRow, { title: 'T', onClick, disabled: true }))
    const button = openButton(container)
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.className).not.toContain('cursorPointer')
    const row = container.firstElementChild as HTMLElement
    expect(row.hasAttribute('tabindex')).toBe(false)
    expect(row.getAttribute('aria-disabled')).toBe('true')
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('reflects the selected state via aria-current', () => {
    const markup = html(createElement(ListItemRow, { title: 'T', selected: true }))
    expect(markup).toContain('aria-current="true"')
    expect(markup).not.toContain('aria-selected')
    expect(markup).not.toContain('aria-pressed')
    const clickable = html(
      createElement(ListItemRow, { title: 'T', selected: true, onClick: () => {} }),
    )
    expect(clickable).toContain('aria-current="true"')
    expect(clickable).not.toContain('aria-selected')
    expect(clickable).not.toContain('aria-pressed')
    const unselected = html(createElement(ListItemRow, { title: 'T', selected: false }))
    expect(unselected).not.toContain('aria-current')
  })

  it('reflects the disabled state via aria-disabled and dimmed opacity', () => {
    const markup = html(createElement(ListItemRow, { title: 'T', disabled: true }))
    expect(markup).toContain('aria-disabled="true"')
    expect(markup).toContain('opacity:0.5')
  })

  it('forwards className', () => {
    const markup = html(createElement(ListItemRow, { title: 'T', className: 'lir-cls' }))
    expect(markup).toContain('lir-cls')
  })
})

it('turns a loaded row toggle into its own button that persists the change', async () => {
  let saved = false
  const open = vi.fn()
  const commit = vi.fn(async (desired: boolean) => (saved = desired))
  const row = () =>
    createElement(ListItemRow, {
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
  const host = mountEl(row())
  const toggle = host.querySelector<HTMLButtonElement>('button[aria-pressed]')
  expect(toggle?.textContent).toBe('Pin')
  await act(async () => toggle!.click())
  expect(commit).toHaveBeenCalledExactlyOnceWith(true)
  expect(open).not.toHaveBeenCalled()
  expect(toggle?.textContent).toBe('Unpin')
  expect(mountEl(row()).querySelector('button[aria-pressed="true"]')?.textContent).toBe('Unpin')
})

it('counterexample: row metadata is read-only when there is no toggle', () => {
  const host = mountEl(
    createElement(ListItemRow, { title: 'Sprint plan', metadata: '4 collaborators' }),
  )
  expect(host.textContent).toContain('4 collaborators')
  expect(host.querySelector('button')).toBeNull()
})
