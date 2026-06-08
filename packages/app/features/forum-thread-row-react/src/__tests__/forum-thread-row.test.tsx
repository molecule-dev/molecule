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

const { ForumThreadRow } = await import('../ForumThreadRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('ForumThreadRow', () => {
  it('renders the title inside an <h3>', () => {
    const markup = html(createElement(ForumThreadRow, { title: 'How do I X?' }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('How do I X?')
  })

  it('renders the excerpt when present and omits it otherwise', () => {
    expect(html(createElement(ForumThreadRow, { title: 'T', excerpt: 'some body' }))).toContain(
      'some body',
    )
    expect(html(createElement(ForumThreadRow, { title: 'T' }))).not.toContain('<p')
  })

  it('renders the vote score block when voteScore is set and no voteControls', () => {
    const markup = html(createElement(ForumThreadRow, { title: 'T', voteScore: 42 }))
    expect(markup).toContain('42')
    expect(markup).toContain('votes')
  })

  it('renders voteControls in place of the score block when supplied', () => {
    const markup = html(
      createElement(ForumThreadRow, {
        title: 'T',
        voteScore: 42,
        voteControls: createElement('div', { 'data-votes': '' }),
      }),
    )
    expect(markup).toContain('data-votes=""')
    expect(markup).not.toContain('votes</span>')
  })

  it('renders the pinned and locked badges', () => {
    const markup = html(createElement(ForumThreadRow, { title: 'T', pinned: true, locked: true }))
    expect(markup).toContain('aria-label="Pinned"')
    expect(markup).toContain('aria-label="Locked"')
  })

  it('renders author, createdAt, reply and view counts', () => {
    const markup = html(
      createElement(ForumThreadRow, {
        title: 'T',
        author: 'jane',
        createdAt: '2h ago',
        replyCount: 5,
        viewCount: 99,
      }),
    )
    expect(markup).toContain('jane')
    expect(markup).toContain('2h ago')
    expect(markup).toContain('5 replies')
    expect(markup).toContain('99 views')
  })

  it('renders the tags slot', () => {
    const markup = html(
      createElement(ForumThreadRow, {
        title: 'T',
        tags: createElement('span', { 'data-tags': '' }),
      }),
    )
    expect(markup).toContain('data-tags=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = html(createElement(ForumThreadRow, { title: 'T', onClick: () => {} }))
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(ForumThreadRow, { title: 'T', className: 'ftr-cls' }))
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('ftr-cls')
  })
})
