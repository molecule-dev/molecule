// @vitest-environment jsdom
/**
 * Unit tests for the Vue `NoteCard` — a port of
 * `@molecule/app-note-card-react/src/__tests__/note-card.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces. Style assertions read jsdom's live-DOM
 * serialization (`background: rgb(…)`), which is what a mounted React tree
 * produces too — React's own suite asserts the static-markup spelling of the
 * same declarations.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { NoteCard } from '../NoteCard.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link NoteCard} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(NoteCard, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('NoteCard', () => {
  it('renders the body text', () => {
    const markup = render({ body: 'Remember the milk' })
    expect(markup).toContain('Remember the milk')
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(render({ body: 'b', title: 'Groceries' })).toContain('Groceries')
    expect(render({ body: 'b' })).not.toContain('<h3')
  })

  it('uses the supplied color as the background, falling back to a default', () => {
    expect(render({ body: 'b', color: '#ffcc00' })).toContain('background: rgb(255, 204, 0)')
    expect(render({ body: 'b' })).toContain('background: rgb(254, 243, 199)')
  })

  it('renders the pinned indicator only when pinned', () => {
    expect(render({ body: 'b', pinned: true })).toContain('aria-label="Pinned"')
    expect(render({ body: 'b' })).not.toContain('aria-label="Pinned"')
  })

  it('renders the footer with modifiedAt and actions when present', () => {
    const markup = render({
      body: 'b',
      modifiedAt: 'edited 2h ago',
      actions: h('button', { 'data-actions': '' }, 'Edit'),
    })
    expect(markup).toContain('<footer')
    expect(markup).toContain('edited 2h ago')
    expect(markup).toContain('data-actions=""')
  })

  it('marks the card clickable only when onClick is supplied and forwards className', () => {
    const clickable = render({ body: 'b', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render({ body: 'b', className: 'nc-cls' })
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('nc-cls')
  })
})
