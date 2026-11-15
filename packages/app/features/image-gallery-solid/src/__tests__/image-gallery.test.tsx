// @vitest-environment jsdom
/**
 * Unit tests for `ImageGallery` — the port of
 * `@molecule/app-image-gallery-react`'s own suite: the same behavioral
 * assertions, rendered with Solid in jsdom and asserted on the markup the
 * component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* call was applied without a real bond — the
// same mock the React package's own tests use. `grid` resolves `cols` to its
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

const { ImageGallery } = await import('../ImageGallery.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const images = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg', '/f.jpg']

describe('ImageGallery', () => {
  it('renders nothing when there are no images', () => {
    expect(mount(() => <ImageGallery images={[]} />).innerHTML).toBe('')
  })

  it('renders the main image (first by default)', () => {
    const markup = mount(() => <ImageGallery images={['/only.jpg']} />).innerHTML
    expect(markup).toContain('src="/only.jpg"')
  })

  it('renders thumbnails when there is more than one image', () => {
    const markup = mount(() => <ImageGallery images={images.slice(0, 3)} />).innerHTML
    expect(markup.match(/<button/g) ?? []).toHaveLength(3)
  })

  it('marks the selected thumbnail with aria-current', () => {
    const markup = mount(() => <ImageGallery images={images.slice(0, 3)} />).innerHTML
    expect(markup.match(/aria-current="true"/g) ?? []).toHaveLength(1)
  })

  it('summarises images beyond maxThumbnails as a "+N" chip', () => {
    const markup = mount(() => <ImageGallery images={images} maxThumbnails={4} />).innerHTML
    expect(markup).toContain('+2')
  })

  it('renders every thumbnail when maxThumbnails is greater than 4', () => {
    // The old `cols: maxThumbnails as 4` cast lied about the column count and
    // broke the grid past 4. All six thumbnails must still render as buttons.
    const markup = mount(() => <ImageGallery images={images} maxThumbnails={6} />).innerHTML
    expect(markup.match(/<button/g) ?? []).toHaveLength(6)
    expect(markup).toContain('grid-cols-6')
  })

  it('emits a real 4-column grid class for the default maxThumbnails', () => {
    const markup = mount(() => <ImageGallery images={images.slice(0, 4)} />).innerHTML
    expect(markup).toContain('grid-cols-4')
  })

  it('clamps an unsupported column count to a real grid class (never grid-cols-8)', () => {
    const many = Array.from({ length: 8 }, (_v, i) => `/img-${i}.jpg`)
    const markup = mount(() => <ImageGallery images={many} maxThumbnails={8} />).innerHTML
    // 8 is not a ClassMap grid column count → snapped down to the supported 6.
    expect(markup).toContain('grid-cols-6')
    expect(markup).not.toContain('grid-cols-8')
    // All eight thumbnails still render (they wrap onto a second row).
    expect(markup.match(/<button/g) ?? []).toHaveLength(8)
  })

  it('snaps a very large column count to the top supported value (grid-cols-12)', () => {
    const many = Array.from({ length: 20 }, (_v, i) => `/img-${i}.jpg`)
    const markup = mount(() => <ImageGallery images={many} maxThumbnails={20} />).innerHTML
    expect(markup).toContain('grid-cols-12')
    expect(markup.match(/<button/g) ?? []).toHaveLength(20)
  })

  it('honours a controlled selectedIndex', () => {
    const markup = mount(() => (
      <ImageGallery images={images.slice(0, 3)} selectedIndex={2} />
    )).innerHTML
    // main image becomes the third one
    expect(markup).toContain('src="/c.jpg"')
  })

  it('uses supplied alt text, falling back to "Image N"', () => {
    const markup = mount(() => (
      <ImageGallery images={['/a.jpg']} alts={['A scenic photo']} />
    )).innerHTML
    expect(markup).toContain('alt="A scenic photo"')
    const fallback = mount(() => <ImageGallery images={['/a.jpg']} />).innerHTML
    expect(fallback).toContain('alt="Image 1"')
  })

  it('forwards className', () => {
    const markup = mount(() => <ImageGallery images={['/a.jpg']} className="ig-cls" />).innerHTML
    expect(markup).toContain('ig-cls')
  })
})
