// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ExifPanel` — a port of
 * `@molecule/app-exif-panel-react/src/__tests__/ExifPanel.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ExifPanelProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `surface`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { I18nContext } = await import('@molecule/app-solid')
const { createSimpleI18nProvider } = await import('@molecule/app-i18n')
const { ExifPanel } = await import('../ExifPanel.jsx')

/** The i18n provider every mount sits inside (React's `I18nProvider`). */
const i18nProvider = createSimpleI18nProvider('en')

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

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders the panel in Solid's browser renderer and disposes it after the test.
 *
 * @param props - The panel's props.
 * @param provider - The i18n provider the mount sits inside.
 * @returns The container holding the rendered DOM.
 */
function mount(
  props: ExifPanelProps,
  provider: ReturnType<typeof createSimpleI18nProvider> = i18nProvider,
): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <I18nContext.Provider value={provider}>
          <ExifPanel {...props} />
        </I18nContext.Provider>
      ),
      container,
    ),
  )
  return container
}

const fullExif = {
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
  it('renders a region with an aria-label and stable mol-id', () => {
    const container = mount({ exif: fullExif })
    const panel = container.querySelector('aside')
    expect(panel?.getAttribute('aria-label')).toBe('EXIF metadata')
    expect(panel?.getAttribute('data-mol-id')).toBe('exif-panel')
  })

  it('renders the camera row with combined make + model', () => {
    const container = mount({ exif: fullExif })
    const row = container.querySelector('[data-mol-id="exif-panel-row-camera"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('Canon EOS R5')
  })

  it('renders the lens row with the lens model', () => {
    const container = mount({ exif: fullExif })
    const row = container.querySelector('[data-mol-id="exif-panel-row-lens"]')
    expect(row?.textContent).toContain('RF 24-70mm F2.8 L IS USM')
  })

  it('joins exposure parts (aperture, shutter, ISO, focal) into one row', () => {
    const container = mount({ exif: fullExif })
    const row = container.querySelector('[data-mol-id="exif-panel-row-exposure"]')
    expect(row).not.toBeNull()
    const text = row?.textContent ?? ''
    expect(text).toContain('f/2.8')
    expect(text).toContain('1/125 s')
    expect(text).toContain('ISO 800')
    expect(text).toContain('50 mm')
  })

  it('takes the exposure notations through i18n by default', () => {
    const container = mount({ exif: fullExif }, markerProvider())
    const row = container.querySelector('[data-mol-id="exif-panel-row-exposure"] dd')
    expect(row?.textContent).toBe('«aperture 2.8» · «shutter 1/125» · «iso 800» · «focal 50»')
  })

  it('takes the 35 mm-equivalent value through i18n by default', () => {
    const container = mount(
      { exif: { ...fullExif, focalLength: 35, focalLength35mm: 52 } },
      markerProvider(),
    )
    const row = container.querySelector('[data-mol-id="exif-panel-row-focal35"] dd')
    expect(row?.textContent).toContain('«focal 52»')
  })

  it('formats the captured timestamp in the active locale and re-formats on a switch', async () => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      { code: 'de', name: 'Deutsch', direction: 'ltr', translations: {} },
    ])
    const container = mount({ exif: fullExif }, provider)
    const row = (): string | undefined =>
      container.querySelector('[data-mol-id="exif-panel-row-timestamp"] dd')?.textContent ??
      undefined
    expect(row()).toMatch(/[AP]M/)
    await provider.setLocale('de')
    const text = row() ?? ''
    expect(text).toContain('15.6.2024')
    expect(text).not.toMatch(/[AP]M/)
  })

  it('renders the GPS row as a map link by default', () => {
    const container = mount({ exif: fullExif })
    const link = container.querySelector('[data-mol-id="exif-panel-map-link"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('href')).toContain('openstreetmap.org')
    expect(link?.textContent).toMatch(/N|S/)
  })

  it('hides the GPS row when showGps=false', () => {
    const container = mount({ exif: fullExif, showGps: false })
    expect(container.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-map-link"]')).toBeNull()
  })

  it('hides the GPS row when latitude/longitude are missing', () => {
    const container = mount({
      exif: { ...fullExif, gpsLatitude: undefined, gpsLongitude: undefined },
    })
    expect(container.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
  })

  it('skips fields that are missing from the EXIF object', () => {
    const minimal = { make: 'Apple', model: 'iPhone 15 Pro' }
    const container = mount({ exif: minimal })
    expect(container.querySelector('[data-mol-id="exif-panel-row-camera"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-lens"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-exposure"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-timestamp"]')).toBeNull()
  })

  it('omits the 35 mm-equivalent row when it equals the focal length', () => {
    const container = mount({ exif: fullExif })
    expect(container.querySelector('[data-mol-id="exif-panel-row-focal35"]')).toBeNull()
  })

  it('shows the 35 mm-equivalent row when it differs from focalLength', () => {
    const container = mount({ exif: { ...fullExif, focalLength: 35, focalLength35mm: 52 } })
    const row = container.querySelector('[data-mol-id="exif-panel-row-focal35"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('52 mm')
  })

  it('respects a custom heading prop', () => {
    const container = mount({ exif: fullExif, heading: 'Capture details' })
    const heading = container.querySelector('[data-mol-id="exif-panel-heading"]')
    expect(heading?.textContent).toBe('Capture details')
  })

  it('renders the eyebrow + default heading when heading prop is omitted', () => {
    const container = mount({ exif: fullExif })
    expect(container.querySelector('[data-mol-id="exif-panel-eyebrow"]')?.textContent).toBe(
      'Frame metadata',
    )
    expect(container.querySelector('[data-mol-id="exif-panel-heading"]')?.textContent).toBe('EXIF')
  })

  it('renders the timestamp, software, and copyright rows when present', () => {
    const container = mount({ exif: fullExif })
    expect(container.querySelector('[data-mol-id="exif-panel-row-timestamp"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-software"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-copyright"]')).not.toBeNull()
  })

  it('appends the className prop to the panel root', () => {
    const container = mount({ exif: fullExif, className: 'my-extra-class' })
    const panel = container.querySelector('[data-mol-id="exif-panel"]')
    expect(panel?.className).toContain('my-extra-class')
  })
})
