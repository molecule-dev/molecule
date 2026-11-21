// @vitest-environment jsdom
/**
 * Unit tests for the Solid `NoteCard` — a port of
 * `@molecule/app-note-card-react/src/__tests__/note-card.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces. Style assertions read jsdom's live-DOM
 * serialization (`background: rgb(…)`), which is what a mounted React tree
 * produces too — React's own suite asserts the static-markup spelling of the
 * same declarations.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without
// a real bond — the same mock the React tests use.
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

const { NoteCard } = await import('../NoteCard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and return the markup. */
const mount = (view: Parameters<typeof render>[0]): string => mountEl(view).innerHTML

/** Render with Solid's browser renderer and return the host container. */
const mountEl = (view: Parameters<typeof render>[0]): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
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
    expect(mount(() => <NoteCard body="Remember the milk" />)).toContain('Remember the milk')
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(mount(() => <NoteCard body="b" title="Groceries" />)).toContain('Groceries')
    expect(mount(() => <NoteCard body="b" />)).not.toContain('<h3')
  })

  it('renders the theme tint for known note colours and keeps an unknown colour as data', () => {
    const known = mount(() => <NoteCard body="b" color="#dbeafe" />)
    expect(known).toContain('bgTone')
    expect(known).not.toContain('background')
    const unknown = mount(() => <NoteCard body="b" color="#ffcc00" />)
    expect(unknown).toContain('background: rgb(255, 204, 0)')
    const plain = mount(() => <NoteCard body="b" />)
    expect(plain).toContain('bgTone')
    expect(plain).not.toContain('background')
  })

  it('renders the pinned indicator only when pinned', () => {
    expect(mount(() => <NoteCard body="b" pinned />)).toContain('aria-label="Pinned"')
    expect(mount(() => <NoteCard body="b" />)).not.toContain('aria-label="Pinned"')
  })

  it('renders the footer with modifiedAt and actions when present', () => {
    const markup = mount(() => (
      <NoteCard body="b" modifiedAt="edited 2h ago" actions={<button data-actions="" />} />
    ))
    expect(markup).toContain('<footer')
    expect(markup).toContain('edited 2h ago')
    expect(markup).toContain('data-actions=""')
  })

  it('marks the card clickable only when onClick is supplied and forwards className', () => {
    const clickable = mount(() => <NoteCard body="b" onClick={() => {}} />)
    expect(clickable).toContain('cursorPointer')
    const plain = mount(() => <NoteCard body="b" className="nc-cls" />)
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('nc-cls')
  })

  it('without onClick there is no open button', () => {
    const plain = mount(() => <NoteCard body="b" />)
    expect(plain).not.toContain('<button')
    const clickable = mount(() => <NoteCard body="b" onClick={() => {}} />)
    expect(clickable).toContain('data-mol-id="note-card-open"')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = mountEl(() => <NoteCard body="b" onClick={onClick} />)
    openButton(host).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const host = mountEl(() => (
      <NoteCard body="b" onClick={onClick} actions={<button data-actions="" />} />
    ))
    host.querySelector<HTMLButtonElement>('[data-actions]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const titled = mountEl(() => (
      <NoteCard title="Groceries" body="Milk, eggs" onClick={() => {}} />
    ))
    const button = openButton(titled)
    expect(labelledBy(titled, button)?.textContent).toBe('Groceries')

    const untitled = mountEl(() => <NoteCard body="Remember the milk" onClick={() => {}} />)
    const fallback = openButton(untitled)
    expect(labelledBy(untitled, fallback)?.textContent).toBe('Remember the milk')
  })
})
