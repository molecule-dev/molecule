// @vitest-environment jsdom
/**
 * Unit tests for the React `NoteCard`: markup assertions through the string
 * renderer, and event assertions (a click on the transparent open button over
 * the card, and on an inner control) through a mounted tree in jsdom — the
 * ports mount the same tree in their own renderers and assert the same
 * behaviors. Keyboard activation is the native button's own; no synthetic
 * key tests exist for it.
 *
 * @module
 */

import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { NoteCardProps } from '../NoteCard.js'

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

const { NoteCard } = await import('../NoteCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

/** Mounted roots, unmounted after each test. */
const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
})

/**
 * Mounts the component into the document (the string renderer cannot fire
 * events) and returns its host element.
 */
const mount = (props: NoteCardProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(createElement(NoteCard, props))
  })
  mounted.push(() => {
    act(() => {
      root.unmount()
    })
    host.remove()
  })
  return host
}

/** The card's transparent open button over the whole row. */
const openButton = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('[data-mol-id="note-card-open"]')!

/**
 * The element inside `host` whose id is the button's `aria-labelledby`
 * target — scoped to the card so concurrently mounted instances' generated
 * ids never collide.
 */
const labelledBy = (host: HTMLElement, button: HTMLButtonElement): Element | undefined =>
  [...host.querySelectorAll('[id]')].find((el) => el.id === button.getAttribute('aria-labelledby'))

describe('NoteCard', () => {
  it('renders the body text', () => {
    const markup = html(createElement(NoteCard, { body: 'Remember the milk' }))
    expect(markup).toContain('Remember the milk')
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(html(createElement(NoteCard, { body: 'b', title: 'Groceries' }))).toContain('Groceries')
    expect(html(createElement(NoteCard, { body: 'b' }))).not.toContain('<h3')
  })

  it('renders the theme tint for known note colours and keeps an unknown colour as data', () => {
    const known = html(createElement(NoteCard, { body: 'b', color: '#dbeafe' }))
    expect(known).toContain('bgTone')
    expect(known).not.toContain('background')
    const unknown = html(createElement(NoteCard, { body: 'b', color: '#ffcc00' }))
    expect(unknown).toContain('background:#ffcc00')
    const plain = html(createElement(NoteCard, { body: 'b' }))
    expect(plain).toContain('bgTone')
    expect(plain).not.toContain('background')
  })

  it('renders the pinned indicator only when pinned', () => {
    expect(html(createElement(NoteCard, { body: 'b', pinned: true }))).toContain(
      'aria-label="Pinned"',
    )
    expect(html(createElement(NoteCard, { body: 'b' }))).not.toContain('aria-label="Pinned"')
  })

  it('renders the footer with modifiedAt and actions when present', () => {
    const markup = html(
      createElement(NoteCard, {
        body: 'b',
        modifiedAt: 'edited 2h ago',
        actions: createElement('button', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('<footer')
    expect(markup).toContain('edited 2h ago')
    expect(markup).toContain('data-actions=""')
  })

  it('marks the card clickable only when onClick is supplied and forwards className', () => {
    const clickable = html(createElement(NoteCard, { body: 'b', onClick: () => {} }))
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(NoteCard, { body: 'b', className: 'nc-cls' }))
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('nc-cls')
  })

  it('without onClick there is no open button', () => {
    const plain = html(createElement(NoteCard, { body: 'b' }))
    expect(plain).not.toContain('<button')
    const clickable = html(createElement(NoteCard, { body: 'b', onClick: () => {} }))
    expect(clickable).toContain('data-mol-id="note-card-open"')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = mount({ body: 'b', onClick })
    openButton(host).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const host = mount({
      body: 'b',
      onClick,
      actions: createElement('button', { 'data-actions': '' }),
    })
    host.querySelector<HTMLButtonElement>('[data-actions]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const titled = mount({ title: 'Groceries', body: 'Milk, eggs', onClick: () => {} })
    const button = openButton(titled)
    expect(labelledBy(titled, button)?.textContent).toBe('Groceries')

    const untitled = mount({ body: 'Remember the milk', onClick: () => {} })
    const fallback = openButton(untitled)
    expect(labelledBy(untitled, fallback)?.textContent).toBe('Remember the milk')
  })
})
