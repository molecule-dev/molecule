// @vitest-environment jsdom
/**
 * i18n routing for `ForumThreadRow`'s own text: the pin/lock marker labels
 * (the `aria-label` + `title` of the `role="img"` markers), the "votes" label
 * and the reply/view counters must render through `t()` with their keys — a
 * default the component wrote as plain English would skip every locale. The
 * framework binding is mocked with a `t` that marks each key, so anything
 * rendered through it shows up bracketed and plain English shows up bare (the
 * same mock `image-gallery-editor-react`'s tests use).
 *
 * @module
 */
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
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { ForumThreadRow } = await import('../ForumThreadRow.js')

/** Renders a {@link ForumThreadRow} to static markup. */
const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('ForumThreadRow i18n', () => {
  it('takes the pinned marker label through i18n by default', () => {
    const markup = html(createElement(ForumThreadRow, { title: 'T', pinned: true }))
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="«forumThreadRow.aria.pinned»"')
    expect(markup).toContain('title="«forumThreadRow.aria.pinned»"')
    expect(markup).not.toContain('Pinned')
  })

  it('takes the locked marker label through i18n by default', () => {
    const markup = html(createElement(ForumThreadRow, { title: 'T', locked: true }))
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="«forumThreadRow.aria.locked»"')
    expect(markup).toContain('title="«forumThreadRow.aria.locked»"')
    expect(markup).not.toContain('Locked')
  })

  it('takes the votes label through i18n by default', () => {
    const markup = html(createElement(ForumThreadRow, { title: 'T', voteScore: 42 }))
    expect(markup).toContain('«forumThreadRow.label.votes»')
    expect(markup).not.toContain('votes</span>')
  })

  it('takes the reply count through i18n by default', () => {
    const markup = html(createElement(ForumThreadRow, { title: 'T', replyCount: 5 }))
    expect(markup).toContain('«forumThreadRow.label.replies»')
    expect(markup).not.toContain('5 replies')
  })

  it('takes the view count through i18n by default', () => {
    const markup = html(createElement(ForumThreadRow, { title: 'T', viewCount: 99 }))
    expect(markup).toContain('«forumThreadRow.label.views»')
    expect(markup).not.toContain('99 views')
  })
})
