// @vitest-environment jsdom
/**
 * Unit tests for `ImageGallery` — the port of
 * `@molecule/app-image-gallery-react`'s own suite: the same behavioral
 * assertions, rendered with a real Svelte mount (jsdom) and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* call was applied without a real bond — the
// same mock the React package's own tests use. `grid` resolves `cols` to its
// `grid-cols-N` class, mirroring the Tailwind bond's CVA.
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
        if (prop === 'grid') {
          return (opts?: { cols?: number }) => `grid grid-cols-${opts?.cols ?? 1}`
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import ImageGallery from '../ImageGallery.svelte'
import type { ImageGalleryProps } from '../types.js'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts the gallery and returns the markup it produced.
 *
 * @param props - The gallery props.
 * @returns The host's inner markup.
 */
const render = (props: ImageGalleryProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(ImageGallery, { target: host, props }))
  return host.innerHTML
}

const images = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg', '/f.jpg']

describe('ImageGallery', () => {
  it('renders nothing when there are no images', () => {
    // React renders the empty string; Svelte leaves a position marker comment
    // where the empty branch would be, so it is dropped before comparing.
    expect(render({ images: [] }).replaceAll('<!---->', '')).toBe('')
  })

  it('renders the main image (first by default)', () => {
    const markup = render({ images: ['/only.jpg'] })
    expect(markup).toContain('src="/only.jpg"')
  })

  it('renders thumbnails when there is more than one image', () => {
    const markup = render({ images: images.slice(0, 3) })
    expect(markup.match(/<button/g) ?? []).toHaveLength(3)
  })

  it('marks the selected thumbnail with aria-current', () => {
    const markup = render({ images: images.slice(0, 3) })
    expect(markup.match(/aria-current="true"/g) ?? []).toHaveLength(1)
  })

  it('summarises images beyond maxThumbnails as a "+N" chip', () => {
    const markup = render({ images, maxThumbnails: 4 })
    expect(markup).toContain('+2')
  })

  it('renders every thumbnail when maxThumbnails is greater than 4', () => {
    // The old `cols: maxThumbnails as 4` cast lied about the column count and
    // broke the grid past 4. All six thumbnails must still render as buttons.
    const markup = render({ images, maxThumbnails: 6 })
    expect(markup.match(/<button/g) ?? []).toHaveLength(6)
    expect(markup).toContain('grid-cols-6')
  })

  it('emits a real 4-column grid class for the default maxThumbnails', () => {
    const markup = render({ images: images.slice(0, 4) })
    expect(markup).toContain('grid-cols-4')
  })

  it('clamps an unsupported column count to a real grid class (never grid-cols-8)', () => {
    const many = Array.from({ length: 8 }, (_v, i) => `/img-${i}.jpg`)
    const markup = render({ images: many, maxThumbnails: 8 })
    // 8 is not a ClassMap grid column count → snapped down to the supported 6.
    expect(markup).toContain('grid-cols-6')
    expect(markup).not.toContain('grid-cols-8')
    // All eight thumbnails still render (they wrap onto a second row).
    expect(markup.match(/<button/g) ?? []).toHaveLength(8)
  })

  it('snaps a very large column count to the top supported value (grid-cols-12)', () => {
    const many = Array.from({ length: 20 }, (_v, i) => `/img-${i}.jpg`)
    const markup = render({ images: many, maxThumbnails: 20 })
    expect(markup).toContain('grid-cols-12')
    expect(markup.match(/<button/g) ?? []).toHaveLength(20)
  })

  it('honours a controlled selectedIndex', () => {
    const markup = render({ images: images.slice(0, 3), selectedIndex: 2 })
    // main image becomes the third one
    expect(markup).toContain('src="/c.jpg"')
  })

  it('uses supplied alt text, falling back to "Image N"', () => {
    const markup = render({ images: ['/a.jpg'], alts: ['A scenic photo'] })
    expect(markup).toContain('alt="A scenic photo"')
    const fallback = render({ images: ['/a.jpg'] })
    expect(fallback).toContain('alt="Image 1"')
  })

  it('forwards className', () => {
    const markup = render({ images: ['/a.jpg'], className: 'ig-cls' })
    expect(markup).toContain('ig-cls')
  })
})
