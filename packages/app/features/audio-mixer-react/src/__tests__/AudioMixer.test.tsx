// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  AudioMixer,
  type Channel,
  type ChannelChangePatch,
  clampLevel,
  clampPan,
  MAX_LEVEL,
  MAX_PAN,
  MIN_LEVEL,
  MIN_PAN,
} from '../AudioMixer.js'

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
      const fn = (..._args: unknown[]): string => token
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

const baseChannels: Channel[] = [
  {
    id: 'drums',
    name: 'Drums',
    level: 0.8,
    pan: -0.25,
    muted: false,
    solo: false,
    sends: [
      { id: 'reverb', label: 'Rev', level: 0.4 },
      { id: 'delay', label: 'Dly', level: 0.2 },
    ],
  },
  { id: 'bass', name: 'Bass', level: 0.7, pan: 0, muted: false, solo: false },
  { id: 'vox', name: 'Vox', level: 0.5, pan: 0.3, muted: true, solo: false },
]

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('clampLevel', () => {
  it('returns the input when in range', () => {
    expect(clampLevel(0)).toBe(MIN_LEVEL)
    expect(clampLevel(0.5)).toBe(0.5)
    expect(clampLevel(1)).toBe(MAX_LEVEL)
  })

  it('clamps out-of-range values to the closed [0, 1] interval', () => {
    expect(clampLevel(-0.5)).toBe(MIN_LEVEL)
    expect(clampLevel(1.7)).toBe(MAX_LEVEL)
  })

  it('returns 0 for non-finite input', () => {
    expect(clampLevel(Number.NaN)).toBe(MIN_LEVEL)
    expect(clampLevel(Number.POSITIVE_INFINITY)).toBe(MIN_LEVEL)
    expect(clampLevel(Number.NEGATIVE_INFINITY)).toBe(MIN_LEVEL)
  })
})

