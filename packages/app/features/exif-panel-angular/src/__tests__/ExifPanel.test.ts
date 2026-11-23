// @vitest-environment jsdom
/**
 * Unit tests of `ExifPanel` — the port of
 * `@molecule/app-exif-panel-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the other Angular feature ports
 * use) and asserts the same markup.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `surface`), so tests can assert which cm.* class was applied without a real
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ExifPanel } from '../exif-panel.component.js'
import type { ExifData } from '../types.js'

/**
 * An i18n provider whose translations mark each exposure-notation key, so a
 * value that bypassed `t()` shows up as bare digits / plain English.
 *
 * @returns The provider.
 */
const markerProvider = () =>
  createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      direction: 'ltr',
      translations: {
        'exifPanel.value.aperture': '«aperture {{value}}»',
        'exifPanel.value.shutter': '«shutter {{value}}»',
        'exifPanel.value.iso': '«iso {{value}}»',
        'exifPanel.value.focalLength': '«focal {{value}}»',
      },
    },
  ])

/** The host template for one ExifPanel render: every prop is bound. */
const template = `<aside mol-exif-panel
  [exif]="p['exif']"
  [compact]="p['compact']"
  [showGps]="p['showGps']"
  [heading]="p['heading']"
  [className]="p['className']"
></aside>`

