/**
 * The React `<PhotoLightbox>` renders with the renderer-neutral elements, so it also opens on React
 * Native, where there is no global `document`. This test is React-only: a Vue, Svelte, Solid or
 * Angular port renders in a browser, which always has one.
 *
 * @module
 */

// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

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
  Button: ({
    children,
    'aria-label': ariaLabel,
  }: {
    children?: ReactNode
    'aria-label'?: string
  }) => createElement('button', { 'data-button': '', 'aria-label': ariaLabel }, children),
}))

const { PhotoLightbox } = await import('../PhotoLightbox.js')

const photos = [
  { src: '/1.jpg', alt: 'first' },
  { src: '/2.jpg', alt: 'second' },
  { src: '/3.jpg' },
]

describe('<PhotoLightbox> without a global document', () => {
  it('opens without a global document and still dismisses on a backdrop press', () => {
    const container = document.createElement('div')
    const onClose = vi.fn()

    vi.stubGlobal('document', undefined)
    try {
      render(createElement(PhotoLightbox, { photos, open: true, onClose }), { container })
      const dialog = container.querySelector('[role="dialog"]')
      expect(dialog?.textContent ?? '').toContain('1 / 3')
    } finally {
      vi.unstubAllGlobals()
    }

    const dialog = container.querySelector('[role="dialog"]')
    const backdrop = container.querySelector('[role="presentation"]')
    if (!dialog || !backdrop) throw new Error('Expected a dialog inside a backdrop')
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
