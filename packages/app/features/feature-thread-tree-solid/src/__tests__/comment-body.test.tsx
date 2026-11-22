// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ThreadTree`'s comment-body semantics — a port of
 * `@molecule/app-feature-thread-tree-react/src/__tests__/comment-body.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Solid
 * in jsdom.
 *
 * @module
 */

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

// `t(key, values, opts)` returns the supplied `defaultValue`.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { render } from 'solid-js/web'

import type { Comment } from '../types.js'

const { ThreadTree } = await import('../ThreadTree.jsx')

const disposers: Array<() => void> = []

/**
 * Mounts a {@link ThreadTree} with the given comments.
 *
 * @param comments - The tree's comments.
 * @returns The element the tree rendered into.
 */
function draw(comments: Comment[]): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <ThreadTree comments={comments} />, container))
  return container
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
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
        body: (
          <section>
            <h2>Details</h2>
            <p>A rendered paragraph</p>
          </section>
        ),
      },
    ])
    expect(container.querySelector('article > div > section > p')?.textContent).toBe(
      'A rendered paragraph',
    )
    expect(container.querySelector('p section')).toBeNull()
  })
})
