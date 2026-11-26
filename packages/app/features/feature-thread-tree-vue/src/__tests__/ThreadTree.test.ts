// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ThreadTree` — a port of
 * `@molecule/app-feature-thread-tree-react/src/__tests__/ThreadTree.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Vue in
 * jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

import { createApp, defineComponent, h, nextTick } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ThreadTree } from '../ThreadTree.js'
import type { Comment, ThreadTreeProps } from '../types.js'

const SAMPLE: Comment[] = [
  {
    id: 'c1',
    author: 'alice',
    body: 'top-level',
    score: 12,
    children: [
      {
        id: 'c1-1',
        author: 'bob',
        body: 'first reply',
        score: 4,
        children: [{ id: 'c1-1-1', author: 'carol', body: 'deep reply', score: 1 }],
      },
      {
        id: 'c1-2',
        author: 'dave',
        body: 'sibling',
      },
    ],
  },
  {
    id: 'c2',
    author: 'eve',
    body: 'another top-level',
  },
]

const apps: ReturnType<typeof createApp>[] = []

/**
 * Mounts a {@link ThreadTree} with the given props.
 *
 * @param props - The tree props.
 * @returns The host element the app rendered into.
 */
function render(props: ThreadTreeProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ThreadTree, props) }))
  apps.push(app)
  app.mount(host)
  return host
}

/**
 * The deepest element whose own text is exactly `text`, as React Testing
 * Library's `getByText` matches.
 *
 * @param text - The text to find.
 * @returns The element, or null.
 */
function byText(text: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('*')).find(
      (element) => element.children.length === 0 && element.textContent === text,
    ) ?? null
  )
}

/**
 * Clicks an element and lets Vue flush the update.
 *
 * @param selector - The element's selector.
 */
async function click(selector: string): Promise<void> {
  const element = document.querySelector<HTMLButtonElement>(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  element.click()
  await nextTick()
}

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('<ThreadTree>', () => {
  it('renders all top-level comments and their nested replies by default', () => {
    render({ comments: SAMPLE })
    expect(byText('top-level')).not.toBeNull()
    expect(byText('first reply')).not.toBeNull()
    expect(byText('deep reply')).not.toBeNull()
    expect(byText('sibling')).not.toBeNull()
    expect(byText('another top-level')).not.toBeNull()
  })

  it('respects defaultCollapsedDepth — collapses children at the threshold', () => {
    render({ comments: SAMPLE, defaultCollapsedDepth: 1 })
    // Depth 0 always rendered: body visible + header visible.
    expect(byText('top-level')).not.toBeNull()
    expect(byText('alice')).not.toBeNull()
    // Depth-1 node `c1-1` has children, so it auto-collapses. Its header
    // (author "bob") still renders so the viewer can re-expand it; its body
    // and descendants are hidden.
    expect(byText('bob')).not.toBeNull()
    expect(byText('first reply')).toBeNull()
    // Depth 2 ("deep reply") is hidden under the collapsed depth-1 parent.
    expect(byText('deep reply')).toBeNull()
    // Depth-1 node `c1-2` has no children, so it renders fully.
    expect(byText('sibling')).not.toBeNull()
  })

  it('toggle button collapses and expands a sub-tree', async () => {
    render({ comments: SAMPLE })
    expect(byText('first reply')).not.toBeNull()

    await click('[data-mol-id="thread-tree-toggle-c1"]')

    // After collapsing c1: c1's body + all descendants are gone. c1's header
    // (with the author + score + toggle) stays so the user can identify and
    // re-expand the thread.
    expect(byText('first reply')).toBeNull()
    expect(byText('deep reply')).toBeNull()
    expect(byText('sibling')).toBeNull()
    expect(byText('top-level')).toBeNull()
    // Header still rendered — author is still in the DOM.
    expect(byText('alice')).not.toBeNull()

    await click('[data-mol-id="thread-tree-toggle-c1"]')
    expect(byText('first reply')).not.toBeNull()
    expect(byText('top-level')).not.toBeNull()
  })

  it('fires onCollapse with the new collapsed state', async () => {
    const onCollapse = vi.fn()
    render({ comments: SAMPLE, onCollapse })
    await click('[data-mol-id="thread-tree-toggle-c1"]')
    expect(onCollapse).toHaveBeenCalledWith('c1', true)
    await click('[data-mol-id="thread-tree-toggle-c1"]')
    expect(onCollapse).toHaveBeenLastCalledWith('c1', false)
  })

  it('fires onReply with the comment id when the reply slot is wired', async () => {
    const onReply = vi.fn()
    render({ comments: SAMPLE, onReply })
    await click('[data-mol-id="thread-tree-reply-c1-1"]')
    expect(onReply).toHaveBeenCalledWith('c1-1')
  })

  it('fires onUpvote with the toggled state when the upvote slot is wired', async () => {
    const onUpvote = vi.fn()
    render({ comments: SAMPLE, onUpvote })
    await click('[data-mol-id="thread-tree-upvote-c1"]')
    expect(onUpvote).toHaveBeenCalledWith('c1', true)
  })

  it('renders a depth attribute that increments with nesting', () => {
    render({ comments: SAMPLE })
    const c1 = document.querySelector('[data-mol-id="thread-tree-comment-c1"]')
    const c11 = document.querySelector('[data-mol-id="thread-tree-comment-c1-1"]')
    const c111 = document.querySelector('[data-mol-id="thread-tree-comment-c1-1-1"]')
    expect(c1?.getAttribute('data-thread-depth')).toBe('0')
    expect(c11?.getAttribute('data-thread-depth')).toBe('1')
    expect(c111?.getAttribute('data-thread-depth')).toBe('2')
  })

  it('renders plain nested lists without tree roles', () => {
    render({ comments: SAMPLE })
    const root = document.querySelector('[data-mol-id="thread-tree"]')
    expect(root?.tagName).toBe('UL')
    expect(root?.getAttribute('role')).toBeNull()
    const nested = document.querySelector('[data-mol-id="thread-tree-comment-c1"] > ul')
    expect(nested?.getAttribute('role')).toBeNull()
    // A plain `li` inside a plain `ul` keeps its implicit `listitem` role.
    expect(
      document.querySelector('[data-mol-id="thread-tree-comment-c1"]')?.getAttribute('role'),
    ).toBeNull()
  })

  it('wires each collapse toggle to its replies list with aria-controls', async () => {
    render({ comments: SAMPLE })
    const toggleEl = document.querySelector(
      '[data-mol-id="thread-tree-toggle-c1"]',
    ) as HTMLButtonElement
    const replies = document.querySelector(
      '[data-mol-id="thread-tree-comment-c1"] > ul',
    ) as HTMLUListElement
    // The id is generated (`useId()`), never derived from the comment's data.
    expect(replies.id).not.toBe('c1')
    expect(toggleEl.getAttribute('aria-controls')).toBe(replies.id)
    // A comment without children has no replies list to point at.
    const leafToggle = document.querySelector(
      '[data-mol-id="thread-tree-toggle-c2"]',
    ) as HTMLButtonElement
    expect(leafToggle.getAttribute('aria-controls')).toBeNull()

    // While collapsed the list is not rendered, so `aria-controls` is dropped.
    await click('[data-mol-id="thread-tree-toggle-c1"]')
    expect(toggleEl.getAttribute('aria-controls')).toBeNull()
    expect(document.getElementById(replies.id)).toBeNull()

    await click('[data-mol-id="thread-tree-toggle-c1"]')
    const reopened = document.querySelector(
      '[data-mol-id="thread-tree-comment-c1"] > ul',
    ) as HTMLUListElement
    expect(toggleEl.getAttribute('aria-controls')).toBe(reopened.id)
  })
})
