// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ListItemRow` — a port of
 * `@molecule/app-list-item-row-react/src/__tests__/list-item-row.test.tsx`: the
 * same behavioral assertions, rendered with a real Svelte 5 mount (jsdom) and
 * asserted on the markup the component produces. The disabled row's dimmed
 * opacity is set through the CSSOM, so jsdom serializes it with a space
 * (`opacity: 0.5`) — the same live-DOM spelling a mounted React tree produces.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
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

import ListItemRow from '../ListItemRow.svelte'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmountInstance of mounted.splice(0)) unmountInstance()
  document.body.innerHTML = ''
})

/**
 * Mounts the component into the document, kept mounted until the test ends so
 * real events work, and returns the target element holding the DOM.
 * @param props - The props to render.
 * @returns The target element.
 */
const mountRow = (props: Record<string, unknown>): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(ListItemRow, { target, props })
  flushSync()
  mounted.push(() => unmount(instance))
  return target
}

/** The open button a mounted clickable row produced. */
const openButton = (target: HTMLElement): HTMLButtonElement => {
  const button = target.querySelector<HTMLButtonElement>('button[data-mol-id="list-item-row-open"]')
  expect(button, 'a clickable row renders the open button').not.toBeNull()
  return button as HTMLButtonElement
}

/** Renders a {@link ListItemRow} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => mountRow(props).innerHTML

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
      leading: raw('<span data-leading=""></span>'),
      actions: raw('<span data-actions=""></span>'),
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
    const target = mountRow({ title: 'T', onClick })
    openButton(target).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const target = mountRow({
      title: 'T',
      onClick,
      actions: raw('<span data-actions="">Menu</span>'),
    })
    target
      .querySelector('[data-actions]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const target = mountRow({ title: 'Inbox', onClick: () => {} })
    const button = openButton(target)
    const labelId = button.getAttribute('aria-labelledby')
    expect(labelId, 'the open button names its label').not.toBeNull()
    const label = target.querySelector(`[id="${labelId}"]`)
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
    const target = mountRow({ title: 'T', onClick, disabled: true })
    const button = openButton(target)
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.className).not.toContain('cursorPointer')
    const row = target.firstElementChild as HTMLElement
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
