// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { TransportBar } from '../TransportBar.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<TransportBar>', () => {
  it('renders a toolbar region with translated aria-label', () => {
    const { getByRole } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={() => {}} onStop={() => {}} />
      </Wrap>,
    )
    const toolbar = getByRole('toolbar')
    expect(toolbar.getAttribute('aria-label')).toBe('Playback transport controls')
  })

  it('always renders play-toggle and stop buttons', () => {
    const { container } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={() => {}} onStop={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="transport-bar-play-toggle"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="transport-bar-stop"]')).not.toBeNull()
  })

  it('shows play label + paused state when isPlaying is false', () => {
    const { container } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={() => {}} onStop={() => {}} />
      </Wrap>,
    )
    const btn = container.querySelector('[data-mol-id="transport-bar-play-toggle"]')!
    expect(btn.getAttribute('aria-label')).toBe('Play')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('paused')
  })

  it('shows pause label + playing state when isPlaying is true', () => {
    const { container } = render(
      <Wrap>
        <TransportBar isPlaying={true} onPlayToggle={() => {}} onStop={() => {}} />
      </Wrap>,
    )
    const btn = container.querySelector('[data-mol-id="transport-bar-play-toggle"]')!
    expect(btn.getAttribute('aria-label')).toBe('Pause')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('playing')
  })

  it('fires onPlayToggle when play button is clicked', () => {
    const onPlayToggle = vi.fn()
    const { container } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={onPlayToggle} onStop={() => {}} />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="transport-bar-play-toggle"]')!)
    expect(onPlayToggle).toHaveBeenCalledTimes(1)
  })

  it('fires onStop when stop button is clicked', () => {
    const onStop = vi.fn()
    const { container } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={() => {}} onStop={onStop} />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="transport-bar-stop"]')!)
    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('disables stop when canStop is false', () => {
    const { container } = render(
      <Wrap>
        <TransportBar isPlaying={false} canStop={false} onPlayToggle={() => {}} onStop={() => {}} />
      </Wrap>,
    )
    const stop = container.querySelector('[data-mol-id="transport-bar-stop"]') as HTMLButtonElement
    expect(stop.disabled).toBe(true)
  })

  it('omits skip buttons when no skip handlers are provided', () => {
    const { container } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={() => {}} onStop={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="transport-bar-skip-back"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="transport-bar-skip-forward"]')).toBeNull()
  })

  it('renders skip buttons when handlers are provided and fires them on click', () => {
    const onSkipBack = vi.fn()
    const onSkipForward = vi.fn()
    const { container } = render(
      <Wrap>
        <TransportBar
          isPlaying={false}
          onPlayToggle={() => {}}
          onStop={() => {}}
          onSkipBack={onSkipBack}
          onSkipForward={onSkipForward}
        />
      </Wrap>,
    )
    const back = container.querySelector('[data-mol-id="transport-bar-skip-back"]')!
    const fwd = container.querySelector('[data-mol-id="transport-bar-skip-forward"]')!
    expect(back.getAttribute('aria-label')).toBe('Skip backward')
    expect(fwd.getAttribute('aria-label')).toBe('Skip forward')
    fireEvent.click(back)
    fireEvent.click(fwd)
    expect(onSkipBack).toHaveBeenCalledTimes(1)
    expect(onSkipForward).toHaveBeenCalledTimes(1)
  })

  it('disables skip buttons when canSkip is false', () => {
    const { container } = render(
      <Wrap>
        <TransportBar
          isPlaying={false}
          canSkip={false}
          onPlayToggle={() => {}}
          onStop={() => {}}
          onSkipBack={() => {}}
          onSkipForward={() => {}}
        />
      </Wrap>,
    )
    const back = container.querySelector(
      '[data-mol-id="transport-bar-skip-back"]',
    ) as HTMLButtonElement
    const fwd = container.querySelector(
      '[data-mol-id="transport-bar-skip-forward"]',
    ) as HTMLButtonElement
    expect(back.disabled).toBe(true)
    expect(fwd.disabled).toBe(true)
  })

  it('renders the record button only when onRecordToggle is provided', () => {
    const { container, rerender } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={() => {}} onStop={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="transport-bar-record-toggle"]')).toBeNull()
    rerender(
      <Wrap>
        <TransportBar
          isPlaying={false}
          onPlayToggle={() => {}}
          onStop={() => {}}
          onRecordToggle={() => {}}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="transport-bar-record-toggle"]')).not.toBeNull()
  })

  it('toggles record button label + state based on isRecording', () => {
    const { container, rerender } = render(
      <Wrap>
        <TransportBar
          isPlaying={false}
          isRecording={false}
          onPlayToggle={() => {}}
          onStop={() => {}}
          onRecordToggle={() => {}}
        />
      </Wrap>,
    )
    let btn = container.querySelector('[data-mol-id="transport-bar-record-toggle"]')!
    expect(btn.getAttribute('aria-label')).toBe('Record')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('idle')

    rerender(
      <Wrap>
        <TransportBar
          isPlaying={false}
          isRecording={true}
          onPlayToggle={() => {}}
          onStop={() => {}}
          onRecordToggle={() => {}}
        />
      </Wrap>,
    )
    btn = container.querySelector('[data-mol-id="transport-bar-record-toggle"]')!
    expect(btn.getAttribute('aria-label')).toBe('Stop recording')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('recording')
  })

  it('renders the loop button only when onLoopToggle is provided', () => {
    const { container, rerender } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={() => {}} onStop={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="transport-bar-loop-toggle"]')).toBeNull()
    rerender(
      <Wrap>
        <TransportBar
          isPlaying={false}
          onPlayToggle={() => {}}
          onStop={() => {}}
          onLoopToggle={() => {}}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="transport-bar-loop-toggle"]')).not.toBeNull()
  })

  it('toggles loop button label + state based on loop', () => {
    const { container, rerender } = render(
      <Wrap>
        <TransportBar
          isPlaying={false}
          loop={false}
          onPlayToggle={() => {}}
          onStop={() => {}}
          onLoopToggle={() => {}}
        />
      </Wrap>,
    )
    let btn = container.querySelector('[data-mol-id="transport-bar-loop-toggle"]')!
    expect(btn.getAttribute('aria-label')).toBe('Enable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    expect(btn.getAttribute('data-state')).toBe('off')

    rerender(
      <Wrap>
        <TransportBar
          isPlaying={false}
          loop={true}
          onPlayToggle={() => {}}
          onStop={() => {}}
          onLoopToggle={() => {}}
        />
      </Wrap>,
    )
    btn = container.querySelector('[data-mol-id="transport-bar-loop-toggle"]')!
    expect(btn.getAttribute('aria-label')).toBe('Disable loop')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.getAttribute('data-state')).toBe('on')
  })

  it('fires onRecordToggle and onLoopToggle on click', () => {
    const onRecordToggle = vi.fn()
    const onLoopToggle = vi.fn()
    const { container } = render(
      <Wrap>
        <TransportBar
          isPlaying={false}
          onPlayToggle={() => {}}
          onStop={() => {}}
          onRecordToggle={onRecordToggle}
          onLoopToggle={onLoopToggle}
        />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="transport-bar-record-toggle"]')!)
    fireEvent.click(container.querySelector('[data-mol-id="transport-bar-loop-toggle"]')!)
    expect(onRecordToggle).toHaveBeenCalledTimes(1)
    expect(onLoopToggle).toHaveBeenCalledTimes(1)
  })

  it('renders the time-display slot via the timeDisplay prop', () => {
    const { container } = render(
      <Wrap>
        <TransportBar
          isPlaying={false}
          onPlayToggle={() => {}}
          onStop={() => {}}
          timeDisplay={<span data-mol-id="custom-time">0:00 / 1:23</span>}
        />
      </Wrap>,
    )
    const slot = container.querySelector('[data-mol-id="transport-bar-time-display"]')
    expect(slot).not.toBeNull()
    expect(slot?.querySelector('[data-mol-id="custom-time"]')?.textContent).toBe('0:00 / 1:23')
  })

  it('renders children as the time-display slot when timeDisplay is omitted', () => {
    const { container } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={() => {}} onStop={() => {}}>
          <span data-mol-id="child-time">0:42</span>
        </TransportBar>
      </Wrap>,
    )
    const slot = container.querySelector('[data-mol-id="transport-bar-time-display"]')
    expect(slot?.querySelector('[data-mol-id="child-time"]')?.textContent).toBe('0:42')
  })

  it('prefers timeDisplay over children when both are supplied', () => {
    const { container } = render(
      <Wrap>
        <TransportBar
          isPlaying={false}
          onPlayToggle={() => {}}
          onStop={() => {}}
          timeDisplay={<span data-mol-id="prop-time">prop</span>}
        >
          <span data-mol-id="child-time">child</span>
        </TransportBar>
      </Wrap>,
    )
    const slot = container.querySelector('[data-mol-id="transport-bar-time-display"]')!
    expect(slot.querySelector('[data-mol-id="prop-time"]')).not.toBeNull()
    expect(slot.querySelector('[data-mol-id="child-time"]')).toBeNull()
  })

  it('omits the time-display slot when nothing is provided', () => {
    const { container } = render(
      <Wrap>
        <TransportBar isPlaying={false} onPlayToggle={() => {}} onStop={() => {}} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="transport-bar-time-display"]')).toBeNull()
  })
})
