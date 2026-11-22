// @vitest-environment jsdom
/**
 * The gallery's own English goes through i18n — a port of
 * `@molecule/app-image-gallery-react/src/__tests__/image-gallery-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer
 * (the same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses). The image alt fallback was a template literal
 * (`Image ${index + 1}`), so it rendered plain English in every locale; these
 * tests mock `useTranslation` with a `t` that interpolates the bonded English
 * defaults and marks the result, so a string that bypassed `t()` would show up
 * as plain English.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`) — the same mock the Angular suite uses. `grid` resolves `cols` to
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
vi.mock('@molecule/app-angular', async (importOriginal) => ({
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
    selector: 'mol-i18n-spec-host',
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
    class I18nSpecHost {
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
