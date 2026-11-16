// @vitest-environment jsdom
/**
 * Unit tests for `ExifPanel`, ported from
 * `@molecule/app-exif-panel-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setMoleculeContext } from '@molecule/app-svelte'

import ExifPanel from '../ExifPanel.svelte'
import type { ExifData } from '../types.js'

/** The i18n provider every mount sits inside (React's `I18nProvider`). */
const i18n = createSimpleI18nProvider('en')

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

/** The currently mounted instance, unmounted in {@link afterEach}. */
let instance: ReturnType<typeof mount> | null = null

/**
 * Mounts `ExifPanel` in an i18n context, the way an app wires it.
 *
 * @param props - The panel props.
 * @param provider - The i18n provider the mount sits inside.
 * @returns The rendered `<aside>` element.
 */
function render(
  props: Record<string, unknown>,
  provider: ReturnType<typeof createSimpleI18nProvider> = i18n,
): HTMLElement | null {
  instance = mount(Host, {
    target: document.body,
    props: {
      config: { i18n: provider },
      setMoleculeContext,
      component: ExifPanel as Component<Record<string, unknown>>,
      props,
    },
  })
  flushSync()
  return document.body.querySelector('aside')
}

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = null
  document.body.innerHTML = ''
})

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
  it('renders a region with an aria-label and stable mol-id', () => {
    const panel = render({ exif: fullExif })
    expect(panel?.getAttribute('aria-label')).toBe('EXIF metadata')
    expect(panel?.getAttribute('data-mol-id')).toBe('exif-panel')
  })

  it('renders the camera row with combined make + model', () => {
    render({ exif: fullExif })
    const row = document.querySelector('[data-mol-id="exif-panel-row-camera"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('Canon EOS R5')
  })

  it('renders the lens row with the lens model', () => {
    render({ exif: fullExif })
    const row = document.querySelector('[data-mol-id="exif-panel-row-lens"]')
    expect(row?.textContent).toContain('RF 24-70mm F2.8 L IS USM')
  })

  it('joins exposure parts (aperture, shutter, ISO, focal) into one row', () => {
    render({ exif: fullExif })
    const row = document.querySelector('[data-mol-id="exif-panel-row-exposure"]')
    expect(row).not.toBeNull()
    const text = row?.textContent ?? ''
    expect(text).toContain('f/2.8')
    expect(text).toContain('1/125 s')
    expect(text).toContain('ISO 800')
    expect(text).toContain('50 mm')
  })

  it('takes the exposure notations through i18n by default', () => {
    render({ exif: fullExif }, markerProvider())
    const row = document.querySelector('[data-mol-id="exif-panel-row-exposure"] dd')
    expect(row?.textContent).toBe('«aperture 2.8» · «shutter 1/125» · «iso 800» · «focal 50»')
  })

  it('takes the 35 mm-equivalent value through i18n by default', () => {
    render({ exif: { ...fullExif, focalLength: 35, focalLength35mm: 52 } }, markerProvider())
    const row = document.querySelector('[data-mol-id="exif-panel-row-focal35"] dd')
    expect(row?.textContent).toContain('«focal 52»')
  })

  it('formats the captured timestamp in the active locale and re-formats on a switch', async () => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      { code: 'de', name: 'Deutsch', direction: 'ltr', translations: {} },
    ])
    render({ exif: fullExif }, provider)
    const row = (): string | undefined =>
      document.querySelector('[data-mol-id="exif-panel-row-timestamp"] dd')?.textContent ??
      undefined
    expect(row()).toMatch(/[AP]M/)
    await provider.setLocale('de')
    flushSync()
    const text = row() ?? ''
    expect(text).toContain('15.6.2024')
    expect(text).not.toMatch(/[AP]M/)
  })

  it('renders the GPS row as a map link by default', () => {
    render({ exif: fullExif })
    const link = document.querySelector('[data-mol-id="exif-panel-map-link"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('href')).toContain('openstreetmap.org')
    expect(link?.textContent).toMatch(/N|S/)
  })

  it('hides the GPS row when showGps=false', () => {
    render({ exif: fullExif, showGps: false })
    expect(document.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
    expect(document.querySelector('[data-mol-id="exif-panel-map-link"]')).toBeNull()
  })

  it('hides the GPS row when latitude/longitude are missing', () => {
    render({ exif: { ...fullExif, gpsLatitude: undefined, gpsLongitude: undefined } })
    expect(document.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
  })

  it('skips fields that are missing from the EXIF object', () => {
    const minimal: ExifData = { make: 'Apple', model: 'iPhone 15 Pro' }
    render({ exif: minimal })
    expect(document.querySelector('[data-mol-id="exif-panel-row-camera"]')).not.toBeNull()
    expect(document.querySelector('[data-mol-id="exif-panel-row-lens"]')).toBeNull()
    expect(document.querySelector('[data-mol-id="exif-panel-row-exposure"]')).toBeNull()
    expect(document.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
    expect(document.querySelector('[data-mol-id="exif-panel-row-timestamp"]')).toBeNull()
  })

  it('omits the 35 mm-equivalent row when it equals the focal length', () => {
    render({ exif: fullExif })
    expect(document.querySelector('[data-mol-id="exif-panel-row-focal35"]')).toBeNull()
  })

  it('shows the 35 mm-equivalent row when it differs from focalLength', () => {
    render({ exif: { ...fullExif, focalLength: 35, focalLength35mm: 52 } })
    const row = document.querySelector('[data-mol-id="exif-panel-row-focal35"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('52 mm')
  })

  it('respects a custom heading prop', () => {
    render({ exif: fullExif, heading: 'Capture details' })
    const heading = document.querySelector('[data-mol-id="exif-panel-heading"]')
    expect(heading?.textContent).toBe('Capture details')
  })

  it('renders the eyebrow + default heading when heading prop is omitted', () => {
    render({ exif: fullExif })
    expect(document.querySelector('[data-mol-id="exif-panel-eyebrow"]')?.textContent).toBe(
      'Frame metadata',
    )
    expect(document.querySelector('[data-mol-id="exif-panel-heading"]')?.textContent).toBe('EXIF')
  })

  it('renders the timestamp, software, and copyright rows when present', () => {
    render({ exif: fullExif })
    expect(document.querySelector('[data-mol-id="exif-panel-row-timestamp"]')).not.toBeNull()
    expect(document.querySelector('[data-mol-id="exif-panel-row-software"]')).not.toBeNull()
    expect(document.querySelector('[data-mol-id="exif-panel-row-copyright"]')).not.toBeNull()
  })

  it('appends the className prop to the panel root', () => {
    const panel = render({ exif: fullExif, className: 'my-extra-class' })
    expect(panel?.className).toContain('my-extra-class')
  })
})
