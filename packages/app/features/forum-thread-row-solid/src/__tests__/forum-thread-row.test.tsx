// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ForumThreadRow` — a port of
 * `@molecule/app-forum-thread-row-react/src/__tests__/forum-thread-row.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
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

const { ForumThreadRow } = await import('../ForumThreadRow.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts with Solid's browser renderer and returns the container, for tests
 * that fire events on the rendered DOM.
 */
const mountEl = (view: Parameters<typeof render>[0]): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** Mounts with Solid's browser renderer and returns the markup. */
const mount = (view: Parameters<typeof render>[0]): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  const markup = container.innerHTML
  return markup
}

describe('ForumThreadRow', () => {
  it('renders the title inside an <h3>', () => {
    const markup = mount(() => <ForumThreadRow title="How do I X?" />)
    expect(markup).toContain('<h3')
    expect(markup).toContain('How do I X?')
  })

  it('renders the excerpt when present and omits it otherwise', () => {
    expect(mount(() => <ForumThreadRow title="T" excerpt="some body" />)).toContain('some body')
    expect(mount(() => <ForumThreadRow title="T" />)).not.toContain('<p')
  })

  it('renders the vote score block when voteScore is set and no voteControls', () => {
    const markup = mount(() => <ForumThreadRow title="T" voteScore={42} />)
    expect(markup).toContain('42')
    expect(markup).toContain('votes')
  })

  it('renders voteControls in place of the score block when supplied', () => {
    const markup = mount(() => (
      <ForumThreadRow title="T" voteScore={42} voteControls={<div data-votes="" />} />
    ))
    expect(markup).toContain('data-votes=""')
    expect(markup).not.toContain('votes</span>')
  })

  it('renders the pinned and locked badges', () => {
    const markup = mount(() => <ForumThreadRow title="T" pinned locked />)
    expect(markup).toContain('aria-label="Pinned"')
    expect(markup).toContain('aria-label="Locked"')
  })

  it('renders author, createdAt, reply and view counts', () => {
    const markup = mount(() => (
      <ForumThreadRow title="T" author="jane" createdAt="2h ago" replyCount={5} viewCount={99} />
    ))
    expect(markup).toContain('jane')
    expect(markup).toContain('2h ago')
    expect(markup).toContain('5 replies')
    expect(markup).toContain('99 views')
  })

  it('renders the tags slot', () => {
    const markup = mount(() => <ForumThreadRow title="T" tags={<span data-tags="" />} />)
    expect(markup).toContain('data-tags=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = mount(() => <ForumThreadRow title="T" onClick={() => {}} />)
    expect(clickable).toContain('cursorPointer')
    const plain = mount(() => <ForumThreadRow title="T" className="ftr-cls" />)
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('ftr-cls')
  })

  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const container = mountEl(() => <ForumThreadRow title="T" onClick={onClick} />)
    container.querySelector<HTMLElement>('[data-mol-id="forum-thread-row-open"]')!.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const container = mountEl(() => (
      <ForumThreadRow title="T" onClick={onClick} voteControls={<div data-votes="" />} />
    ))
    container.querySelector<HTMLElement>('[data-votes]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const container = mountEl(() => (
      <ForumThreadRow title="How do I reset my password?" onClick={() => {}} />
    ))
    const open = container.querySelector('[data-mol-id="forum-thread-row-open"]')!
    const labelledby = open.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const label = document.getElementById(labelledby!)
    expect(label?.tagName.toLowerCase()).toBe('h3')
    expect(label?.textContent).toBe('How do I reset my password?')
  })

  it('without onClick there is no open button', () => {
    const container = mountEl(() => <ForumThreadRow title="T" />)
    expect(container.querySelector('[data-mol-id="forum-thread-row-open"]')).toBeNull()
    expect(container.querySelector('article')!.querySelector('button')).toBeNull()
  })

  it('click elsewhere in the row does not call onClick', () => {
    const onClick = vi.fn()
    const container = mountEl(() => <ForumThreadRow title="T" onClick={onClick} />)
    container.querySelector('article')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
