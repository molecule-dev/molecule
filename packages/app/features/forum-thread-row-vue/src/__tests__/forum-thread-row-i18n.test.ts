// @vitest-environment jsdom
/**
 * i18n routing for the Vue `ForumThreadRow`'s own text — a port of
 * `@molecule/app-forum-thread-row-react/src/__tests__/forum-thread-row-i18n.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom. The binding
 * is mocked with a `t` that marks each key, so anything rendered through it
 * shows up bracketed and plain English shows up bare.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React tests use.
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
vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import { createApp, defineComponent, h } from 'vue'

import { ForumThreadRow } from '../ForumThreadRow.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link ForumThreadRow} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ForumThreadRow, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  return markup
}

describe('ForumThreadRow i18n', () => {
  it('takes the pinned marker label through i18n by default', () => {
    const markup = render({ title: 'T', pinned: true })
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="«forumThreadRow.aria.pinned»"')
    expect(markup).toContain('title="«forumThreadRow.aria.pinned»"')
    expect(markup).not.toContain('Pinned')
  })

  it('takes the locked marker label through i18n by default', () => {
    const markup = render({ title: 'T', locked: true })
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="«forumThreadRow.aria.locked»"')
    expect(markup).toContain('title="«forumThreadRow.aria.locked»"')
    expect(markup).not.toContain('Locked')
  })

  it('takes the votes label through i18n by default', () => {
    const markup = render({ title: 'T', voteScore: 42 })
    expect(markup).toContain('«forumThreadRow.label.votes»')
    expect(markup).not.toContain('votes</span>')
  })

  it('takes the reply count through i18n by default', () => {
    const markup = render({ title: 'T', replyCount: 5 })
    expect(markup).toContain('«forumThreadRow.label.replies»')
    expect(markup).not.toContain('5 replies')
  })

  it('takes the view count through i18n by default', () => {
    const markup = render({ title: 'T', viewCount: 99 })
    expect(markup).toContain('«forumThreadRow.label.views»')
    expect(markup).not.toContain('99 views')
  })
})
