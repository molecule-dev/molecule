// @vitest-environment jsdom

import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { buildQrPath, QrCode } from '../QrCode.js'

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
      const fn = (..._args: unknown[]) => token
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
 * Wrap children in I18nProvider so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('buildQrPath', () => {
  it('emits a single horizontal run per dark stretch', () => {
    // 3-module row with all dark cells → one run of length 3.
    const fakeQr = {
      getModuleCount: () => 3,
      isDark: (_row: number, _col: number) => true,
    }
    const path = buildQrPath(fakeQr, 0)
    // 3 rows × 1 run of length 3 each
    expect(path).toBe('M0 0h3v1h-3zM0 1h3v1h-3zM0 2h3v1h-3z')
  })

  it('respects margin offset', () => {
    const fakeQr = {
      getModuleCount: () => 1,
      isDark: () => true,
    }
    const path = buildQrPath(fakeQr, 4)
    expect(path).toBe('M4 4h1v1h-1z')
  })

  it('skips light modules', () => {
    const fakeQr = {
      getModuleCount: () => 4,
      isDark: (_row: number, col: number) => col === 1 || col === 3,
    }
    const path = buildQrPath(fakeQr, 0)
    // Each row: dark at col 1, light at 2, dark at 3 → two runs of length 1
    expect(path).toContain('M1 0h1v1h-1z')
    expect(path).toContain('M3 0h1v1h-1z')
  })
})

describe('<QrCode>', () => {
  it('renders an svg with role=img and data-mol-id', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="hello" />
      </Wrap>,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('data-mol-id')).toBe('qr-code')
  })

  it('defaults to 200x200 px', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="hello" />
      </Wrap>,
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('200')
    expect(svg.getAttribute('height')).toBe('200')
  })

  it('honors a custom size', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="hello" size={400} />
      </Wrap>,
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('400')
    expect(svg.getAttribute('height')).toBe('400')
  })

  it('emits a non-empty modules path', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="https://example.com" />
      </Wrap>,
    )
    const path = container.querySelector('[data-mol-id="qr-code-modules"]')
    expect(path).not.toBeNull()
    const d = path?.getAttribute('d') ?? ''
    expect(d.length).toBeGreaterThan(0)
    expect(d.startsWith('M')).toBe(true)
  })

  it('emits the configured background fill', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="x" bgColor="#ff0" />
      </Wrap>,
    )
    const bg = container.querySelector('[data-mol-id="qr-code-bg"]')
    expect(bg?.getAttribute('fill')).toBe('#ff0')
  })

  it('emits the configured foreground fill', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="x" fgColor="#0066ff" />
      </Wrap>,
    )
    const path = container.querySelector('[data-mol-id="qr-code-modules"]')
    expect(path?.getAttribute('fill')).toBe('#0066ff')
  })

  it('produces different module geometries for different error-correction levels', () => {
    const renderAt = (level: 'L' | 'M' | 'Q' | 'H'): string => {
      const { container } = render(
        <Wrap>
          <QrCode value="https://example.com/longish-link-1" errorCorrection={level} />
        </Wrap>,
      )
      const svg = container.querySelector('svg')!
      const viewBox = svg.getAttribute('viewBox') ?? ''
      const path = svg.querySelector('[data-mol-id="qr-code-modules"]')!
      return `${viewBox}|${path.getAttribute('d')}`
    }
    const l = renderAt('L')
    const h = renderAt('H')
    // Higher error correction always uses a larger or equal QR matrix and
    // different module placement → the rendered output must differ.
    expect(l).not.toBe(h)
  })

  it('renders a logo overlay when provided', () => {
    const { container } = render(
      <Wrap>
        <QrCode
          value="x"
          errorCorrection="H"
          logo={{ src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'Brand' }}
        />
      </Wrap>,
    )
    const logo = container.querySelector('[data-mol-id="qr-code-logo"]')
    expect(logo).not.toBeNull()
    expect(logo?.getAttribute('href')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(logo?.getAttribute('aria-label')).toBe('Brand')
  })

  it('omits the logo overlay by default', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="x" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="qr-code-logo"]')).toBeNull()
  })

  it('produces a default aria-label that interpolates the value', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="ABC-123" />
      </Wrap>,
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-label')).toContain('ABC-123')
  })

  it('honors an explicit ariaLabel override', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="ignored" ariaLabel="Scan to redeem" />
      </Wrap>,
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-label')).toBe('Scan to redeem')
  })

  it('merges className through cm.cn', () => {
    const { container } = render(
      <Wrap>
        <QrCode value="x" className="my-extra" />
      </Wrap>,
    )
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('class')).toContain('my-extra')
  })
})
