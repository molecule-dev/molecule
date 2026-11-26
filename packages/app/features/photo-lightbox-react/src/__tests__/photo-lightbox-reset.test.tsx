/**
 * `<PhotoLightbox>` index resets: opening the lightbox (or handing it a new
 * `initialIndex`) rewinds to that photo in the SAME commit, so the first frame
 * the user sees is never the previous session's photo.
 *
 * @module
 */

// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import type * as UI from '@molecule/app-ui-react'

beforeEach(() => setIconSet({ 'x-mark': { paths: [] } }))

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
        return token === 'modal' || token === 'position' || token === 'button' ? () => token : token
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

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<typeof UI>()),
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

/**
 * The dialog's photo counter, e.g. "2 / 3".
 *
 * @param container - Render container.
 * @returns The counter text.
 */
function counter(container: HTMLElement): string {
  const dialog = container.querySelector('[role="dialog"]') as HTMLElement
  return dialog.textContent ?? ''
}

/**
 * Dispatches a key down from the mounted dialog.
 * @param root - The owner of the portaled lightbox.
 */
function pressArrowRight(root: HTMLElement): void {
  const dialog = root.querySelector('[role="dialog"]')
  if (!dialog) throw new Error('Expected a lightbox')
  fireEvent.keyDown(dialog, { key: 'ArrowRight' })
}

describe('<PhotoLightbox> index reset', () => {
  it('shows initialIndex on the first open frame', () => {
    const { baseElement, rerender } = render(
      createElement(PhotoLightbox, { photos, open: false, onClose: () => {} }),
    )
    rerender(
      createElement(PhotoLightbox, { photos, open: true, onClose: () => {}, initialIndex: 2 }),
    )
    expect(counter(baseElement)).toContain('3 / 3')
  })

  it('rewinds to initialIndex when reopened after navigating', () => {
    const { baseElement, rerender } = render(
      createElement(PhotoLightbox, { photos, open: true, onClose: () => {}, initialIndex: 0 }),
    )
    expect(counter(baseElement)).toContain('1 / 3')
    pressArrowRight(baseElement)
    pressArrowRight(baseElement)
    expect(counter(baseElement)).toContain('3 / 3')
    rerender(createElement(PhotoLightbox, { photos, open: false, onClose: () => {} }))
    rerender(
      createElement(PhotoLightbox, { photos, open: true, onClose: () => {}, initialIndex: 1 }),
    )
    expect(counter(baseElement)).toContain('2 / 3')
  })

  it('follows a new initialIndex while open', () => {
    const { baseElement, rerender } = render(
      createElement(PhotoLightbox, { photos, open: true, onClose: () => {}, initialIndex: 0 }),
    )
    pressArrowRight(baseElement)
    expect(counter(baseElement)).toContain('2 / 3')
    rerender(
      createElement(PhotoLightbox, { photos, open: true, onClose: () => {}, initialIndex: 2 }),
    )
    expect(counter(baseElement)).toContain('3 / 3')
  })
})
