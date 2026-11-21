// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ForumThreadRow` — a port of
 * `@molecule/app-forum-thread-row-react/src/__tests__/forum-thread-row.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
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

import ForumThreadRow from '../ForumThreadRow.svelte'
import type { ForumThreadRowProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of instances.splice(0)) unmount(instance)
  document.body.innerHTML = ''
})

/** Renders a {@link ForumThreadRow} and returns the markup it produced. */
const render = (props: ForumThreadRowProps): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(ForumThreadRow, { target, props }))
  flushSync()
  return target.innerHTML
}

/** Mounts a {@link ForumThreadRow} and returns its target, for event tests. */
const mountEl = (props: ForumThreadRowProps): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(ForumThreadRow, { target, props }))
  flushSync()
  return target
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
    const markup = render({
      title: 'T',
      voteScore: 42,
      voteControls: raw('<div data-votes=""></div>'),
    })
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
    const markup = render({ title: 'T', tags: raw('<span data-tags=""></span>') })
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
    const target = mountEl({ title: 'T', onClick })
    target.querySelector<HTMLElement>('[data-mol-id="forum-thread-row-open"]')!.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const target = mountEl({
      title: 'T',
      onClick,
      voteControls: raw('<div data-votes=""></div>'),
    })
    target.querySelector<HTMLElement>('[data-votes]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const target = mountEl({ title: 'How do I reset my password?', onClick: () => {} })
    const open = target.querySelector('[data-mol-id="forum-thread-row-open"]')!
    const labelledby = open.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const label = document.getElementById(labelledby!)
    expect(label?.tagName.toLowerCase()).toBe('h3')
    expect(label?.textContent).toBe('How do I reset my password?')
  })

  it('without onClick there is no open button', () => {
    const target = mountEl({ title: 'T' })
    expect(target.querySelector('[data-mol-id="forum-thread-row-open"]')).toBeNull()
    expect(target.querySelector('article')!.querySelector('button')).toBeNull()
  })

  it('click elsewhere in the row does not call onClick', () => {
    const onClick = vi.fn()
    const target = mountEl({ title: 'T', onClick })
    target.querySelector('article')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
