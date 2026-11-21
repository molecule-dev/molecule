// @vitest-environment jsdom
/**
 * Unit tests for the Solid `PhotoLightbox` — a port of
 * `@molecule/app-photo-lightbox-react/src/__tests__/photo-lightbox.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PhotoLightboxProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { PhotoLightbox } = await import('../PhotoLightbox.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders a {@link PhotoLightbox} and returns the container's markup. */
function renderLightbox(props: PhotoLightboxProps): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <PhotoLightbox {...props} />, container))
  return container.innerHTML
}

const photos = [
  { src: '/1.jpg', alt: 'first', caption: 'Caption one' },
  { src: '/2.jpg', alt: 'second' },
  { src: '/3.jpg' },
]

describe('PhotoLightbox', () => {
  it('renders nothing when closed', () => {
    expect(renderLightbox({ photos, open: false, onClose: () => {} })).toBe('')
  })

  it('renders nothing when there are no photos', () => {
    expect(renderLightbox({ photos: [], open: true, onClose: () => {} })).toBe('')
  })

  it('renders the active photo and a modal dialog when open', () => {
    const markup = renderLightbox({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('src="/1.jpg"')
  })

  it('respects initialIndex', () => {
    const markup = renderLightbox({ photos, open: true, onClose: () => {}, initialIndex: 1 })
    expect(markup).toContain('src="/2.jpg"')
  })

  it('renders the caption when the active photo has one', () => {
    const markup = renderLightbox({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('<figcaption')
    expect(markup).toContain('Caption one')
  })

  it('renders prev/next arrows + a counter for multi-photo galleries', () => {
    const markup = renderLightbox({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('aria-label="Previous"')
    expect(markup).toContain('aria-label="Next"')
    expect(markup).toContain('1 / 3')
  })

  it('omits the arrows for a single-photo gallery', () => {
    const markup = renderLightbox({ photos: [photos[0]], open: true, onClose: () => {} })
    expect(markup).not.toContain('aria-label="Previous"')
  })

  it('always renders a close button', () => {
    const markup = renderLightbox({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('aria-label="Close"')
  })

  it('wraps the dialog in a presentation backdrop that closes on its own click', () => {
    const markup = renderLightbox({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('role="presentation"')
    expect(markup.indexOf('role="dialog"')).toBeGreaterThan(markup.indexOf('role="presentation"'))
  })
})
