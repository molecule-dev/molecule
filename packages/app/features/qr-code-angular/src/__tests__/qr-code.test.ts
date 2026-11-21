// @vitest-environment jsdom
/**
 * Unit tests for `QrCode` — the port of
 * `@molecule/app-qr-code-react`'s own suite. The React suite renders with
 * mocked UI dependencies and asserts the markup; this port mounts the same
 * tree through Angular's real renderer (the same `createApplication` + JIT
 * host approach the conformance kit's Angular adapter uses) and asserts the
 * same markup.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { buildQrPath } from '../path.js'
import { QrCode } from '../qr-code.component.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<UIClassMap> = {
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
  return new Proxy({} as UIClassMap, handler)
}

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the standalone `QrCode` through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [QrCode],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<svg
      mol-qr-code
      [value]="p['value']"
      [size]="p['size']"
      [errorCorrection]="p['errorCorrection']"
      [fgColor]="p['fgColor']"
      [bgColor]="p['bgColor']"
      [margin]="p['margin']"
      [logo]="p['logo']"
      [ariaLabel]="p['ariaLabel']"
      [className]="p['className']"
    ></svg>`,
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
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts the QR code and returns the host element, the way the React suite's
 * `render` returns its container.
 *
 * @param props - Component props.
 * @returns The spec host element.
 */
const renderQrCode = async (props: Record<string, unknown>): Promise<HTMLElement> => {
  const m = await mount(props)
  mounted.push(m)
  return m.host
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
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
  it('renders an svg with role=img and data-mol-id', async () => {
    const container = await renderQrCode({ value: 'hello' })
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('data-mol-id')).toBe('qr-code')
  })

  it('defaults to 200x200 px', async () => {
    const container = await renderQrCode({ value: 'hello' })
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('200')
    expect(svg.getAttribute('height')).toBe('200')
  })

  it('honors a custom size', async () => {
    const container = await renderQrCode({ value: 'hello', size: 400 })
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('400')
    expect(svg.getAttribute('height')).toBe('400')
  })

  it('emits a non-empty modules path', async () => {
    const container = await renderQrCode({ value: 'https://example.com' })
    const path = container.querySelector('[data-mol-id="qr-code-modules"]')
    expect(path).not.toBeNull()
    const d = path?.getAttribute('d') ?? ''
    expect(d.length).toBeGreaterThan(0)
    expect(d.startsWith('M')).toBe(true)
  })

  it('emits the configured background fill', async () => {
    const container = await renderQrCode({ value: 'x', bgColor: '#ff0' })
    const bg = container.querySelector('[data-mol-id="qr-code-bg"]')
    expect(bg?.getAttribute('fill')).toBe('#ff0')
  })

  it('emits the configured foreground fill', async () => {
    const container = await renderQrCode({ value: 'x', fgColor: '#0066ff' })
    const path = container.querySelector('[data-mol-id="qr-code-modules"]')
    expect(path?.getAttribute('fill')).toBe('#0066ff')
  })

  it('produces different module geometries for different error-correction levels', async () => {
    const renderAt = async (level: 'L' | 'M' | 'Q' | 'H'): Promise<string> => {
      const container = await renderQrCode({
        value: 'https://example.com/longish-link-1',
        errorCorrection: level,
      })
      const svg = container.querySelector('svg')!
      const viewBox = svg.getAttribute('viewBox') ?? ''
      const path = svg.querySelector('[data-mol-id="qr-code-modules"]')!
      return `${viewBox}|${path.getAttribute('d')}`
    }
    const l = await renderAt('L')
    const h = await renderAt('H')
    // Higher error correction always uses a larger or equal QR matrix and
    // different module placement → the rendered output must differ.
    expect(l).not.toBe(h)
  })

  it('renders a logo overlay when provided', async () => {
    const container = await renderQrCode({
      value: 'x',
      errorCorrection: 'H',
      logo: { src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'Brand' },
    })
    const logo = container.querySelector('[data-mol-id="qr-code-logo"]')
    expect(logo).not.toBeNull()
    expect(logo?.getAttribute('href')).toBe('data:image/png;base64,iVBORw0KGgo=')
  })

  it('omits the logo overlay by default', async () => {
    const container = await renderQrCode({ value: 'x' })
    expect(container.querySelector('[data-mol-id="qr-code-logo"]')).toBeNull()
  })

  it('the logo alt text becomes the QR code description', async () => {
    const container = await renderQrCode({
      value: 'x',
      errorCorrection: 'H',
      logo: { src: 'data:image/png;base64,iVBORw0KGgo=', alt: 'Brand' },
    })
    const svg = container.querySelector('svg')!
    // The subtle part: the alt text describes the whole code, not the image —
    // an `<image>` in a `role="img"` SVG is presentational, so its own
    // `aria-label` would never be read.
    const describedBy = svg.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const desc = container.querySelector('desc')
    expect(desc).not.toBeNull()
    expect(desc?.getAttribute('id')).toBe(describedBy)
    expect(desc?.textContent).toBe('Brand')
    expect(svg.firstElementChild?.tagName.toLowerCase()).toBe('desc')
    expect(
      container.querySelector('[data-mol-id="qr-code-logo"]')?.getAttribute('aria-label'),
    ).toBeNull()
  })

  it('omits the QR code description when the logo has no alt text', async () => {
    const container = await renderQrCode({ value: 'x', logo: { src: '/logo.png' } })
    const svg = container.querySelector('svg')!
    expect(svg.hasAttribute('aria-describedby')).toBe(false)
    expect(container.querySelector('desc')).toBeNull()
  })

  it('produces a default aria-label that interpolates the value', async () => {
    const container = await renderQrCode({ value: 'ABC-123' })
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-label')).toContain('ABC-123')
  })

  it('honors an explicit ariaLabel override', async () => {
    const container = await renderQrCode({ value: 'ignored', ariaLabel: 'Scan to redeem' })
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-label')).toBe('Scan to redeem')
  })

  it('merges className through cm.cn', async () => {
    const container = await renderQrCode({ value: 'x', className: 'my-extra' })
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('class')).toContain('my-extra')
  })
})
