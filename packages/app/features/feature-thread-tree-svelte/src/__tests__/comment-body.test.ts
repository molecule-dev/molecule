// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ThreadTree`'s comment-body semantics — a port of
 * `@molecule/app-feature-thread-tree-react/src/__tests__/comment-body.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with a real
 * Svelte mount (jsdom).
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so no real
// style bond is needed — the same mock the React suite installs.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy({} as Record<string, unknown>, {
      get: (_target, key) =>
        key === 'cn' ? (...values: unknown[]) => values.filter(Boolean).join(' ') : () => '',
    }),
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import ThreadTree from '../ThreadTree.svelte'
import type { Comment } from '../types.js'

const instances: unknown[] = []

/**
 * A snippet rendering the given markup, as a node-valued body arrives.
 *
 * @param html - The snippet's markup.
 * @returns The snippet.
 */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts a {@link ThreadTree} with the given comments.
 *
 * @param comments - The tree's comments.
 * @returns The element the tree rendered into.
 */
function draw(comments: Comment[]): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(ThreadTree, { target, props: { comments } as never })
  instances.push(instance)
  flushSync()
  return target
}

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
})

describe('plain and rich comment body semantics', () => {
  it.each([
    'A long reply. '.repeat(200),
    'Unicode reply: 你好 🌿\nSecond line with <script>alert(1)</script>',
  ])('renders the complete plain-text body as a paragraph', (body) => {
    const container = draw([{ id: 'reply', author: 'Reader', body }])
    const paragraph = container.querySelector('article > p')
    expect(paragraph, 'plain-text replies must retain paragraph semantics').not.toBeNull()
    expect(paragraph!.textContent).toBe(body)
    expect(container.querySelector('script')).toBeNull()
  })

  it('wraps an unbroken project comment without dropping any text', () => {
    const body = 'trackingcode'.repeat(240)
    const container = draw([{ id: 'project-reply', author: 'Reader', body }])
    const paragraph = container.querySelector<HTMLParagraphElement>('article > p')
    expect(paragraph?.textContent).toBe(body)
    expect(paragraph?.style.overflowWrap).toBe('anywhere')
  })

  it('preserves rich block content without nesting a paragraph around it', () => {
    const container = draw([
      {
        id: 'rich',
        author: 'Reader',
        body: raw('<section><h2>Details</h2><p>A rendered paragraph</p></section>'),
      },
    ])
    expect(container.querySelector('article > div > section > p')?.textContent).toBe(
      'A rendered paragraph',
    )
    expect(container.querySelector('p section')).toBeNull()
  })
})
