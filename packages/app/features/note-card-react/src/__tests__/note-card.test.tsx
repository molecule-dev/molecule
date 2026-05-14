import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('NoteCard', () => {
  it('renders the body text', () => {
    const markup = html(createElement(NoteCard, { body: 'Remember the milk' }))
    expect(markup).toContain('Remember the milk')
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(html(createElement(NoteCard, { body: 'b', title: 'Groceries' }))).toContain('Groceries')
    expect(html(createElement(NoteCard, { body: 'b' }))).not.toContain('<h3')
  })

  it('uses the supplied color as the background, falling back to a default', () => {
    expect(html(createElement(NoteCard, { body: 'b', color: '#ffcc00' }))).toContain(
      'background:#ffcc00',
    )
    expect(html(createElement(NoteCard, { body: 'b' }))).toContain('background:#fef3c7')
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
})
