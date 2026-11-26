/**
 * React warns when a list of elements has no keys. This test is React-only: Vue, Svelte, Solid and
 * Angular key their lists in their own templates and log no such warning.
 *
 * @module
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const { DiffViewer } = await import('../DiffViewer.js')

const before = 'line one\nline two\nline three'
const after = 'line one\nline TWO\nline three'

describe('DiffViewer list keys', () => {
  it('keys the rows of each split column, so React logs no missing-key warning', () => {
    const messages: string[] = []
    const errors = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      messages.push(args.map(String).join(' '))
    })
    try {
      // The spy hears that warning: a list of unkeyed elements logs it.
      const Unkeyed = () =>
        createElement(
          'div',
          null,
          [1, 2].map((i) => createElement('span', null, i)),
        )
      renderToStaticMarkup(createElement(Unkeyed))
      expect(messages.some((message) => message.includes('unique "key" prop'))).toBe(true)
      messages.length = 0
      renderToStaticMarkup(createElement(DiffViewer, { before, after, mode: 'split' }))
      expect(messages.filter((message) => message.includes('unique "key" prop'))).toEqual([])
    } finally {
      errors.mockRestore()
    }
  })
})
