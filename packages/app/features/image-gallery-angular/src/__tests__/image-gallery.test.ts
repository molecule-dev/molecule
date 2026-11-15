// @vitest-environment jsdom
/**
 * Unit tests of `ImageGallery` — the port of
 * `@molecule/app-image-gallery-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `stack`),
// so tests can assert which cm.* class was applied without a real bond — the
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

const { ImageGallery } = await import('../image-gallery.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element the component template rendered into. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the gallery through a JIT host template, written exactly the way an
 * Angular app writes it.
 *
 * @param props - The props the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ImageGallery as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<mol-image-gallery
      [images]="p['images']"
      [selectedIndex]="p['selectedIndex']"
      [maxThumbnails]="p['maxThumbnails']"
      [alts]="p['alts']"
      [className]="p['className']"
    ></mol-image-gallery>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts the gallery and returns the markup it produced.
 *
 * @param props - The gallery props.
 * @returns The component element's inner markup.
 */
const render = async (props: Record<string, unknown>): Promise<string> => {
  const m = await mount(props)
  mounted.push(m)
  return m.host.querySelector('mol-image-gallery')?.innerHTML ?? ''
}

const images = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg', '/f.jpg']

describe('ImageGallery', () => {
  it('renders nothing when there are no images', async () => {
    // React renders the empty string; Angular leaves its container anchor
    // comment where the empty branch would be, so it is dropped before comparing.
    expect((await render({ images: [] })).replaceAll('<!--container-->', '')).toBe('')
  })

  it('renders the main image (first by default)', async () => {
    const markup = await render({ images: ['/only.jpg'] })
    expect(markup).toContain('src="/only.jpg"')
  })

  it('renders thumbnails when there is more than one image', async () => {
    const markup = await render({ images: images.slice(0, 3) })
    expect(markup.match(/<button/g) ?? []).toHaveLength(3)
  })

  it('marks the selected thumbnail with aria-current', async () => {
    const markup = await render({ images: images.slice(0, 3) })
    expect(markup.match(/aria-current="true"/g) ?? []).toHaveLength(1)
  })

  it('summarises images beyond maxThumbnails as a "+N" chip', async () => {
    const markup = await render({ images, maxThumbnails: 4 })
    expect(markup).toContain('+2')
  })

  it('renders every thumbnail when maxThumbnails is greater than 4', async () => {
    // The old `cols: maxThumbnails as 4` cast lied about the column count and
    // broke the grid past 4. All six thumbnails must still render as buttons.
    const markup = await render({ images, maxThumbnails: 6 })
    expect(markup.match(/<button/g) ?? []).toHaveLength(6)
    expect(markup).toContain('grid-cols-6')
  })

  it('emits a real 4-column grid class for the default maxThumbnails', async () => {
    const markup = await render({ images: images.slice(0, 4) })
    expect(markup).toContain('grid-cols-4')
  })

  it('clamps an unsupported column count to a real grid class (never grid-cols-8)', async () => {
    const many = Array.from({ length: 8 }, (_v, i) => `/img-${i}.jpg`)
    const markup = await render({ images: many, maxThumbnails: 8 })
    // 8 is not a ClassMap grid column count → snapped down to the supported 6.
    expect(markup).toContain('grid-cols-6')
    expect(markup).not.toContain('grid-cols-8')
    // All eight thumbnails still render (they wrap onto a second row).
    expect(markup.match(/<button/g) ?? []).toHaveLength(8)
  })

  it('snaps a very large column count to the top supported value (grid-cols-12)', async () => {
    const many = Array.from({ length: 20 }, (_v, i) => `/img-${i}.jpg`)
    const markup = await render({ images: many, maxThumbnails: 20 })
    expect(markup).toContain('grid-cols-12')
    expect(markup.match(/<button/g) ?? []).toHaveLength(20)
  })

  it('honours a controlled selectedIndex', async () => {
    const markup = await render({ images: images.slice(0, 3), selectedIndex: 2 })
    // main image becomes the third one
    expect(markup).toContain('src="/c.jpg"')
  })

  it('uses supplied alt text, falling back to "Image N"', async () => {
    const markup = await render({ images: ['/a.jpg'], alts: ['A scenic photo'] })
    expect(markup).toContain('alt="A scenic photo"')
    const fallback = await render({ images: ['/a.jpg'] })
    expect(fallback).toContain('alt="Image 1"')
  })

  it('forwards className', async () => {
    const markup = await render({ images: ['/a.jpg'], className: 'ig-cls' })
    expect(markup).toContain('ig-cls')
  })
})
