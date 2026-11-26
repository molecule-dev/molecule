// @vitest-environment jsdom
/**
 * Unit tests for the Vue `TransportBar` — a port of
 * `@molecule/app-feature-transport-bar-react/src/__tests__/TransportBar.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, nextTick, reactive, type VNodeChild } from 'vue'

import { TransportBar } from '../TransportBar.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** A mounted transport bar: its host element, its live props and setter. */
interface Mounted {
  /** The mount host element (the component's parent). */
  host: HTMLElement
  /** Merges props and waits for the re-render, React's `rerender`. */
  update(next: Record<string, unknown>): Promise<void>
}

/**
 * Mounts a {@link TransportBar} with the given props.
 *
 * @param props - The bar's props (callback props included).
 * @param slots - Same-named slots / the default slot for node-valued props.
 * @returns The mounted bar.
 */
const renderBar = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): Mounted => {
  const state = reactive<Record<string, unknown>>({ ...props })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TransportBar, state, slots) }))
  app.mount(host)
  return {
    host,
    update: async (next: Record<string, unknown>): Promise<void> => {
      Object.assign(state, next)
      await nextTick()
    },
  }
}

/**
 * Reads one element of the bar by its `data-mol-id`.
 *
 * @param host - The mount host.
 * @param id - The element's `data-mol-id`.
 * @returns The element, or null when React renders none.
 */
const byMolId = (host: HTMLElement, id: string): HTMLElement | null =>
  host.querySelector(`[data-mol-id="${id}"]`)

