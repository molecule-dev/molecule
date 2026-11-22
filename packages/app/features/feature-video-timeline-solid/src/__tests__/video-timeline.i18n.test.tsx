// @vitest-environment jsdom
/**
 * Literal locale keys for the Solid `VideoTimeline` — a port of
 * `@molecule/app-feature-video-timeline-react/src/__tests__/VideoTimeline.i18n.test.tsx`:
 * the bonded i18n provider is replaced with a marker stub, so every key renders
 * as «key» and a label built at runtime or an English default bypassing `t()`
 * shows up as plain text instead.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

/** The containers holding the apps rendered by the current test. */
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts a `VideoTimeline` and returns its container element.
 *
 * @param props - Component props.
 * @returns The container element.
 */
function renderTimeline(props: VideoTimelineProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <VideoTimeline {...props} />, container))
  return container
}

describe('<VideoTimeline> literal locale keys', () => {
  it('renders every track kind name through its literal locale key', () => {
    const container = renderTimeline({ tracks, currentTime: 0, duration: 60 })
    const names = container.querySelectorAll('[data-mol-id="track-lane-name"]')
    expect(Array.from(names).map((el) => el.textContent)).toEqual(
      TRACK_KINDS.map((kind) => `«videoTimeline.trackKind.${kind}»`),
    )
    for (const kind of TRACK_KINDS) {
      const lane = container.querySelector(`[data-track-kind="${kind}"]`)
      expect(
        lane?.querySelector('[data-mol-id="track-lane-name"]')?.textContent,
        `track kind ${kind} label`,
      ).toBe(`«videoTimeline.trackKind.${kind}»`)
    }
  })

  it('renders the ripple mode label through its literal locale key', () => {
    const container = renderTimeline({ tracks: [], currentTime: 0, duration: 60, mode: 'ripple' })
    expect(container.querySelector('[data-mol-id="video-timeline-mode"]')?.textContent).toBe(
      '«videoTimeline.aria.mode»«videoTimeline.mode.ripple»',
    )
  })

  it('renders the insert mode label through its literal locale key', () => {
    const container = renderTimeline({ tracks: [], currentTime: 0, duration: 60, mode: 'insert' })
    expect(container.querySelector('[data-mol-id="video-timeline-mode"]')?.textContent).toBe(
      '«videoTimeline.aria.mode»«videoTimeline.mode.insert»',
    )
  })

  it('renders chrome labels through literal locale keys', () => {
    const container = renderTimeline({ tracks, currentTime: 0, duration: 60 })
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
    expect(container.querySelector('[data-mol-id="video-timeline-mode"]')?.textContent).toBe(
      '«videoTimeline.aria.mode»«videoTimeline.mode.ripple»',
    )
    expect(
      container.querySelector('[data-mol-id="video-timeline"]')?.getAttribute('aria-label'),
    ).toBe('«videoTimeline.aria.root»')
  })

  it('keeps an explicit track name over the kind key', () => {
    const container = renderTimeline({
      tracks: [{ id: 't1', kind: 'audio', clips: [], name: 'Voiceover' }],
      currentTime: 0,
      duration: 60,
    })
    expect(container.querySelector('[data-mol-id="track-lane-name"]')?.textContent).toBe(
      'Voiceover',
    )
  })
})
