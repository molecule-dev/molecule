// @vitest-environment jsdom

import { render } from '@testing-library/react'
import React from 'react'
import { act, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

// The map link is the element `Link`, whose anchor is `@molecule/app-react/link` and renders only
// inside a mounted router. This file mounts none, so the anchor is drawn plain with what the
// element passes it; the conformance golden test renders the real one.
vi.mock('@molecule/app-react/link', async () => {
  const { createElement } = await import('react')
  return {
    Link: ({
      to,
      children,
      ...anchor
    }: {
      to: string
      children?: ReactNode
    } & Record<string, unknown>) => createElement('a', { ...anchor, href: to }, children),
  }
})

import { ExifPanel } from '../ExifPanel.js'
import type { ExifData } from '../types.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

/**
 * An i18n provider whose translations mark each exposure-notation key, so a
 * value that bypassed `t()` shows up as bare digits / plain English.
 *
 * @returns The provider.
 */
function markerProvider(): ReturnType<typeof createSimpleI18nProvider> {
  return createSimpleI18nProvider('en', [
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
}

/**
 * Wrap children in `I18nProvider` over an explicit provider.
 *
 * @param props - Wrapper props.
 * @param props.provider - The provider to bond for the tree.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function WrapWith({
  provider,
  children,
}: {
  provider: ReturnType<typeof createSimpleI18nProvider>
  children: ReactNode
}): React.ReactElement {
  return <I18nProvider provider={provider}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
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
    const { getByRole } = render(
      <Wrap>
        <ExifPanel exif={fullExif} />
      </Wrap>,
    )
    const panel = getByRole('complementary')
    expect(panel.getAttribute('aria-label')).toBe('EXIF metadata')
    expect(panel.getAttribute('data-mol-id')).toBe('exif-panel')
  })

  it('renders the camera row with combined make + model', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} />
      </Wrap>,
    )
    const row = container.querySelector('[data-mol-id="exif-panel-row-camera"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('Canon EOS R5')
  })

  it('renders the lens row with the lens model', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} />
      </Wrap>,
    )
    const row = container.querySelector('[data-mol-id="exif-panel-row-lens"]')
    expect(row?.textContent).toContain('RF 24-70mm F2.8 L IS USM')
  })

  it('joins exposure parts (aperture, shutter, ISO, focal) into one row', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} />
      </Wrap>,
    )
    const row = container.querySelector('[data-mol-id="exif-panel-row-exposure"]')
    expect(row).not.toBeNull()
    const text = row?.textContent ?? ''
    expect(text).toContain('f/2.8')
    expect(text).toContain('1/125 s')
    expect(text).toContain('ISO 800')
    expect(text).toContain('50 mm')
  })

  it('takes the exposure notations through i18n by default', () => {
    const { container } = render(
      <WrapWith provider={markerProvider()}>
        <ExifPanel exif={fullExif} />
      </WrapWith>,
    )
    const row = container.querySelector('[data-mol-id="exif-panel-row-exposure"] dd')
    expect(row?.textContent).toBe('«aperture 2.8» · «shutter 1/125» · «iso 800» · «focal 50»')
  })

  it('takes the 35 mm-equivalent value through i18n by default', () => {
    const { container } = render(
      <WrapWith provider={markerProvider()}>
        <ExifPanel exif={{ ...fullExif, focalLength: 35, focalLength35mm: 52 }} />
      </WrapWith>,
    )
    const row = container.querySelector('[data-mol-id="exif-panel-row-focal35"]')
    expect(row?.textContent).toContain('«focal 52»')
  })

  it('formats the captured timestamp in the active locale and re-formats on a switch', async () => {
    const provider = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      { code: 'de', name: 'Deutsch', direction: 'ltr', translations: {} },
    ])
    const { container } = render(
      <WrapWith provider={provider}>
        <ExifPanel exif={fullExif} />
      </WrapWith>,
    )
    const row = (): string | undefined =>
      container.querySelector('[data-mol-id="exif-panel-row-timestamp"]')?.textContent ?? undefined
    expect(row()).toMatch(/[AP]M/)
    await act(async () => {
      await provider.setLocale('de')
    })
    const text = row() ?? ''
    expect(text).toContain('15.6.2024')
    expect(text).not.toMatch(/[AP]M/)
  })

  it('renders the GPS row as a map link by default', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} />
      </Wrap>,
    )
    const link = container.querySelector(
      '[data-mol-id="exif-panel-map-link"]',
    ) as HTMLAnchorElement | null
    expect(link).not.toBeNull()
    expect(link?.getAttribute('href')).toContain('openstreetmap.org')
    expect(link?.textContent).toMatch(/N|S/)
  })

  it('hides the GPS row when showGps=false', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} showGps={false} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-map-link"]')).toBeNull()
  })

  it('hides the GPS row when latitude/longitude are missing', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={{ ...fullExif, gpsLatitude: undefined, gpsLongitude: undefined }} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
  })

  it('skips fields that are missing from the EXIF object', () => {
    const minimal: ExifData = { make: 'Apple', model: 'iPhone 15 Pro' }
    const { container } = render(
      <Wrap>
        <ExifPanel exif={minimal} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="exif-panel-row-camera"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-lens"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-exposure"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-gps"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-timestamp"]')).toBeNull()
  })

  it('omits the 35 mm-equivalent row when it equals the focal length', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="exif-panel-row-focal35"]')).toBeNull()
  })

  it('shows the 35 mm-equivalent row when it differs from focalLength', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={{ ...fullExif, focalLength: 35, focalLength35mm: 52 }} />
      </Wrap>,
    )
    const row = container.querySelector('[data-mol-id="exif-panel-row-focal35"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('52 mm')
  })

  it('respects a custom heading prop', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} heading="Capture details" />
      </Wrap>,
    )
    const heading = container.querySelector('[data-mol-id="exif-panel-heading"]')
    expect(heading?.textContent).toBe('Capture details')
  })

  it('renders the eyebrow + default heading when heading prop is omitted', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="exif-panel-eyebrow"]')?.textContent).toBe(
      'Frame metadata',
    )
    expect(container.querySelector('[data-mol-id="exif-panel-heading"]')?.textContent).toBe('EXIF')
  })

  it('renders the timestamp, software, and copyright rows when present', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="exif-panel-row-timestamp"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-software"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="exif-panel-row-copyright"]')).not.toBeNull()
  })

  it('appends the className prop to the panel root', () => {
    const { container } = render(
      <Wrap>
        <ExifPanel exif={fullExif} className="my-extra-class" />
      </Wrap>,
    )
    const panel = container.querySelector('[data-mol-id="exif-panel"]')
    expect(panel?.className).toContain('my-extra-class')
  })
})
