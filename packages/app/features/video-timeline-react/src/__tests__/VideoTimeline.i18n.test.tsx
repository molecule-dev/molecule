// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Track } from '../VideoTimeline.js'
import { VideoTimeline } from '../VideoTimeline.js'

// The bonded i18n provider is replaced with a marker stub: every key renders as
// «key», so a label built at runtime (`t(`videoTimeline.trackKind.${kind}`)`)
// or an English default bypassing t() would show up as plain text instead.
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) => cls.filter((c) => typeof c === 'string' && c).join(' ')
            : () => String(prop),
      },
    ),
}))

const TRACK_KINDS = ['video', 'audio', 'subtitle'] as const

const tracks: Track[] = TRACK_KINDS.map((kind) => ({
  id: `track-${kind}`,
  kind,
  clips: [],
}))

describe('<VideoTimeline> literal locale keys', () => {
  it('renders every track kind name through its literal locale key', () => {
    const { container } = render(<VideoTimeline tracks={tracks} currentTime={0} duration={60} />)
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
    const { container, unmount } = render(
      <VideoTimeline tracks={[]} currentTime={0} duration={60} mode="ripple" />,
    )
    expect(container.querySelector('[data-mol-id="video-timeline-mode"]')?.textContent).toBe(
      '«videoTimeline.aria.mode»«videoTimeline.mode.ripple»',
    )
    unmount()
  })

  it('renders the insert mode label through its literal locale key', () => {
    const { container } = render(
      <VideoTimeline tracks={[]} currentTime={0} duration={60} mode="insert" />,
    )
    expect(container.querySelector('[data-mol-id="video-timeline-mode"]')?.textContent).toBe(
      '«videoTimeline.aria.mode»«videoTimeline.mode.insert»',
    )
  })

  it('renders chrome labels through literal locale keys', () => {
    const { container } = render(<VideoTimeline tracks={tracks} currentTime={0} duration={60} />)
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
    const { container } = render(
      <VideoTimeline
        tracks={[{ id: 't1', kind: 'audio', clips: [], name: 'Voiceover' }]}
        currentTime={0}
        duration={60}
      />,
    )
    expect(container.querySelector('[data-mol-id="track-lane-name"]')?.textContent).toBe(
      'Voiceover',
    )
  })
})
