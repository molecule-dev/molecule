// @vitest-environment jsdom
/**
 * The gallery's own English goes through i18n — a port of
 * `@molecule/app-image-gallery-react/src/__tests__/image-gallery-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real Svelte mount
 * (jsdom). The image alt fallback was a template literal
 * (`Image ${index + 1}`), so it rendered plain English in every locale; these
 * tests mock `useTranslation` with a `t` that interpolates the bonded English
 * defaults and marks the result, so a string that bypassed `t()` would show up
 * as plain English.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`) — the same mock the Svelte suite uses. `grid` resolves `cols` to
// its `grid-cols-N` class, mirroring the Tailwind bond's CVA.
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

// Translations the bonded i18n provider would supply: each key renders the
// English default interpolated, wrapped in marker brackets — a string that
// bypassed t() would show up as plain English.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>): string => {
      const defaults: Record<string, string> = {
        'imageGallery.alt.fallback': 'Image {{number}}',
        'imageGallery.overflow.more': '+{{count}}',
      }
      const text = defaults[key] ?? key
      return `«${text.replace(/{{(\w+)}}/g, (_match, name: string) => String(values?.[name]))}»`
    },
  }),
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

describe('ImageGallery i18n', () => {
  it('renders the image alt fallback through t', () => {
    const markup = render({ images: ['/only.jpg'] })
    expect(markup).toContain('alt="«Image 1»"')
    expect(markup).not.toContain('alt="Image 1"')
  })

  it('renders thumbnail aria-labels through t', () => {
    const markup = render({ images: images.slice(0, 3) })
    expect(markup).toContain('aria-label="«Image 1»"')
    expect(markup).toContain('aria-label="«Image 3»"')
    expect(markup).not.toContain('aria-label="Image ')
  })

  it('renders the overflow chip through t', () => {
    const markup = render({ images, maxThumbnails: 4 })
    expect(markup).toContain('«+2»')
    expect(markup).not.toContain('>+2<')
  })

  it('supplied alts override the translated fallback', () => {
    const markup = render({ images: images.slice(0, 2), alts: ['A scenic photo'] })
    expect(markup).toContain('alt="A scenic photo"')
    expect(markup).not.toContain('alt="«Image 1»"')
    // The second image has no alt — its thumbnail falls back through t.
    expect(markup).toContain('aria-label="«Image 2»"')
  })
})
