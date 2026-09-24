// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type ExifData, ExifPanel } from '../index.js'

// What an EXIF parser returns (e.g. `await exifr.parse(file)` — PascalCase tags).
const parsed = {
  Make: 'Sony',
  Model: 'ILCE-7M3',
  LensModel: 'FE 35mm F1.8',
  FNumber: 1.8,
  ExposureTime: 0.004,
  ISO: 200,
  FocalLength: 35,
  DateTimeOriginal: new Date('2024-06-01T18:30:00Z'),
  latitude: 37.8199,
  longitude: -122.4783,
}

// Map it to the panel's camelCase fields — raw parser keys are NOT recognised.
const exif: ExifData = {
  make: parsed.Make,
  model: parsed.Model,
  lensModel: parsed.LensModel,
  fNumber: parsed.FNumber,
  exposureTime: parsed.ExposureTime,
  iso: parsed.ISO,
  focalLength: parsed.FocalLength,
  dateTimeOriginal: parsed.DateTimeOriginal,
  gpsLatitude: parsed.latitude,
  gpsLongitude: parsed.longitude,
}

/**
 * The README example, verbatim.
 *
 * @returns The rendered metadata panel.
 */
function PhotoMetadata(): React.JSX.Element {
  return <ExifPanel exif={exif} heading="Photo details" />
}

/**
 * Text of one panel row's value.
 *
 * @param container - Render container.
 * @param row - Row suffix of the `exif-panel-row-*` id.
 * @returns The row's `<dd>` text, or `null` when the row is absent.
 */
function rowValue(container: HTMLElement, row: string): string | null {
  return container.querySelector(`[data-mol-id="exif-panel-row-${row}"] dd`)?.textContent ?? null
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the mapped camera, lens, exposure, GPS link and capture time', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <PhotoMetadata />
      </I18nProvider>,
    )
    const c = view.container
    expect(view.getByRole('heading', { name: 'Photo details' })).toBeTruthy()
    expect(rowValue(c, 'camera')).toBe('Sony ILCE-7M3')
    expect(rowValue(c, 'lens')).toBe('FE 35mm F1.8')
    expect(rowValue(c, 'exposure')).toBe('f/1.8 · 1/250 s · ISO 200 · 35 mm')
    expect(rowValue(c, 'gps')).toBe(`37° 49' 11.64" N, 122° 28' 41.88" W`)
    expect(c.querySelector('[data-mol-id="exif-panel-map-link"]')?.getAttribute('href')).toBe(
      'https://www.openstreetmap.org/?mlat=37.819900&mlon=-122.478300#map=15/37.819900/-122.478300',
    )
    expect(rowValue(c, 'timestamp')).toBe(new Date('2024-06-01T18:30:00Z').toLocaleString())
  })

  it('ignores raw parser keys that were not mapped (the remark the example guards against)', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ExifPanel exif={parsed} />
      </I18nProvider>,
    )
    expect(view.container.querySelectorAll('[data-mol-id^="exif-panel-row-"]')).toHaveLength(0)
  })
})
