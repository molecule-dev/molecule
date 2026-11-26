// @vitest-environment jsdom
/**
 * Unit tests for `PhotoLightbox`, ported from
 * `@molecule/app-photo-lightbox-react`'s own suite: the same behavioral
 * assertions, rendered with Svelte in jsdom and asserted on the markup the
 * component produces.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'

beforeEach(() => setIconSet({ 'x-mark': { paths: [] } }))

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
        return token === 'modal' || token === 'position' || token === 'button' ? () => token : token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import PhotoLightbox from '../PhotoLightbox.svelte'
import type { PhotoLightboxProps } from '../types.js'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** Renders a {@link PhotoLightbox} and returns the host markup. */
const render = (props: PhotoLightboxProps): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(PhotoLightbox, { target, props }))
  flushSync()
  return (
    target.ownerDocument.querySelector('[role="presentation"]:has(> [role="dialog"])')?.outerHTML ??
    ''
  )
}

const photos = [
  { src: '/1.jpg', alt: 'first', caption: 'Caption one' },
  { src: '/2.jpg', alt: 'second' },
  { src: '/3.jpg' },
]

describe('PhotoLightbox', () => {
  it('renders nothing when closed', () => {
    expect(render({ photos, open: false, onClose: () => {} }).replace('<!---->', '')).toBe('')
  })

  it('renders nothing when there are no photos', () => {
    expect(render({ photos: [], open: true, onClose: () => {} }).replace('<!---->', '')).toBe('')
  })

  it('renders the active photo and a modal dialog when open', () => {
    const markup = render({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('src="/1.jpg"')
  })

  it('respects initialIndex', () => {
    const markup = render({ photos, open: true, onClose: () => {}, initialIndex: 1 })
    expect(markup).toContain('src="/2.jpg"')
  })

  it('renders the caption when the active photo has one', () => {
    const markup = render({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('<figcaption')
    expect(markup).toContain('Caption one')
  })

  it('renders prev/next arrows + a counter for multi-photo galleries', () => {
    const markup = render({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('aria-label="Previous"')
    expect(markup).toContain('aria-label="Next"')
    expect(markup).toContain('1 / 3')
  })

  it('omits the arrows for a single-photo gallery', () => {
    const markup = render({ photos: [photos[0]], open: true, onClose: () => {} })
    expect(markup).not.toContain('aria-label="Previous"')
  })

  it('always renders a close button', () => {
    const markup = render({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('aria-label="Close"')
    expect(markup).toContain('data-mol-id="modal-close"')
  })

  it('wraps the dialog in a presentation backdrop that closes on its own click', () => {
    const markup = render({ photos, open: true, onClose: () => {} })
    expect(markup).toContain('role="presentation"')
    expect(markup.indexOf('role="dialog"')).toBeGreaterThan(markup.indexOf('role="presentation"'))
  })
})
