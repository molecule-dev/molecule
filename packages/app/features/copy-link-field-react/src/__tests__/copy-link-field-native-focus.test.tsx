// @vitest-environment jsdom
/**
 * The React `CopyLinkField` renders with the renderer-neutral elements, so its focus handler also
 * runs on React Native, where a focus event carries no selectable web field. These tests are
 * React-only: a Vue, Svelte, Solid or Angular port renders a DOM input, whose focus event always
 * has one.
 *
 * @module
 */
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import * as elements from '@molecule/app-ui-react/elements'

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

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) =>
    createElement('button', { 'data-button': '', type: 'button', onClick }, children),
}))

vi.mock('@molecule/app-ui-react/elements', async (importOriginal) => {
  const actual = await importOriginal<typeof elements>()
  return { ...actual, TextField: vi.fn(actual.TextField) }
})

vi.mock('@molecule/app-clipboard', () => ({
  copyTextWithFallback: vi.fn(async () => true),
}))

const { CopyLinkField } = await import('../CopyLinkField.js')

describe('CopyLinkField on a renderer without a web field', () => {
  it('handles a renderer focus event without a selectable target', () => {
    vi.mocked(elements.TextField).mockClear()
    renderToStaticMarkup(createElement(CopyLinkField, { value: 'u' }))
    const onFocus = vi.mocked(elements.TextField).mock.lastCall?.[0].onFocus
    if (!onFocus) throw new Error('Expected a TextField focus handler')

    expect(() =>
      onFocus({
        target: null,
        currentTarget: null,
        relatedTarget: null,
        defaultPrevented: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      }),
    ).not.toThrow()
  })
})
