// @vitest-environment jsdom
/**
 * Unit tests of `NowPlayingBar` — the port of
 * `@molecule/app-now-playing-bar-react`'s own suite: the same test names and
 * behavioral assertions, mounted through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular adapter
 * uses).
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

import type { NowPlayingTrack } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default, interpolating `{{placeholders}}`.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values: Record<string, unknown> = {}, opts?: { defaultValue?: string }) =>
      (opts?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        String(values[name] ?? ''),
      ),
    locale: () => 'en',
    setLocale: () => {},
  }),
}))

const { formatTime, NowPlayingBar } = await import('../now-playing-bar.component.js')

/** A mounted spec host: its DOM, a props setter and a change-detection flush. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The template every test's host writes, the way an Angular app would. */
const TEMPLATE = `<div mol-now-playing-bar [track]="p['track']" [isPlaying]="p['isPlaying']" [onPlay]="p['onPlay']" [onPause]="p['onPause']" [onPrev]="p['onPrev']" [onNext]="p['onNext']" [currentTime]="p['currentTime']" [duration]="p['duration']" [onSeek]="p['onSeek']" [volume]="p['volume']" [onVolumeChange]="p['onVolumeChange']"></div>`

/**
 * Mounts the component through a JIT host template.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [NowPlayingBar as Type<unknown>],
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
    tick: () => appRef.tick(),
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a `NowPlayingBar` and tracks it for teardown.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const m = await mount(props)
  mounted.push(m)
  return m
}

const baseTrack: NowPlayingTrack = {
  id: 't1',
  title: 'Midnight City',
  artist: 'M83',
  artwork: 'https://example.test/art.jpg',
}

/** The required callbacks of a non-empty case. */
const required = { onPlay: () => {}, onPause: () => {}, onSeek: () => {} }

/**
 * Dispatches a click on the first element matching the selector.
 *
 * @param host - The mounted host element.
 * @param selector - The CSS selector.
 * @param done - Flushes change detection after the event.
 */
function click(host: HTMLElement, selector: string, done: () => void): void {
  host.querySelector(selector)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  done()
}

/**
 * Sets an input's value and dispatches its `input` event, as a user would.
 *
 * @param host - The mounted host element.
 * @param selector - The CSS selector.
 * @param value - The new value.
 * @param done - Flushes change detection after the event.
 */
function input(host: HTMLElement, selector: string, value: string, done: () => void): void {
  const element = host.querySelector(selector) as HTMLInputElement
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  done()
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('formatTime', () => {
  it('formats whole minutes', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(60)).toBe('1:00')
    expect(formatTime(125)).toBe('2:05')
  })

  it('returns 0:00 for non-finite or negative input', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(Infinity)).toBe('0:00')
    expect(formatTime(-1)).toBe('0:00')
  })
})

