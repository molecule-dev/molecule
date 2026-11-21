// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ForumThreadRow` — a port of
 * `@molecule/app-forum-thread-row-react/src/__tests__/forum-thread-row.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
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

import { ForumThreadRow } from '../ForumThreadRow.js'

/** Apps still mounted, unmounted after each test. */
const apps: Array<{ unmount: () => void; host: HTMLElement }> = []

afterEach(() => {
  for (const app of apps.splice(0)) {
    app.unmount()
    app.host.remove()
  }
  document.body.innerHTML = ''
})

/** Mounts a {@link ForumThreadRow} and returns its host element. */
const mount = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ForumThreadRow, props, slots) }))
  app.mount(host)
  apps.push({ unmount: () => app.unmount(), host })
  return host
}

/** Renders a {@link ForumThreadRow} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ForumThreadRow, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('ForumThreadRow', () => {
  it('renders the title inside an <h3>', () => {
    const markup = render({ title: 'How do I X?' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('How do I X?')
  })

  it('renders the excerpt when present and omits it otherwise', () => {
    expect(render({ title: 'T', excerpt: 'some body' })).toContain('some body')
    expect(render({ title: 'T' })).not.toContain('<p')
  })

  it('renders the vote score block when voteScore is set and no voteControls', () => {
    const markup = render({ title: 'T', voteScore: 42 })
    expect(markup).toContain('42')
    expect(markup).toContain('votes')
  })

  it('renders voteControls in place of the score block when supplied', () => {
    const markup = render(
      { title: 'T', voteScore: 42 },
      { voteControls: () => [h('div', { 'data-votes': '' })] },
    )
    expect(markup).toContain('data-votes=""')
    expect(markup).not.toContain('votes</span>')
  })

  it('renders the pinned and locked badges', () => {
    const markup = render({ title: 'T', pinned: true, locked: true })
    expect(markup).toContain('aria-label="Pinned"')
    expect(markup).toContain('aria-label="Locked"')
  })

  it('renders author, createdAt, reply and view counts', () => {
    const markup = render({
      title: 'T',
      author: 'jane',
      createdAt: '2h ago',
      replyCount: 5,
      viewCount: 99,
    })
    expect(markup).toContain('jane')
    expect(markup).toContain('2h ago')
    expect(markup).toContain('5 replies')
    expect(markup).toContain('99 views')
  })

  it('renders the tags slot', () => {
    const markup = render({ title: 'T' }, { tags: () => [h('span', { 'data-tags': '' })] })
    expect(markup).toContain('data-tags=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = render({ title: 'T', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render({ title: 'T', className: 'ftr-cls' })
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('ftr-cls')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = mount({ title: 'T', onClick })
    host.querySelector<HTMLElement>('[data-mol-id="forum-thread-row-open"]')!.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const host = mount(
      { title: 'T', onClick },
      { voteControls: () => [h('div', { 'data-votes': '' })] },
    )
    host.querySelector<HTMLElement>('[data-votes]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const host = mount({ title: 'How do I reset my password?', onClick: () => {} })
    const open = host.querySelector('[data-mol-id="forum-thread-row-open"]')!
    const labelledby = open.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const label = document.getElementById(labelledby!)
    expect(label?.tagName.toLowerCase()).toBe('h3')
    expect(label?.textContent).toBe('How do I reset my password?')
  })

  it('without onClick there is no open button', () => {
    const host = mount({ title: 'T' })
    expect(host.querySelector('[data-mol-id="forum-thread-row-open"]')).toBeNull()
    expect(host.querySelector('article')!.querySelector('button')).toBeNull()
  })

  it('click elsewhere in the row does not call onClick', () => {
    const onClick = vi.fn()
    const host = mount({ title: 'T', onClick })
    host.querySelector('article')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
