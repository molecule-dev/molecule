import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { ThreadTree } from '../ThreadTree.js'

beforeEach(() => {
  setClassMap(
    new Proxy({} as UIClassMap, {
      get: (_target, key) =>
        key === 'cn' ? (...values: unknown[]) => values.filter(Boolean).join(' ') : () => '',
    }),
  )
})
afterEach(cleanup)

describe('plain and rich comment body semantics', () => {
  it.each([
    'A long reply. '.repeat(200),
    'Unicode reply: 你好 🌿\nSecond line with <script>alert(1)</script>',
  ])('renders the complete plain-text body as a paragraph', (body) => {
    const { container } = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ThreadTree comments={[{ id: 'reply', author: 'Reader', body }]} />
      </I18nProvider>,
    )
    const paragraph = container.querySelector('article > p')
    expect(paragraph, 'plain-text replies must retain paragraph semantics').not.toBeNull()
    expect(paragraph!.textContent).toBe(body)
    expect(container.querySelector('script')).toBeNull()
  })

  it('preserves rich block content without nesting a paragraph around it', () => {
    const { container } = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ThreadTree
          comments={[
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
          ]}
        />
      </I18nProvider>,
    )
    expect(container.querySelector('article > div > section > p')?.textContent).toBe(
      'A rendered paragraph',
    )
    expect(container.querySelector('p section')).toBeNull()
  })
})
