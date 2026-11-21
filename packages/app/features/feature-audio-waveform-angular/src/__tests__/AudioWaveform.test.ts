// @vitest-environment jsdom
/**
 * Unit tests of `AudioWaveform` — the port of
 * `@molecule/app-feature-audio-waveform-react`'s own suite: the same test names
 * and the same behavioral assertions, mounted through Angular's real renderer
 * (the same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses) with the mocked ClassMap the React suite uses.
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

const { AudioWaveform } = await import('../audio-waveform.component.js')
const { clamp, seekTimeFromClick } = await import('../utilities.js')

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
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
        get(_t, key): (() => string) | undefined {
          if (key === Symbol.toPrimitive || key === 'toString') return (): string => token
          return undefined
        },
      })
    },
  }
  return new Proxy({} as UIClassMap, handler)
}

/** The host template, written the way an Angular app writes the component. */
const TEMPLATE = `<div mol-audio-waveform [peaks]="p['peaks']" [duration]="p['duration']" [currentTime]="p['currentTime']" [onSeek]="p['onSeek']" [regions]="p['regions']" [height]="p['height']" [progressColor]="p['progressColor']" [waveColor]="p['waveColor']" [className]="p['className']"></div>`

/** A mounted spec host: its DOM, a props setter, a flush and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Flushes change detection. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template.
 *
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['key']`.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
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
    flush: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const peaks = [0.1, 0.3, 0.6, 0.9, 0.8, 0.5, 0.2, 0.7]

/** Mounted hosts, torn down after each test. */
const mounted: Mounted[] = []

