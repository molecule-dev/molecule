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
const mount = (view: () => Parameters<typeof render>[0]): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  const markup = container.innerHTML
  return markup
}

describe('NoteCard', () => {
  it('renders the body text', () => {
    expect(mount(() => <NoteCard body="Remember the milk" />)).toContain('Remember the milk')
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(mount(() => <NoteCard body="b" title="Groceries" />)).toContain('Groceries')
    expect(mount(() => <NoteCard body="b" />)).not.toContain('<h3')
  })

  it('uses the supplied color as the background, falling back to a default', () => {
    expect(mount(() => <NoteCard body="b" color="#ffcc00" />)).toContain(
      'background: rgb(255, 204, 0)',
    )
    expect(mount(() => <NoteCard body="b" />)).toContain('background: rgb(254, 243, 199)')
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
})
