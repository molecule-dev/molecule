// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ForumThreadRowProps } from '../ForumThreadRow.js'

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

const { ForumThreadRow } = await import('../ForumThreadRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

/** Mounted roots, unmounted after each test. */
const mounted: Array<() => void> = []

afterEach(() => {
  for (const unmount of mounted.splice(0)) unmount()
})

/**
 * Mounts the component into the document (the string renderer cannot fire
 * events) and returns its host element.
 */
const mount = (props: ForumThreadRowProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(createElement(ForumThreadRow, props))
  })
  mounted.push(() => {
    act(() => {
      root.unmount()
    })
    host.remove()
  })
  return host
}

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

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const host = mount({ title: 'T', onClick })
    host.querySelector<HTMLElement>('[data-mol-id="forum-thread-row-open"]')!.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const host = mount({
      title: 'T',
      onClick,
      voteControls: createElement('div', { 'data-votes': '' }),
    })
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