/**
 * Mounts an {@link AudioWaveform} and remembers it for teardown.
 *
 * @param props - The waveform props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(AudioWaveform as Type<unknown>, props)
  mounted.push(m)
  return m
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
  it('clamps below the minimum', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
  })
  it('clamps above the maximum', () => {
    expect(clamp(2, 0, 1)).toBe(1)
  })
  it('returns min for non-finite input', () => {
    expect(clamp(NaN, 0, 1)).toBe(0)
    expect(clamp(Infinity, 5, 10)).toBe(5)
    expect(clamp(-Infinity, 5, 10)).toBe(5)
  })
})

describe('seekTimeFromClick', () => {
  it('returns 0 for non-positive width or duration', () => {
    expect(seekTimeFromClick(50, 0, 60)).toBe(0)
    expect(seekTimeFromClick(50, 100, 0)).toBe(0)
    expect(seekTimeFromClick(50, -1, 60)).toBe(0)
    expect(seekTimeFromClick(50, 100, -1)).toBe(0)
  })

  it('maps midpoint click to half of duration', () => {
    expect(seekTimeFromClick(50, 100, 60)).toBe(30)
  })

  it('clamps to [0, duration]', () => {
    expect(seekTimeFromClick(-10, 100, 60)).toBe(0)
    expect(seekTimeFromClick(200, 100, 60)).toBe(60)
  })

  it('handles fractional positions', () => {
    expect(seekTimeFromClick(25, 100, 80)).toBe(20)
  })
})

describe('<AudioWaveform>', () => {
  it('renders an empty-state region when peaks is empty', async () => {
    const m = await render({ peaks: [], duration: 60 })
    const region = m.host.querySelector('[role="region"]')
    expect(region?.getAttribute('aria-label')).toBe('Audio waveform')
    expect(m.host.querySelector('[data-mol-id="audio-waveform-empty"]')?.textContent).toContain(
      'No waveform',
    )
  })

  it('renders one bar per peak in the base layer', async () => {
    const m = await render({ peaks, duration: 60 })
    const bars = m.host.querySelectorAll('[data-mol-id="audio-waveform-bar"]')
    expect(bars.length).toBe(peaks.length)
  })

  it('renders a matching progress layer that is clipped via clipPath', async () => {
    const m = await render({ peaks, duration: 60, currentTime: 30 })
    const progressBars = m.host.querySelectorAll('[data-mol-id="audio-waveform-bar-progress"]')
    expect(progressBars.length).toBe(peaks.length)
    const progressGroup = m.host.querySelector('[data-mol-id="audio-waveform-bars-progress"]')
    expect(progressGroup?.getAttribute('clip-path')).toContain('url(#')
    // The clipPath rect should size to the played fraction of the 1000-unit viewBox.
    const clipRect = m.host.querySelector('clipPath rect')
    expect(clipRect?.getAttribute('width')).toBe('500')
  })

  it('progress clip width is 0 when currentTime is 0', async () => {
    const m = await render({ peaks, duration: 60, currentTime: 0 })
    const clipRect = m.host.querySelector('clipPath rect')
    expect(clipRect?.getAttribute('width')).toBe('0')
  })

  it('progress clip width clamps at full when currentTime exceeds duration', async () => {
    const m = await render({ peaks, duration: 60, currentTime: 9999 })
    const clipRect = m.host.querySelector('clipPath rect')
    expect(clipRect?.getAttribute('width')).toBe('1000')
  })

  it('marks SVG as interactive and exposes a button role when onSeek is provided', async () => {
    const m = await render({ peaks, duration: 60, onSeek: () => {} })
    const svg = m.host.querySelector('[data-mol-id="audio-waveform-svg"]')
    expect(svg?.getAttribute('data-interactive')).toBe('true')
    expect(svg?.getAttribute('role')).toBe('button')
  })

  it('marks SVG as non-interactive when onSeek is omitted', async () => {
    const m = await render({ peaks, duration: 60 })
    const svg = m.host.querySelector('[data-mol-id="audio-waveform-svg"]')
    expect(svg?.getAttribute('data-interactive')).toBe('false')
    expect(svg?.getAttribute('role')).toBe('img')
  })

  it('fires onSeek with the click position mapped to seconds', async () => {
    const onSeek = vi.fn()
    const m = await render({ peaks, duration: 60, onSeek })
    const svg = m.host.querySelector('[data-mol-id="audio-waveform-svg"]') as SVGSVGElement
    // jsdom's getBoundingClientRect returns zeros, so stub it.
    svg.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 200,
        height: 64,
        right: 200,
        bottom: 64,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100 }))
    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledWith(30)
  })

  it('does not fire onSeek when duration is zero', async () => {
    const onSeek = vi.fn()
    const m = await render({ peaks, duration: 0, onSeek })
    const svg = m.host.querySelector('[data-mol-id="audio-waveform-svg"]') as SVGSVGElement
    expect(svg.getAttribute('data-interactive')).toBe('false')
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100 }))
    expect(onSeek).not.toHaveBeenCalled()
  })

  it('renders region overlays at the correct horizontal range', async () => {
    const regions = [
      { id: 'r1', startTime: 0, duration: 30 },
      { id: 'r2', startTime: 30, duration: 30, color: '#ff000088' },
    ]
    const m = await render({ peaks, duration: 60, regions })
    const rendered = m.host.querySelectorAll('[data-mol-id="audio-waveform-region"]')
    expect(rendered.length).toBe(2)
    expect(rendered[0].getAttribute('data-region-id')).toBe('r1')
    expect(rendered[0].getAttribute('x')).toBe('0')
    expect(rendered[0].getAttribute('width')).toBe('500')
    expect(rendered[1].getAttribute('x')).toBe('500')
    expect(rendered[1].getAttribute('width')).toBe('500')
    expect(rendered[1].getAttribute('fill')).toBe('#ff000088')
  })

  it('skips regions with non-positive duration', async () => {
    const regions = [
      { id: 'good', startTime: 0, duration: 5 },
      { id: 'zero', startTime: 5, duration: 0 },
      { id: 'neg', startTime: 10, duration: -1 },
    ]
    const m = await render({ peaks, duration: 60, regions })
    const rendered = m.host.querySelectorAll('[data-mol-id="audio-waveform-region"]')
    expect(rendered.length).toBe(1)
    expect(rendered[0].getAttribute('data-region-id')).toBe('good')
  })

  it('clamps region overlays to the audio duration', async () => {
    const regions = [{ id: 'overflow', startTime: 30, duration: 9999 }]
    const m = await render({ peaks, duration: 60, regions })
    const rendered = m.host.querySelectorAll('[data-mol-id="audio-waveform-region"]')
    expect(rendered.length).toBe(1)
    expect(rendered[0].getAttribute('x')).toBe('500')
    expect(rendered[0].getAttribute('width')).toBe('500')
  })

  it('honors a custom height', async () => {
    const m = await render({ peaks, duration: 60, height: 120 })
    const svg = m.host.querySelector('[data-mol-id="audio-waveform-svg"]')
    expect(svg?.getAttribute('height')).toBe('120')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 1000 120')
  })

  it('uses progressColor / waveColor when provided', async () => {
    const m = await render({
      peaks,
      duration: 60,
      progressColor: '#abcdef',
      waveColor: '#123456',
    })
    const baseGroup = m.host.querySelector('[data-mol-id="audio-waveform-bars-base"]')
    const progressGroup = m.host.querySelector('[data-mol-id="audio-waveform-bars-progress"]')
    expect(baseGroup?.getAttribute('fill')).toBe('#123456')
    expect(progressGroup?.getAttribute('fill')).toBe('#abcdef')
  })
})
