// @vitest-environment jsdom
/**
 * Unit tests for the Solid `TransportBar` — a port of
 * `@molecule/app-feature-transport-bar-react/src/__tests__/TransportBar.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
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
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createStore } from 'solid-js/store'
import { render } from 'solid-js/web'

import { TransportBar } from '../TransportBar.jsx'
import type { TransportBarProps } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** A mounted transport bar: its container and its live props store. */
interface Mounted {
  /** The mount container (the component's parent). */
  container: HTMLElement
  /** Merges props and waits for the update, React's `rerender`. */
  update(next: Partial<TransportBarProps>): void
}

/**
 * Mounts a {@link TransportBar} with the given props.
 *
 * @param props - The bar's props (callback props included).
 * @param children - A node-valued `children` slot.
 * @returns The mounted bar.
 */
const renderBar = (props: TransportBarProps, children?: JSX.Element): Mounted => {
  const [state, setState] = createStore<TransportBarProps>({ ...props })
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <TransportBar {...state}>{children}</TransportBar>, container))
  return { container, update: (next) => setState(next) }
}

/**
 * Reads one element of the bar by its `data-mol-id`.
 *
 * @param container - The mount container.
 * @param id - The element's `data-mol-id`.
 * @returns The element, or null when React renders none.
 */
const byMolId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