describe('<TransportBar>', () => {
  it('renders a toolbar region with translated aria-label', () => {
    const { host } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    const toolbar = host.querySelector('[role="toolbar"]')
    expect(toolbar?.getAttribute('aria-label')).toBe('Playback transport controls')
  })

  it('always renders play-toggle and stop buttons', () => {
    const { host } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    expect(byMolId(host, 'transport-bar-play-toggle')).not.toBeNull()
    expect(byMolId(host, 'transport-bar-stop')).not.toBeNull()
  })

  it('shows play label + paused state when isPlaying is false', () => {
    const { host } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    const btn = byMolId(host, 'transport-bar-play-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Play')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('paused')
  })

  it('shows pause label + playing state when isPlaying is true', () => {
    const { host } = renderBar({ isPlaying: true, onPlayToggle: () => {}, onStop: () => {} })
    const btn = byMolId(host, 'transport-bar-play-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Pause')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('playing')
  })

  it('fires onPlayToggle when play button is clicked', () => {
    const onPlayToggle = vi.fn()
    const { host } = renderBar({ isPlaying: false, onPlayToggle, onStop: () => {} })
    byMolId(host, 'transport-bar-play-toggle')!.click()
    expect(onPlayToggle).toHaveBeenCalledTimes(1)
  })

  it('fires onStop when stop button is clicked', () => {
    const onStop = vi.fn()
    const { host } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop })
    byMolId(host, 'transport-bar-stop')!.click()
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('disables stop when canStop is false', () => {
    const { host } = renderBar({
      isPlaying: false,
      canStop: false,
      onPlayToggle: () => {},
      onStop: () => {},
    })
    const stop = byMolId(host, 'transport-bar-stop') as HTMLButtonElement
    expect(stop.disabled).toBe(true)
  })

  it('omits skip buttons when no skip handlers are provided', () => {
    const { host } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    expect(byMolId(host, 'transport-bar-skip-back')).toBeNull()
    expect(byMolId(host, 'transport-bar-skip-forward')).toBeNull()
  })

  it('renders skip buttons when handlers are provided and fires them on click', () => {
    const onSkipBack = vi.fn()
    const onSkipForward = vi.fn()
    const { host } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onSkipBack,
      onSkipForward,
    })
    const back = byMolId(host, 'transport-bar-skip-back')!
    const fwd = byMolId(host, 'transport-bar-skip-forward')!
    expect(back.getAttribute('aria-label')).toBe('Skip backward')
    expect(fwd.getAttribute('aria-label')).toBe('Skip forward')
    back.click()
    fwd.click()
    expect(onSkipBack).toHaveBeenCalledTimes(1)
    expect(onSkipForward).toHaveBeenCalledTimes(1)
  })

  it('disables skip buttons when canSkip is false', () => {
    const { host } = renderBar({
      isPlaying: false,
      canSkip: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onSkipBack: () => {},
      onSkipForward: () => {},
    })
    const back = byMolId(host, 'transport-bar-skip-back') as HTMLButtonElement
    const fwd = byMolId(host, 'transport-bar-skip-forward') as HTMLButtonElement
    expect(back.disabled).toBe(true)
    expect(fwd.disabled).toBe(true)
  })

  it('renders the record button only when onRecordToggle is provided', async () => {
    const { host, update } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
    })
    expect(byMolId(host, 'transport-bar-record-toggle')).toBeNull()
    await update({ onRecordToggle: () => {} })
    expect(byMolId(host, 'transport-bar-record-toggle')).not.toBeNull()
  })

  it('toggles record button label + state based on isRecording', async () => {
    const { host, update } = renderBar({
      isPlaying: false,
      isRecording: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onRecordToggle: () => {},
    })
    let btn = byMolId(host, 'transport-bar-record-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Record')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('idle')

    await update({ isRecording: true })
    btn = byMolId(host, 'transport-bar-record-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Stop recording')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('recording')
  })

  it('renders the loop button only when onLoopToggle is provided', async () => {
    const { host, update } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
    })
    expect(byMolId(host, 'transport-bar-loop-toggle')).toBeNull()
    await update({ onLoopToggle: () => {} })
    expect(byMolId(host, 'transport-bar-loop-toggle')).not.toBeNull()
  })

  it('toggles loop button label + state based on loop', async () => {
    const { host, update } = renderBar({
      isPlaying: false,
      loop: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onLoopToggle: () => {},
    })
    let btn = byMolId(host, 'transport-bar-loop-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Enable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('off')

    await update({ loop: true })
    btn = byMolId(host, 'transport-bar-loop-toggle')!
    expect(btn.getAttribute('aria-label')).toBe('Disable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('on')
  })

  it('fires onRecordToggle and onLoopToggle on click', () => {
    const onRecordToggle = vi.fn()
    const onLoopToggle = vi.fn()
    const { host } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
      onRecordToggle,
      onLoopToggle,
    })
    byMolId(host, 'transport-bar-record-toggle')!.click()
    byMolId(host, 'transport-bar-loop-toggle')!.click()
    expect(onRecordToggle).toHaveBeenCalledTimes(1)
    expect(onLoopToggle).toHaveBeenCalledTimes(1)
  })

  it('renders the time-display slot via the timeDisplay prop', () => {
    const { host } = renderBar({
      isPlaying: false,
      onPlayToggle: () => {},
      onStop: () => {},
      timeDisplay: h('span', { 'data-mol-id': 'custom-time' }, '0:00 / 1:23'),
    })
    const slot = byMolId(host, 'transport-bar-time-display')
    expect(slot).not.toBeNull()
    expect(slot?.querySelector('[data-mol-id="custom-time"]')?.textContent).toBe('0:00 / 1:23')
  })

  it('renders children as the time-display slot when timeDisplay is omitted', () => {
    const { host } = renderBar(
      { isPlaying: false, onPlayToggle: () => {}, onStop: () => {} },
      { default: () => [h('span', { 'data-mol-id': 'child-time' }, '0:42')] },
    )
    const slot = byMolId(host, 'transport-bar-time-display')
    expect(slot?.querySelector('[data-mol-id="child-time"]')?.textContent).toBe('0:42')
  })

  it('prefers timeDisplay over children when both are supplied', () => {
    const { host } = renderBar(
      {
        isPlaying: false,
        onPlayToggle: () => {},
        onStop: () => {},
        timeDisplay: h('span', { 'data-mol-id': 'prop-time' }, 'prop'),
      },
      { default: () => [h('span', { 'data-mol-id': 'child-time' }, 'child')] },
    )
    const slot = byMolId(host, 'transport-bar-time-display')!
    expect(slot.querySelector('[data-mol-id="prop-time"]')).not.toBeNull()
    expect(slot.querySelector('[data-mol-id="child-time"]')).toBeNull()
  })

  it('omits the time-display slot when nothing is provided', () => {
    const { host } = renderBar({ isPlaying: false, onPlayToggle: () => {}, onStop: () => {} })
    expect(byMolId(host, 'transport-bar-time-display')).toBeNull()
  })
})
