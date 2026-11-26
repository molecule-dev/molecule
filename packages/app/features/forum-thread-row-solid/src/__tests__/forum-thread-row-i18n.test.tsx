// @vitest-environment jsdom
/**
 * i18n routing for the Solid `ForumThreadRow`'s own text — a port of
 * `@molecule/app-forum-thread-row-react/src/__tests__/forum-thread-row-i18n.test.tsx`:
 * the same test names and assertions, rendered with Solid in jsdom. The
 * binding is mocked with a `t` that marks each key, so anything rendered
 * through it shows up bracketed and plain English shows up bare.
 *
 * @module
 */
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token — the same
// mock the React tests use.
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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { ForumThreadRow } = await import('../ForumThreadRow.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Mounts with Solid's browser renderer and returns the markup. */
const mount = (view: Parameters<typeof render>[0]): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

describe('ForumThreadRow i18n', () => {
  it('takes the pinned marker label through i18n by default', () => {
    const markup = mount(() => <ForumThreadRow title="T" pinned />)
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="«forumThreadRow.aria.pinned»"')
    expect(markup).toContain('title="«forumThreadRow.aria.pinned»"')
    expect(markup).not.toContain('Pinned')
  })

  it('takes the locked marker label through i18n by default', () => {
    const markup = mount(() => <ForumThreadRow title="T" locked />)
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="«forumThreadRow.aria.locked»"')
    expect(markup).toContain('title="«forumThreadRow.aria.locked»"')
    expect(markup).not.toContain('Locked')
  })

  it('takes the votes label through i18n by default', () => {
    const markup = mount(() => <ForumThreadRow title="T" voteScore={42} />)
    expect(markup).toContain('«forumThreadRow.label.votes»')
    expect(markup).not.toContain('votes</span>')
  })

  it('takes the reply count through i18n by default', () => {
    const markup = mount(() => <ForumThreadRow title="T" replyCount={5} />)
    expect(markup).toContain('«forumThreadRow.label.replies»')
    expect(markup).not.toContain('5 replies')
  })

  it('takes the view count through i18n by default', () => {
    const markup = mount(() => <ForumThreadRow title="T" viewCount={99} />)
    expect(markup).toContain('«forumThreadRow.label.views»')
    expect(markup).not.toContain('99 views')
  })
})