describe('<NowPlayingBar>', () => {
  it('renders a region with an aria-label naming the track', async () => {
    const { host } = await render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    const region = host.querySelector('[role="region"]')!
    expect(region.getAttribute('aria-label')).toContain('Midnight City')
    expect(region.getAttribute('data-mol-id')).toBe('now-playing-bar')
  })

  it('renders title, artist, and artwork', async () => {
    const { host } = await render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    expect(host.querySelector('[data-mol-id="now-playing-bar-title"]')?.textContent).toBe(
      'Midnight City',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-artist"]')?.textContent).toBe('M83')
    const img = host.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://example.test/art.jpg')
    expect(img?.getAttribute('alt')).toContain('Midnight City')
  })

  it('shows Play label when paused and Pause label when playing', async () => {
    const m = await render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    const btn = (): Element => m.host.querySelector('[data-mol-id="now-playing-bar-play"]')!
    expect(btn().getAttribute('aria-label')).toBe('Play')
    expect(btn().getAttribute('aria-pressed')).toBe('false')

    await m.setProps({ isPlaying: true })
    expect(btn().getAttribute('aria-label')).toBe('Pause')
    expect(btn().getAttribute('aria-pressed')).toBe('true')
  })

  it('fires onPlay when paused and the toggle is clicked', async () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const m = await render({
      track: baseTrack,
      isPlaying: false,
      onPlay,
      onPause,
      currentTime: 0,
      duration: 180,
      onSeek: () => {},
    })
    click(m.host, '[data-mol-id="now-playing-bar-play"]', m.tick)
    expect(onPlay).toHaveBeenCalledTimes(1)
    expect(onPause).not.toHaveBeenCalled()
  })

  it('fires onPause when playing and the toggle is clicked', async () => {
    const onPlay = vi.fn()
    const onPause = vi.fn()
    const m = await render({
      track: baseTrack,
      isPlaying: true,
      onPlay,
      onPause,
      currentTime: 0,
      duration: 180,
      onSeek: () => {},
    })
    click(m.host, '[data-mol-id="now-playing-bar-play"]', m.tick)
    expect(onPause).toHaveBeenCalledTimes(1)
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('hides next/prev buttons when handlers are not provided', async () => {
    const { host } = await render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    expect(host.querySelector('[data-mol-id="now-playing-bar-prev"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="now-playing-bar-next"]')).toBeNull()
  })

  it('fires onPrev / onNext when their handlers are provided', async () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const m = await render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
      onPrev,
      onNext,
    })
    click(m.host, '[data-mol-id="now-playing-bar-prev"]', m.tick)
    click(m.host, '[data-mol-id="now-playing-bar-next"]', m.tick)
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('renders current time and duration formatted as m:ss', async () => {
    const { host } = await render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 65,
      duration: 245,
      ...required,
    })
    expect(host.querySelector('[data-mol-id="now-playing-bar-current-time"]')?.textContent).toBe(
      '1:05',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-duration"]')?.textContent).toBe('4:05')
  })

  it('fires onSeek with parsed numeric value', async () => {
    const onSeek = vi.fn()
    const m = await render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      onPlay: () => {},
      onPause: () => {},
      onSeek,
    })
    input(m.host, '[data-mol-id="now-playing-bar-seek"]', '42', m.tick)
    expect(onSeek).toHaveBeenCalledWith(42)
  })

  it('hides volume control when volume / handler are not provided', async () => {
    const { host } = await render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
    })
    expect(host.querySelector('[data-mol-id="now-playing-bar-volume"]')).toBeNull()
  })

  it('fires onVolumeChange with parsed value', async () => {
    const onVolumeChange = vi.fn()
    const m = await render({
      track: baseTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 180,
      ...required,
      volume: 0.5,
      onVolumeChange,
    })
    const slider = m.host.querySelector('[data-mol-id="now-playing-bar-volume-slider"]')
    expect(slider).not.toBeNull()
    input(m.host, '[data-mol-id="now-playing-bar-volume-slider"]', '0.8', m.tick)
    expect(onVolumeChange).toHaveBeenCalledWith(0.8)
  })

  it('renders trailing slot when provided', async () => {
    const Host = Component({
      selector: 'mol-slot-host',
      standalone: true,
      imports: [NowPlayingBar as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.Default,
      template: `<div mol-now-playing-bar [track]="{ id: 't1', title: 'Midnight City', artist: 'M83' }" [isPlaying]="false" [onPlay]="p['onPlay']" [onPause]="p['onPause']" [currentTime]="0" [duration]="180" [onSeek]="p['onSeek']"><button slot="trailing" data-mol-id="custom-queue">Q</button></div>`,
    })(
      class SpecHost {
        /** The props the template binds. */
        p: Record<string, unknown> = {}
      },
    )
    const appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
    const ref = createComponent(Host, { environmentInjector: appRef.injector })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    mounted.push({
      host,
      tick: () => appRef.tick(),
      setProps: async () => {},
      destroy: async () => {
        appRef.destroy()
        host.remove()
      },
    })
    const trailing = host.querySelector('[data-mol-id="now-playing-bar-trailing"]')
    expect(trailing).not.toBeNull()
    expect(trailing?.querySelector('[data-mol-id="custom-queue"]')).not.toBeNull()
  })

  it('renders the documented empty state (no throw) when track is null', async () => {
    let m: Mounted | undefined
    let threw = false
    try {
      m = await render({ track: null, isPlaying: false, currentTime: 0, duration: 0, ...required })
    } catch (_error) {
      threw = true
    }
    expect(threw).toBe(false)
    const host = m!.host
    const region = host.querySelector('[role="region"]')!
    expect(region.getAttribute('data-mol-id')).toBe('now-playing-bar')
    expect(region.getAttribute('data-mol-empty')).toBe('true')
    const empty = host.querySelector('[data-mol-id="now-playing-bar-empty"]')
    expect(empty?.textContent).toBe('Nothing playing')
    expect(host.querySelector('[data-mol-id="now-playing-bar-play"]')).toBeNull()
  })

  it('renders the empty state when track is undefined (prop omitted)', async () => {
    const { host } = await render({ isPlaying: false, currentTime: 0, duration: 0, ...required })
    expect(host.querySelector('[role="region"]')?.getAttribute('data-mol-empty')).toBe('true')
    expect(host.querySelector('[data-mol-id="now-playing-bar-empty"]')?.textContent).toBe(
      'Nothing playing',
    )
    expect(host.querySelector('[data-mol-id="now-playing-bar-seek"]')).toBeNull()
  })

  it('renders artwork placeholder div when artwork is omitted', async () => {
    const { host } = await render({
      track: { id: 't2', title: 'Empty', artist: 'Nobody' },
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      ...required,
    })
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('[data-mol-id="now-playing-bar-artwork"]')).not.toBeNull()
  })
})
