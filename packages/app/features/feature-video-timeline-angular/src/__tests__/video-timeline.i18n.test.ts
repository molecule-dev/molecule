// @vitest-environment jsdom
/**
 * Literal locale keys for the Angular `VideoTimeline` — a port of
 * `@molecule/app-feature-video-timeline-react/src/__tests__/VideoTimeline.i18n.test.tsx`:
 * the bonded i18n provider is replaced with a marker stub, so every key renders
 * as «key» and a label built at runtime or an English default bypassing `t()`
 * shows up as plain text instead.
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

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .filter((c) => typeof c === 'string' && c)
                  .join(' ')
            : () => String(prop),
      },
    ),
}))

const { VideoTimeline } = await import('../index.js')

import type { Track, VideoTimelineProps } from '../types.js'

const TRACK_KINDS = ['video', 'audio', 'subtitle'] as const

const tracks: Track[] = TRACK_KINDS.map((kind) => ({
  id: `track-${kind}`,
  kind,
  clips: [],
}))

/** The host template: one attribute-selector timeline with every input bound. */
const TEMPLATE = `<div mol-video-timeline [tracks]="p['tracks']" [currentTime]="p['currentTime']" [duration]="p['duration']" [mode]="p['mode']"></div>`

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the timeline through a JIT host template.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountHost(props: VideoTimelineProps): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The mounted hosts of the current test, destroyed in `afterEach`. */
const mounted: Mounted[] = []

/**
 * Mounts a `VideoTimeline` with the given props.
 *
 * @param props - Component props.
 * @returns The host element.
 */
const render = async (props: VideoTimelineProps): Promise<HTMLElement> => {
  const m = await mountHost(props)
  mounted.push(m)
  return m.host
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('<VideoTimeline> literal locale keys', () => {
  it('renders every track kind name through its literal locale key', async () => {
    const container = await render({ tracks, currentTime: 0, duration: 60 })
    const names = container.querySelectorAll('[data-mol-id="track-lane-name"]')
    expect(Array.from(names).map((el) => el.textContent?.trim())).toEqual(
      TRACK_KINDS.map((kind) => `«videoTimeline.trackKind.${kind}»`),
    )
    for (const kind of TRACK_KINDS) {
      const lane = container.querySelector(`[data-track-kind="${kind}"]`)
      expect(
        lane?.querySelector('[data-mol-id="track-lane-name"]')?.textContent?.trim(),
        `track kind ${kind} label`,
      ).toBe(`«videoTimeline.trackKind.${kind}»`)
    }
  })

  it('renders the ripple mode label through its literal locale key', async () => {
    const container = await render({ tracks: [], currentTime: 0, duration: 60, mode: 'ripple' })
    expect(
      container.querySelector('[data-mol-id="video-timeline-mode"]')?.textContent?.trim(),
    ).toBe('«videoTimeline.aria.mode»«videoTimeline.mode.ripple»')
  })

  it('renders the insert mode label through its literal locale key', async () => {
    const container = await render({ tracks: [], currentTime: 0, duration: 60, mode: 'insert' })
    expect(
      container.querySelector('[data-mol-id="video-timeline-mode"]')?.textContent?.trim(),
    ).toBe('«videoTimeline.aria.mode»«videoTimeline.mode.insert»')
  })

  it('renders chrome labels through literal locale keys', async () => {
    const container = await render({ tracks, currentTime: 0, duration: 60 })
    expect(
      container.querySelector('[data-mol-id="video-timeline-zoom-in"]')?.getAttribute('aria-label'),
    ).toBe('«videoTimeline.zoom.in»')
    expect(
      container
        .querySelector('[data-mol-id="video-timeline-zoom-out"]')
        ?.getAttribute('aria-label'),
    ).toBe('«videoTimeline.zoom.out»')
    expect(
      container
        .querySelector('[data-mol-id="video-timeline-zoom-slider"]')
        ?.getAttribute('aria-label'),
    ).toBe('«videoTimeline.aria.zoom»')
    expect(
      container.querySelector('[data-mol-id="video-timeline-ruler"]')?.getAttribute('aria-label'),
    ).toBe('«videoTimeline.aria.ruler»')
    // The playhead time is the ruler slider's value text; the playhead line
    // itself is decorative and the mode span carries no aria-label.
    expect(
      container
        .querySelector('[data-mol-id="video-timeline-ruler"]')
        ?.getAttribute('aria-valuetext'),
    ).toBe('«videoTimeline.aria.playhead»')
    expect(
      container
        .querySelector('[data-mol-id="video-timeline-playhead"]')
        ?.getAttribute('aria-label'),
    ).toBeNull()
    expect(
      container
        .querySelector('[data-mol-id="video-timeline-playhead"]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true')
    expect(
      container.querySelector('[data-mol-id="video-timeline-mode"]')?.getAttribute('aria-label'),
    ).toBeNull()
    expect(
      container.querySelector('[data-mol-id="video-timeline-mode"]')?.textContent?.trim(),
    ).toBe('«videoTimeline.aria.mode»«videoTimeline.mode.ripple»')
    expect(
      container.querySelector('[data-mol-id="video-timeline"]')?.getAttribute('aria-label'),
    ).toBe('«videoTimeline.aria.root»')
  })

  it('keeps an explicit track name over the kind key', async () => {
    const container = await render({
      tracks: [{ id: 't1', kind: 'audio', clips: [], name: 'Voiceover' }],
      currentTime: 0,
      duration: 60,
    })
    expect(container.querySelector('[data-mol-id="track-lane-name"]')?.textContent?.trim()).toBe(
      'Voiceover',
    )
  })
})