/** A mounted spec host: the body element and a teardown. */
interface Mounted {
  /** The element the spec host rendered into. */
  readonly host: HTMLElement
  /** Refreshes the view after a bonded provider change. */
  refresh(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

/** Selector counter: each JIT host gets a unique selector (no component-ID clash). */
let hosts = 0

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param hostTemplate - The host template (the component element).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  hostTemplate: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: `mol-spec-host-${hosts++}`,
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: hostTemplate,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
    host,
    refresh: (): void => {
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(m)
  return m
}

/**
 * Renders an {@link ExifPanel} with the given props.
 *
 * @param props - The props to bind.
 * @returns The mounted host.
 */
const render = (props: Record<string, unknown>): Promise<Mounted> =>
  mount(template, ExifPanel as Type<unknown>, props)

const fullExif: ExifData = {
  make: 'Canon',
  model: 'EOS R5',
  lensModel: 'RF 24-70mm F2.8 L IS USM',
  fNumber: 2.8,
  exposureTime: 0.008,
  iso: 800,
  focalLength: 50,
  focalLength35mm: 50,
  dateTimeOriginal: '2024-06-15T12:30:45Z',
  gpsLatitude: 37.4219983,
  gpsLongitude: -122.084,
  software: 'Adobe Lightroom 13',
  copyright: '© 2024 Photographer',
}

describe('<ExifPanel>', () => {
  it('renders a region with an aria-label and stable mol-id', async () => {
    const { host } = await render({ exif: fullExif })
    const panel = host.querySelector('aside')
    expect(panel?.getAttribute('aria-label')).toBe('EXIF metadata')
    expect(panel?.getAttribute('data-mol-id')).toBe('exif-panel')
  })

  it('renders the camera row with combined make + model', async () => {
    const { host } = await render({ exif: fullExif })
    const row = host.querySelector('[data-mol-id="exif-panel-row-camera"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('Canon EOS R5')
  })

  it('renders the lens row with the lens model', async () => {
    const { host } = await render({ exif: fullExif })
    const row = host.querySelector('[data-mol-id="exif-panel-row-lens"]')
    expect(row?.textContent).toContain('RF 24-70mm F2.8 L IS USM')
  })

  it('joins exposure parts (aperture, shutter, ISO, focal) into one row', async () => {
    const { host } = await render({ exif: fullExif })
    const row = host.querySelector('[data-mol-id="exif-panel-row-exposure"]')
    expect(row).not.toBeNull()
    const text = row?.textContent ?? ''
    expect(text).toContain('f/2.8')
    expect(text).toContain('1/125 s')
    expect(text).toContain('ISO 800')
    expect(text).toContain('50 mm')
  })

  it('takes the exposure notations through i18n by default', async () => {
    setProvider(markerProvider())
    const { host } = await render({ exif: fullExif })
    const row = host.querySelector('[data-mol-id="exif-panel-row-exposure"] dd')
    // Angular's template keeps whitespace around an interpolation; trim it.
    expect(row?.textContent?.trim()).toBe(
      '«aperture 2.8» · «shutter 1/125» · «iso 800» · «focal 50»',
    )
  })

  it('takes the 35 mm-equivalent value through i18n by default', async () => {
    setProvider(markerProvider())
    const { host } = await render({
      exif: { ...fullExif, focalLength: 35, focalLength35mm: 52 },
    })
    const row = host.querySelector('[data-mol-id="exif-panel-row-focal35"] dd')
    expect(row?.textContent).toContain('«focal 52»')
  })

  it('formats the captured timestamp in the active locale and re-formats on a switch', async () => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      { code: 'de', name: 'Deutsch', direction: 'ltr', translations: {} },
    ])
    setProvider(provider)
    const { host, refresh } = await render({ exif: fullExif })
    const row = (): string | undefined =>
      host.querySelector('[data-mol-id="exif-panel-row-timestamp"] dd')?.textContent ?? undefined
    expect(row()).toMatch(/[AP]M/)
    await provider.setLocale('de')
    refresh()
    const text = row() ?? ''
    expect(text).toContain('15.6.2024')
    expect(text).not.toMatch(/[AP]M/)
  })

  it('renders the GPS row as a map link by default', async () => {
    const { host } = await render({ exif: fullExif })
    const link = host.querySelector('[data-mol-id="exif-panel-map-link"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('href')).toContain('openstreetmap.org')
    expect(link?.textContent).toMatch(/N|S/)
  })

  it('hides the GPS row when showGps=false', async () => {
    const { host } = await render({ exif: fullExif, showGps: false })
    expect(host.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="exif-panel-map-link"]')).toBeNull()
  })

  it('hides the GPS row when latitude/longitude are missing', async () => {
    const { host } = await render({
      exif: { ...fullExif, gpsLatitude: undefined, gpsLongitude: undefined },
    })
    expect(host.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
  })

  it('skips fields that are missing from the EXIF object', async () => {
    const minimal: ExifData = { make: 'Apple', model: 'iPhone 15 Pro' }
    const { host } = await render({ exif: minimal })
    expect(host.querySelector('[data-mol-id="exif-panel-row-camera"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="exif-panel-row-lens"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="exif-panel-row-exposure"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="exif-panel-row-timestamp"]')).toBeNull()
  })

  it('omits the 35 mm-equivalent row when it equals the focal length', async () => {
    const { host } = await render({ exif: fullExif })
    expect(host.querySelector('[data-mol-id="exif-panel-row-focal35"]')).toBeNull()
  })

  it('shows the 35 mm-equivalent row when it differs from focalLength', async () => {
    const { host } = await render({
      exif: { ...fullExif, focalLength: 35, focalLength35mm: 52 },
    })
    const row = host.querySelector('[data-mol-id="exif-panel-row-focal35"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('52 mm')
  })

  it('respects a custom heading prop', async () => {
    const { host } = await render({ exif: fullExif, heading: 'Capture details' })
    const heading = host.querySelector('[data-mol-id="exif-panel-heading"]')
    expect(heading?.textContent).toBe('Capture details')
  })

  it('renders the eyebrow + default heading when heading prop is omitted', async () => {
    const { host } = await render({ exif: fullExif })
    expect(host.querySelector('[data-mol-id="exif-panel-eyebrow"]')?.textContent).toBe(
      'Frame metadata',
    )
    expect(host.querySelector('[data-mol-id="exif-panel-heading"]')?.textContent).toBe('EXIF')
  })

  it('renders the timestamp, software, and copyright rows when present', async () => {
    const { host } = await render({ exif: fullExif })
    expect(host.querySelector('[data-mol-id="exif-panel-row-timestamp"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="exif-panel-row-software"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="exif-panel-row-copyright"]')).not.toBeNull()
  })

  it('appends the className prop to the panel root', async () => {
    const { host } = await render({ exif: fullExif, className: 'my-extra-class' })
    const panel = host.querySelector('[data-mol-id="exif-panel"]')
    expect(panel?.className).toContain('my-extra-class')
  })
})