describe('clampPan', () => {
  it('returns the input when in range', () => {
    expect(clampPan(-1)).toBe(MIN_PAN)
    expect(clampPan(0)).toBe(0)
    expect(clampPan(1)).toBe(MAX_PAN)
  })

  it('clamps out-of-range values to the closed [-1, 1] interval', () => {
    expect(clampPan(-2.5)).toBe(MIN_PAN)
    expect(clampPan(3)).toBe(MAX_PAN)
  })

  it('returns 0 for non-finite input', () => {
    expect(clampPan(Number.NaN)).toBe(0)
    expect(clampPan(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('<AudioMixer>', () => {
  it('renders one channel strip per channel', () => {
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} />
      </Wrap>,
    )
    const strips = container.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]')
    expect(strips.length).toBe(3)
    const names = Array.from(
      container.querySelectorAll('[data-mol-id="audio-mixer-channel-name"]'),
    ).map((el) => el.textContent?.trim())
    expect(names.slice(0, 3)).toEqual(['Drums', 'Bass', 'Vox'])
  })

  it('exposes the console aria-label from the locale bond', () => {
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="audio-mixer"]')
    expect(root?.getAttribute('aria-label')).toBeTruthy()
  })

  it('renders an empty mixer when channels is []', () => {
    const { container } = render(
      <Wrap>
        <AudioMixer channels={[]} />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]').length).toBe(0)
  })

  it('emits onChannelChange with a level patch when the fader moves', () => {
    const onChannelChange = vi.fn<[ChannelChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} onChannelChange={onChannelChange} />
      </Wrap>,
    )
    const fader = container.querySelectorAll<HTMLInputElement>(
      '[data-mol-id="audio-mixer-fader"]',
    )[0]
    fireEvent.change(fader, { target: { value: '0.42' } })
    expect(onChannelChange).toHaveBeenCalledTimes(1)
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'drums', level: 0.42 })
  })

  it('clamps fader values to [0, 1] before emitting', () => {
    const onChannelChange = vi.fn<[ChannelChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} onChannelChange={onChannelChange} />
      </Wrap>,
    )
    const fader = container.querySelectorAll<HTMLInputElement>(
      '[data-mol-id="audio-mixer-fader"]',
    )[1]
    // Native range inputs already clamp via min/max, but the handler
    // applies clampLevel defensively — bypass the DOM clamp via JS:
    fireEvent.change(fader, { target: { value: '7' } })
    const last = onChannelChange.mock.calls[onChannelChange.mock.calls.length - 1][0]
    expect(last.id).toBe('bass')
    expect(last.level).toBeLessThanOrEqual(MAX_LEVEL)
    expect(last.level).toBeGreaterThanOrEqual(MIN_LEVEL)
  })

  it('emits onChannelChange with a pan patch when the pan knob moves', () => {
    const onChannelChange = vi.fn<[ChannelChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} onChannelChange={onChannelChange} />
      </Wrap>,
    )
    const pan = container.querySelectorAll<HTMLInputElement>('[data-mol-id="audio-mixer-pan"]')[1]
    fireEvent.change(pan, { target: { value: '0.5' } })
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'bass', pan: 0.5 })
  })

  it('toggles mute on click and emits the new state', () => {
    const onChannelChange = vi.fn<[ChannelChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} onChannelChange={onChannelChange} />
      </Wrap>,
    )
    const muteButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-mixer-mute"]',
    )
    // drums is currently un-muted -> click should emit muted=true
    fireEvent.click(muteButtons[0])
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'drums', muted: true })
    // vox is currently muted -> click should emit muted=false
    fireEvent.click(muteButtons[2])
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'vox', muted: false })
  })

  it('reflects mute state via aria-pressed and data-muted', () => {
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} />
      </Wrap>,
    )
    const muteButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-mixer-mute"]',
    )
    expect(muteButtons[0].getAttribute('aria-pressed')).toBe('false')
    expect(muteButtons[2].getAttribute('aria-pressed')).toBe('true')
    const strips = container.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]')
    expect(strips[0].getAttribute('data-muted')).toBe('false')
    expect(strips[2].getAttribute('data-muted')).toBe('true')
  })

  it('toggles solo on click and emits the new state', () => {
    const onChannelChange = vi.fn<[ChannelChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} onChannelChange={onChannelChange} />
      </Wrap>,
    )
    const soloButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-mixer-solo"]',
    )
    fireEvent.click(soloButtons[1])
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'bass', solo: true })
  })

  it('renders a sends row for channels with sends and emits send patches', () => {
    const onChannelChange = vi.fn<[ChannelChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} onChannelChange={onChannelChange} />
      </Wrap>,
    )
    const sendsRows = container.querySelectorAll('[data-mol-id="audio-mixer-sends"]')
    // Only drums has sends in baseChannels
    expect(sendsRows.length).toBe(1)
    const sendFaders = container.querySelectorAll<HTMLInputElement>(
      '[data-mol-id="audio-mixer-send-fader"]',
    )
    expect(sendFaders.length).toBe(2)
    fireEvent.change(sendFaders[0], { target: { value: '0.6' } })
    expect(onChannelChange).toHaveBeenCalledWith({
      id: 'drums',
      sendId: 'reverb',
      sendLevel: 0.6,
    })
  })

  it('omits the sends row when a channel has no sends', () => {
    const { container } = render(
      <Wrap>
        <AudioMixer channels={[baseChannels[1]]} />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id="audio-mixer-sends"]').length).toBe(0)
  })

  it('renders the master channel column when master is supplied', () => {
    const master: Channel = {
      id: 'master',
      name: 'Master',
      level: 0.9,
      pan: 0,
      muted: false,
      solo: false,
    }
    const onMasterChange = vi.fn<[ChannelChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} master={master} onMasterChange={onMasterChange} />
      </Wrap>,
    )
    const masterStrip = container.querySelector('[data-mol-id="audio-mixer-master-strip"]')
    expect(masterStrip).not.toBeNull()
    expect(masterStrip?.getAttribute('data-channel-id')).toBe('master')
    const masterFader = container.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-mixer-master-fader"]',
    )
    expect(masterFader).not.toBeNull()
    fireEvent.change(masterFader as HTMLInputElement, { target: { value: '0.55' } })
    expect(onMasterChange).toHaveBeenCalledWith({ id: 'master', level: 0.55 })
  })

  it('does not render the master strip when master is omitted', () => {
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="audio-mixer-master-strip"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="audio-mixer-master-fader"]')).toBeNull()
  })

  it('exposes channel ids via data-channel-id', () => {
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} />
      </Wrap>,
    )
    const ids = Array.from(
      container.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]'),
    ).map((el) => el.getAttribute('data-channel-id'))
    expect(ids).toEqual(['drums', 'bass', 'vox'])
  })

  it('forwards pan changes from the master strip to onMasterChange', () => {
    const master: Channel = {
      id: 'master',
      name: 'Master',
      level: 0.9,
      pan: 0,
      muted: false,
      solo: false,
    }
    const onMasterChange = vi.fn<[ChannelChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioMixer channels={baseChannels} master={master} onMasterChange={onMasterChange} />
      </Wrap>,
    )
    // Locate the pan input inside the master strip specifically.
    const masterStrip = container.querySelector('[data-mol-id="audio-mixer-master-strip"]')
    const masterPan = masterStrip?.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-mixer-pan"]',
    )
    expect(masterPan).not.toBeNull()
    fireEvent.change(masterPan as HTMLInputElement, { target: { value: '-0.4' } })
    expect(onMasterChange).toHaveBeenCalledWith({ id: 'master', pan: -0.4 })
  })
})
