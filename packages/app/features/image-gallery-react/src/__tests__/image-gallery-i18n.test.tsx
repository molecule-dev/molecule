// @vitest-environment jsdom
/**
 * The gallery's own English goes through i18n.
 *
 * The image alt fallback was a template literal (`Image ${index + 1}`), so it
 * rendered plain English in every locale — the pseudo-locale check saw it in
 * the recorded goldens, and no lint rule sees a fallback expression. These
 * tests mock `useTranslation` with a `t` that interpolates the bonded English
 * defaults and marks the result, so a string that bypassed `t()` would show up
 * as plain English.
 *
 * @module
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ImageGalleryProps } from '../ImageGallery.js'

// A Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React suite uses. `grid` resolves `cols` to its
// `grid-cols-N` class, mirroring the Tailwind bond's CVA.
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
vi.mock('@molecule/app-react', () => ({
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

const { ImageGallery } = await import('../ImageGallery.js')

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
})

/**
 * Mounts the gallery in jsdom and returns the markup it produced.
 *
 * @param props - The gallery props.
 * @returns The host's inner markup.
 */
async function render(props: ImageGalleryProps): Promise<string> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(ImageGallery, props))
  })
  return host.innerHTML
}

const images = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg', '/f.jpg']

describe('ImageGallery i18n', () => {
  it('renders the image alt fallback through t', async () => {
    const markup = await render({ images: ['/only.jpg'] })
    expect(markup).toContain('alt="«Image 1»"')
    expect(markup).not.toContain('alt="Image 1"')
  })

  it('renders thumbnail aria-labels through t', async () => {
    const markup = await render({ images: images.slice(0, 3) })
    expect(markup).toContain('aria-label="«Image 1»"')
    expect(markup).toContain('aria-label="«Image 3»"')
    expect(markup).not.toContain('aria-label="Image ')
  })

  it('renders the overflow chip through t', async () => {
    const markup = await render({ images, maxThumbnails: 4 })
    expect(markup).toContain('«+2»')
    expect(markup).not.toContain('>+2<')
  })

  it('supplied alts override the translated fallback', async () => {
    const markup = await render({ images: images.slice(0, 2), alts: ['A scenic photo'] })
    expect(markup).toContain('alt="A scenic photo"')
    expect(markup).not.toContain('alt="«Image 1»"')
    // The second image has no alt — its thumbnail falls back through t.
    expect(markup).toContain('aria-label="«Image 2»"')
  })
})
