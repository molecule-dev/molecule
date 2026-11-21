// @vitest-environment jsdom
/**
 * Accessibility of the Angular `VideoTimeline` — the same assertions as
 * `@molecule/app-feature-video-timeline-react/src/__tests__/VideoTimeline.test.tsx`
 * make on the recorded axe findings: the ruler slider announces the playhead
 * time as its `aria-valuetext` (following `currentTime` and the locale), while
 * the playhead lines are decorative and the mode label is hidden text rather
 * than a forbidden `aria-label` on a generic span.
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { VideoTimeline } from '../index.js'
import type { VideoTimelineProps } from '../types.js'

/**
 * Build a UIClassMap stub via Proxy (any token resolves to its name).
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<UIClassMap> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]): string =>
          classes
            .flat(Infinity)
            .map((c) => (typeof c === 'function' ? c() : c))
            .filter((c): c is string => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      const token = String(prop)
      return (..._args: unknown[]): string => token
    },
  }
  return new Proxy({} as UIClassMap, handler)
}

/** The host template every test mounts: one attribute-selector timeline with every input bound. */
const TEMPLATE = `<div mol-video-timeline [tracks]="p['tracks']" [currentTime]="p['currentTime']" [duration]="p['duration']" [onSeek]="p['onSeek']" [onClipMove]="p['onClipMove']" [onClipResize]="p['onClipResize']" [pixelsPerSecond]="p['pixelsPerSecond']" [zoomMin]="p['zoomMin']" [zoomMax]="p['zoomMax']" [mode]="p['mode']" [onZoomChange]="p['onZoomChange']" [selectedClipId]="p['selectedClipId']" [onClipClick]="p['onClipClick']" [trackHeight]="p['trackHeight']" [laneHeaderWidth]="p['laneHeaderWidth']" [rulerHeight]="p['rulerHeight']" [className]="p['className']"></div>`

/** A mounted spec host: its DOM, a change-detection tick and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Re-runs change detection over the host. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The provider the current test bonded. */
let provider: I18nProvider

beforeEach(() => {
  setClassMap(buildStubClassMap())
  provider = createSimpleI18nProvider('en')
  provider.addTranslations('de', {
    videoTimeline: { aria: { playhead: 'Abspielkopf bei {{time}}s' } },
  })
  setProvider(provider)
})

/**
 * Mounts the timeline through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountTimeline(props: VideoTimelineProps): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-a11y-host',
    standalone: true,
    imports: [VideoTimeline as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: VideoTimelineProps = props
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
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The mounted hosts of the current test, destroyed in `afterEach`. */
const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts a `VideoTimeline` and tracks it for teardown.
 *
 * @param props - Component props.
 * @returns The mounted host.
 */
async function renderTimeline(props: VideoTimelineProps): Promise<Mounted> {
  const m = await mountTimeline(props)
  mounted.push(m)
  return m
}

/**
 * The ruler slider in a rendered timeline.
 *
 * @param host - The mounted host.
 * @returns The ruler element, or null.
 */
function rulerOf(host: HTMLElement): Element | null {
  return host.querySelector('[data-mol-id="video-timeline-ruler"]')
}

describe('<VideoTimeline> accessibility', () => {
  it('the ruler announces the playhead time as aria-valuetext', async () => {
    const early = await renderTimeline({ tracks: [], currentTime: 3.2, duration: 60 })
    const later = await renderTimeline({ tracks: [], currentTime: 7.5, duration: 60 })
    expect(rulerOf(early.host)?.getAttribute('aria-valuetext')).toBe('Playhead at 3.20s')
    // Follows currentTime.
    expect(rulerOf(later.host)?.getAttribute('aria-valuetext')).toBe('Playhead at 7.50s')
    // Follows the locale.
    await provider.setLocale('de')
    later.tick()
    expect(rulerOf(later.host)?.getAttribute('aria-valuetext')).toBe('Abspielkopf bei 7.50s')
  })

  it('the playhead line is decorative (aria-hidden, no label)', async () => {
    const m = await renderTimeline({ tracks: [], currentTime: 2, duration: 60 })
    const playhead = m.host.querySelector('[data-mol-id="video-timeline-playhead"]')
    expect(playhead?.getAttribute('aria-hidden')).toBe('true')
    expect(playhead?.getAttribute('aria-label')).toBeNull()
    // The in-ruler marker is decorative the same way.
    const inRuler = m.host.querySelector('[data-mol-id="video-timeline-playhead-ruler"]')
    expect(inRuler?.getAttribute('aria-hidden')).toBe('true')
    expect(inRuler?.getAttribute('aria-label')).toBeNull()
  })

  it('the mode span reads as label + mode through hidden text', async () => {
    const m = await renderTimeline({ tracks: [], currentTime: 0, duration: 60 })
    const mode = m.host.querySelector('[data-mol-id="video-timeline-mode"]')
    // A generic span may not carry aria-label.
    expect(mode?.getAttribute('aria-label')).toBeNull()
    // The label is a visually hidden run (cm.srOnly) before the visible mode word.
    const hidden = mode?.querySelector('span')
    expect(hidden?.className).toContain('srOnly')
    expect(mode?.textContent).toContain('Edit mode')
    expect(mode?.textContent).toContain('Ripple')
    const label = mode?.textContent?.indexOf('Edit mode') ?? -1
    const word = mode?.textContent?.indexOf('Ripple') ?? -1
    expect(label).toBeGreaterThanOrEqual(0)
    expect(word).toBeGreaterThan(label)
  })
})
