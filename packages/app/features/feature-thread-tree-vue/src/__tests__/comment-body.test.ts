// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ThreadTree`'s comment-body semantics — a port of
 * `@molecule/app-feature-thread-tree-react/src/__tests__/comment-body.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Vue in
 * jsdom.
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ThreadTree } from '../ThreadTree.js'
import type { Comment } from '../types.js'

const apps: ReturnType<typeof createApp>[] = []

/**
 * Mounts a {@link ThreadTree} with the given comments.
 *
 * @param comments - The tree's comments.
 * @returns The element the app rendered into.
 */
function render(comments: Comment[]): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ThreadTree, { comments }) }))
  apps.push(app)
  app.mount(host)
  return host
}

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

describe('plain and rich comment body semantics', () => {
  it.each([
    'A long reply. '.repeat(200),
    'Unicode reply: 你好 🌿\nSecond line with <script>alert(1)</script>',
  ])('renders the complete plain-text body as a paragraph', (body) => {
    const container = render([{ id: 'reply', author: 'Reader', body }])
    const paragraph = container.querySelector('article > p')
    expect(paragraph, 'plain-text replies must retain paragraph semantics').not.toBeNull()
    expect(paragraph!.textContent).toBe(body)
    expect(container.querySelector('script')).toBeNull()
  })

  it('preserves rich block content without nesting a paragraph around it', () => {
    const rich = h('section', null, [
      h('h2', null, 'Details'),
      h('p', null, 'A rendered paragraph'),
    ])
    const container = render([{ id: 'rich', author: 'Reader', body: rich as VNodeChild }])
    expect(container.querySelector('article > div > section > p')?.textContent).toBe(
      'A rendered paragraph',
    )
    expect(container.querySelector('p section')).toBeNull()
  })
})
