// @vitest-environment jsdom
/**
 * Accessibility of the Solid `VideoTimeline` — the same assertions as
 * `@molecule/app-feature-video-timeline-react/src/__tests__/VideoTimeline.test.tsx`
 * make on the recorded axe findings: the ruler slider announces the playhead
 * time as its `aria-valuetext` (following `currentTime` and the locale), while
 * the playhead lines are decorative and the mode label is hidden text rather
 * than a forbidden `aria-label` on a generic span.
 *
 * @module
 */

import { render } from 'solid-js/web'
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

/** The containers holding the apps rendered by the current test. */
const disposers: Array<() => void> = []

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

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts a `VideoTimeline` and returns its container.
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

/**
 * The ruler slider in a rendered timeline.
 *
 * @param container - The mounted container.
 * @returns The ruler element, or null.
 */
function rulerOf(container: HTMLElement): Element | null {
  return container.querySelector('[data-mol-id="video-timeline-ruler"]')
}

describe('<VideoTimeline> accessibility', () => {
  it('the ruler announces the playhead time as aria-valuetext', async () => {
    const early = renderTimeline({ tracks: [], currentTime: 3.2, duration: 60 })
    const later = renderTimeline({ tracks: [], currentTime: 7.5, duration: 60 })
    expect(rulerOf(early)?.getAttribute('aria-valuetext')).toBe('Playhead at 3.20s')
    // Follows currentTime.
    expect(rulerOf(later)?.getAttribute('aria-valuetext')).toBe('Playhead at 7.50s')
    // Follows the locale.
    await provider.setLocale('de')
    expect(rulerOf(later)?.getAttribute('aria-valuetext')).toBe('Abspielkopf bei 7.50s')
  })

  it('the playhead line is decorative (aria-hidden, no label)', () => {
    const container = renderTimeline({ tracks: [], currentTime: 2, duration: 60 })
    const playhead = container.querySelector('[data-mol-id="video-timeline-playhead"]')
    expect(playhead?.getAttribute('aria-hidden')).toBe('true')
    expect(playhead?.getAttribute('aria-label')).toBeNull()
    // The in-ruler marker is decorative the same way.
    const inRuler = container.querySelector('[data-mol-id="video-timeline-playhead-ruler"]')
    expect(inRuler?.getAttribute('aria-hidden')).toBe('true')
    expect(inRuler?.getAttribute('aria-label')).toBeNull()
  })

  it('the mode span reads as label + mode through hidden text', () => {
    const container = renderTimeline({ tracks: [], currentTime: 0, duration: 60 })
    const mode = container.querySelector('[data-mol-id="video-timeline-mode"]')
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
