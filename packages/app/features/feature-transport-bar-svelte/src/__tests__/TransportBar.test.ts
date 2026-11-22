// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `TransportBar` — a port of
 * `@molecule/app-feature-transport-bar-react/src/__tests__/TransportBar.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// The i18n mock the React tests install through `I18nProvider`: `t` resolves
// to the inline English default.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

import type { TransportBarProps } from '../types.js'

const { default: Harness } = await import('./Harness.svelte')
const { PropBag } = await import('./props.svelte.js')

/** The instances mounted in one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
})

/** A mounted transport bar: its target element and reactive props. */
interface Mounted {
  /** Where the component mounted. */
  target: HTMLElement
  /** The props the component reads; `set` re-renders it. */
  bag: InstanceType<typeof PropBag>
}

/**
 * Mounts a `TransportBar` through the test harness.
 *
 * @param initial - The bar's props.
 * @param children - A `children` slot snippet.
 * @returns The mounted bar.
 */
const renderBar = (initial: Partial<TransportBarProps> = {}, children?: Snippet): Mounted => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const bag = new PropBag(initial)
  mounted.push(mount(Harness, { target, props: { bag, children } }))
  flushSync()
  return { target, bag }
}

/**
 * Reads one element of the bar by its `data-mol-id`.
 *
 * @param target - The mount target.
 * @param id - The element's `data-mol-id`.
 * @returns The element, or null when React renders none.
 */
const byMolId = (target: HTMLElement, id: string): HTMLElement | null =>
  target.querySelector(`[data-mol-id="${id}"]`)

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

describe('<TransportBar>', () => {
  it('renders a toolbar region with translated aria-label', () => {
    const { target } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    const toolbar = target.querySelector('[role="toolbar"]')
    expect(toolbar?.getAttribute('aria-label')).toBe('Playback transport controls')
  })

  it('always renders play-toggle and stop buttons', () => {
    const { target } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    expect(byMolId(target, 'transport-bar-play-toggle')).not.toBeNull()
    expect(byMolId(target, 'transport-bar-stop')).not.toBeNull()
  })

  it('shows play label + paused state when isPlaying is false', () => {
    const { target } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    const btn = byMolId(target, 'transport-bar-play-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Play')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('paused')
  })

  it('shows pause label + playing state when isPlaying is true', () => {
    const { target } = renderBar({ isPlaying: true, onPlayToggle: () => {}, onStop: () => {} })
    const btn = byMolId(target, 'transport-bar-play-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Pause')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('playing')
  })

  it('fires onPlayToggle when play button is clicked', () => {
    const onPlayToggle = vi.fn()
    const { target } = renderBar({ isPlaying: false, onPlayToggle, onStop: () => {} })
    byMolId(target, 'transport-bar-play-toggle')!.click()
    expect(onPlayToggle).toHaveBeenCalledTimes(1)
  })

  it('fires onStop when stop button is clicked', () => {
    const onStop = vi.fn()
    const { target } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop })
    byMolId(target, 'transport-bar-stop')!.click()
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('disables stop when canStop is false', () => {
    const { target } = renderBar({
      isPlaying: false,
      canStop: false,
      onPlayToggle: () => {},
      onStop: () => {},
    })
    const stop = byMolId(target, 'transport-bar-stop') as HTMLButtonElement
    expect(stop.disabled).toBe(true)
  })

  it('omits skip buttons when no skip handlers are provided', () => {
    const { target } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    expect(byMolId(target, 'transport-bar-skip-back')).toBeNull()
    expect(byMolId(target, 'transport-bar-skip-forward')).toBeNull()
  })

  it('renders skip buttons when handlers are provided and fires them on click', () => {
    const onSkipBack = vi.fn()
    const onSkipForward = vi.fn()
    const { target } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onSkipBack,
      onSkipForward,
    })
    const back = byMolId(target, 'transport-bar-skip-back')!
    const fwd = byMolId(target, 'transport-bar-skip-forward')!
    expect(back.getAttribute('aria-label')).toBe('Skip backward')
    expect(fwd.getAttribute('aria-label')).toBe('Skip forward')
    back.click()
    fwd.click()
    expect(onSkipBack).toHaveBeenCalledTimes(1)
    expect(onSkipForward).toHaveBeenCalledTimes(1)
  })

  it('disables skip buttons when canSkip is false', () => {
    const { target } = renderBar({
      isPlaying: false,
      canSkip: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onSkipBack: () => {},
      onSkipForward: () => {},
    })
    const back = byMolId(target, 'transport-bar-skip-back') as HTMLButtonElement
    const fwd = byMolId(target, 'transport-bar-skip-forward') as HTMLButtonElement
    expect(back.disabled).toBe(true)
    expect(fwd.disabled).toBe(true)
  })

  it('renders the record button only when onRecordToggle is provided', () => {
    const { target, bag } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
    })
    expect(byMolId(target, 'transport-bar-record-toggle')).toBeNull()
    bag.set({ onRecordToggle: () => {} })
    flushSync()
    expect(byMolId(target, 'transport-bar-record-toggle')).not.toBeNull()
  })

  it('toggles record button label + state based on isRecording', () => {
    const { target, bag } = renderBar({
      isPlaying: false,
      isRecording: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onRecordToggle: () => {},
    })
    let btn = byMolId(target, 'transport-bar-record-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Record')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('idle')

    bag.set({ isRecording: true })
    flushSync()
    btn = byMolId(target, 'transport-bar-record-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Stop recording')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('recording')
  })

  it('renders the loop button only when onLoopToggle is provided', () => {
    const { target, bag } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
    })
    expect(byMolId(target, 'transport-bar-loop-toggle')).toBeNull()
    bag.set({ onLoopToggle: () => {} })
    flushSync()
    expect(byMolId(target, 'transport-bar-loop-toggle')).not.toBeNull()
  })

  it('toggles loop button label + state based on loop', () => {
    const { target, bag } = renderBar({
      isPlaying: false,
      loop: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onLoopToggle: () => {},
    })
    let btn = byMolId(target, 'transport-bar-loop-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Enable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('off')

    bag.set({ loop: true })
    flushSync()
    btn = byMolId(target, 'transport-bar-loop-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Disable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('on')
  })

  it('fires onRecordToggle and onLoopToggle on click', () => {
    const onRecordToggle = vi.fn()
    const onLoopToggle = vi.fn()
    const { target } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onRecordToggle,
      onLoopToggle,
    })
    byMolId(target, 'transport-bar-record-toggle')!.click()
    byMolId(target, 'transport-bar-loop-toggle')!.click()
    expect(onRecordToggle).toHaveBeenCalledTimes(1)
    expect(onLoopToggle).toHaveBeenCalledTimes(1)
  })

  it('renders the time-display slot via the timeDisplay prop', () => {
    const { target } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
      timeDisplay: raw('<span data-mol-id="custom-time">0:00 / 1:23</span>'),
    })
    const slot = byMolId(target, 'transport-bar-time-display')
    expect(slot).not.toBeNull()
    expect(slot?.querySelector('[data-mol-id="custom-time"]')?.textContent).toBe('0:00 / 1:23')
  })

  it('renders children as the time-display slot when timeDisplay is omitted', () => {
    const { target } = renderBar(
      { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
      raw('<span data-mol-id="child-time">0:42</span>'),
    )
    const slot = byMolId(target, 'transport-bar-time-display')
    expect(slot?.querySelector('[data-mol-id="child-time"]')?.textContent).toBe('0:42')
  })

  it('prefers timeDisplay over children when both are supplied', () => {
    const { target } = renderBar(
      {
        isPlaying: false,
        onPlayToggle: () => {},
        onStop: () => {},
        timeDisplay: raw('<span data-mol-id="prop-time">prop</span>'),
      },
      raw('<span data-mol-id="child-time">child</span>'),
    )
    const slot = byMolId(target, 'transport-bar-time-display')!
    expect(slot.querySelector('[data-mol-id="prop-time"]')).not.toBeNull()
    expect(slot.querySelector('[data-mol-id="child-time"]')).toBeNull()
  })

  it('omits the time-display slot when nothing is provided', () => {
    const { target } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    expect(byMolId(target, 'transport-bar-time-display')).toBeNull()
  })
})