describe('<TransportBar>', () => {
  it('renders a toolbar region with translated aria-label', () => {
    const { container } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    const toolbar = container.querySelector('[role="toolbar"]')
    expect(toolbar?.getAttribute('aria-label')).toBe('Playback transport controls')
  })

  it('always renders play-toggle and stop buttons', () => {
    const { container } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    expect(byMolId(container, 'transport-bar-play-toggle')).not.toBeNull()
    expect(byMolId(container, 'transport-bar-stop')).not.toBeNull()
  })

  it('shows play label + paused state when isPlaying is false', () => {
    const { container } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    const btn = byMolId(container, 'transport-bar-play-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Play')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('paused')
  })

  it('shows pause label + playing state when isPlaying is true', () => {
    const { container } = renderBar({ isPlaying: true, onPlayToggle: () => {}, onStop: () => {} })
    const btn = byMolId(container, 'transport-bar-play-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Pause')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('playing')
  })

  it('fires onPlayToggle when play button is clicked', () => {
    const onPlayToggle = vi.fn()
    const { container } = renderBar({ isPlaying: false, onPlayToggle, onStop: () => {} })
    byMolId(container, 'transport-bar-play-toggle')!.click()
    expect(onPlayToggle).toHaveBeenCalledTimes(1)
  })

  it('fires onStop when stop button is clicked', () => {
    const onStop = vi.fn()
    const { container } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop })
    byMolId(container, 'transport-bar-stop')!.click()
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('disables stop when canStop is false', () => {
    const { container } = renderBar({
      isPlaying: false,
      canStop: false,
      onPlayToggle: () => {},
      onStop: () => {},
    })
    const stop = byMolId(container, 'transport-bar-stop') as HTMLButtonElement
    expect(stop.disabled).toBe(true)
  })

  it('omits skip buttons when no skip handlers are provided', () => {
    const { container } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    expect(byMolId(container, 'transport-bar-skip-back')).toBeNull()
    expect(byMolId(container, 'transport-bar-skip-forward')).toBeNull()
  })

  it('renders skip buttons when handlers are provided and fires them on click', () => {
    const onSkipBack = vi.fn()
    const onSkipForward = vi.fn()
    const { container } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onSkipBack,
      onSkipForward,
    })
    const back = byMolId(container, 'transport-bar-skip-back')!
    const fwd = byMolId(container, 'transport-bar-skip-forward')!
    expect(back.getAttribute('aria-label')).toBe('Skip backward')
    expect(fwd.getAttribute('aria-label')).toBe('Skip forward')
    back.click()
    fwd.click()
    expect(onSkipBack).toHaveBeenCalledTimes(1)
    expect(onSkipForward).toHaveBeenCalledTimes(1)
  })

  it('disables skip buttons when canSkip is false', () => {
    const { container } = renderBar({
      isPlaying: false,
      canSkip: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onSkipBack: () => {},
      onSkipForward: () => {},
    })
    const back = byMolId(container, 'transport-bar-skip-back') as HTMLButtonElement
    const fwd = byMolId(container, 'transport-bar-skip-forward') as HTMLButtonElement
    expect(back.disabled).toBe(true)
    expect(fwd.disabled).toBe(true)
  })

  it('renders the record button only when onRecordToggle is provided', () => {
    const { container, update } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
    })
    expect(byMolId(container, 'transport-bar-record-toggle')).toBeNull()
    update({ onRecordToggle: () => {} })
    expect(byMolId(container, 'transport-bar-record-toggle')).not.toBeNull()
  })

  it('toggles record button label + state based on isRecording', () => {
    const { container, update } = renderBar({
      isPlaying: false,
      isRecording: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onRecordToggle: () => {},
    })
    let btn = byMolId(container, 'transport-bar-record-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Record')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('idle')

    update({ isRecording: true })
    btn = byMolId(container, 'transport-bar-record-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Stop recording')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('recording')
  })

  it('renders the loop button only when onLoopToggle is provided', () => {
    const { container, update } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
    })
    expect(byMolId(container, 'transport-bar-loop-toggle')).toBeNull()
    update({ onLoopToggle: () => {} })
    expect(byMolId(container, 'transport-bar-loop-toggle')).not.toBeNull()
  })

  it('toggles loop button label + state based on loop', () => {
    const { container, update } = renderBar({
      isPlaying: false,
      loop: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onLoopToggle: () => {},
    })
    let btn = byMolId(container, 'transport-bar-loop-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Enable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('off')

    update({ loop: true })
    btn = byMolId(container, 'transport-bar-loop-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Disable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('on')
  })

  it('fires onRecordToggle and onLoopToggle on click', () => {
    const onRecordToggle = vi.fn()
    const onLoopToggle = vi.fn()
    const { container } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onRecordToggle,
      onLoopToggle,
    })
    byMolId(container, 'transport-bar-record-toggle')!.click()
    byMolId(container, 'transport-bar-loop-toggle')!.click()
    expect(onRecordToggle).toHaveBeenCalledTimes(1)
    expect(onLoopToggle).toHaveBeenCalledTimes(1)
  })

  it('renders the time-display slot via the timeDisplay prop', () => {
    const { container } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
      timeDisplay: <span data-mol-id="custom-time">0:00 / 1:23</span>,
    })
    const slot = byMolId(container, 'transport-bar-time-display')
    expect(slot).not.toBeNull()
    expect(slot?.querySelector('[data-mol-id="custom-time"]')?.textContent).toBe('0:00 / 1:23')
  })

  it('renders children as the time-display slot when timeDisplay is omitted', () => {
    const { container } = renderBar(
      { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
      <span data-mol-id="child-time">0:42</span>,
    )
    const slot = byMolId(container, 'transport-bar-time-display')
    expect(slot?.querySelector('[data-mol-id="child-time"]')?.textContent).toBe('0:42')
  })

  it('prefers timeDisplay over children when both are supplied', () => {
    const { container } = renderBar(
      {
        isPlaying: false,
        onPlayToggle: () => {},
        onStop: () => {},
        timeDisplay: <span data-mol-id="prop-time">prop</span>,
      },
      <span data-mol-id="child-time">child</span>,
    )
    const slot = byMolId(container, 'transport-bar-time-display')!
    expect(slot.querySelector('[data-mol-id="prop-time"]')).not.toBeNull()
    expect(slot.querySelector('[data-mol-id="child-time"]')).toBeNull()
  })

  it('omits the time-display slot when nothing is provided', () => {
    const { container } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    expect(byMolId(container, 'transport-bar-time-display')).toBeNull()
  })
})
