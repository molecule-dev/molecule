// @vitest-environment jsdom

import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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
} from '../index.js'
import type { AudioMixerProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
        if (prop === 'sp') return () => ({})
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

/** Disposers of the roots mounted by {@link renderMixer}, run after each test. */
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Renders an {@link AudioMixer} and returns the container.
 *
 * @param props - The mixer's props.
 * @returns The container element.
 */
function renderMixer(props: AudioMixerProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <AudioMixer {...props} />, container))
  return container
}

/**
 * Sets a range input's value and dispatches the native `input` + `change`
 * events a user drag would send.
 *
 * @param input - The input element.
 * @param value - The new value string.
 */
function typeValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
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
    const container = renderMixer({ channels: baseChannels })
    const strips = container.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]')
    expect(strips.length).toBe(3)
    const names = Array.from(
      container.querySelectorAll('[data-mol-id="audio-mixer-channel-name"]'),
    ).map((el) => el.textContent?.trim())
    expect(names.slice(0, 3)).toEqual(['Drums', 'Bass', 'Vox'])
  })

  it('exposes the console aria-label from the locale bond', () => {
    const container = renderMixer({ channels: baseChannels })
    const root = container.querySelector('[data-mol-id="audio-mixer"]')
    expect(root?.getAttribute('aria-label')).toBeTruthy()
  })

  it('renders an empty mixer when channels is []', () => {
    const container = renderMixer({ channels: [] })
    expect(container.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]').length).toBe(0)
  })

  it('renders the mute button initial through t()', () => {
    // A marker per key: a letter that bypassed t() would show as plain 'M'.
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', {
      audioMixer: { button: { muteInitial: '«audioMixer.button.muteInitial»' } },
    })
    setProvider(provider)
    const container = renderMixer({ channels: [baseChannels[0]] })
    const mute = container.querySelector('[data-mol-id="audio-mixer-mute"]')
    expect(mute?.textContent?.trim()).toBe('«audioMixer.button.muteInitial»')
  })

  it('renders the solo button initial through t()', () => {
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', {
      audioMixer: { button: { soloInitial: '«audioMixer.button.soloInitial»' } },
    })
    setProvider(provider)
    const container = renderMixer({ channels: [baseChannels[0]] })
    const solo = container.querySelector('[data-mol-id="audio-mixer-solo"]')
    expect(solo?.textContent?.trim()).toBe('«audioMixer.button.soloInitial»')
  })

  it('emits onChannelChange with a level patch when the fader moves', () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const container = renderMixer({ channels: baseChannels, onChannelChange })
    const fader = container.querySelectorAll<HTMLInputElement>(
      '[data-mol-id="audio-mixer-fader"]',
    )[0]!
    typeValue(fader, '0.42')
    expect(onChannelChange).toHaveBeenCalledTimes(1)
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'drums', level: 0.42 })
  })

  it('clamps fader values to [0, 1] before emitting', () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const container = renderMixer({ channels: baseChannels, onChannelChange })
    const fader = container.querySelectorAll<HTMLInputElement>(
      '[data-mol-id="audio-mixer-fader"]',
    )[1]!
    // Native range inputs already clamp via min/max, but the handler
    // applies clampLevel defensively — bypass the DOM clamp via JS:
    typeValue(fader, '7')
    const last = onChannelChange.mock.calls[onChannelChange.mock.calls.length - 1]![0]
    expect(last.id).toBe('bass')
    expect(last.level).toBeLessThanOrEqual(MAX_LEVEL)
    expect(last.level).toBeGreaterThanOrEqual(MIN_LEVEL)
  })

  it('emits onChannelChange with a pan patch when the pan knob moves', () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const container = renderMixer({ channels: baseChannels, onChannelChange })
    const pan = container.querySelectorAll<HTMLInputElement>('[data-mol-id="audio-mixer-pan"]')[1]!
    typeValue(pan, '0.5')
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'bass', pan: 0.5 })
  })

  it('toggles mute on click and emits the new state', () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const container = renderMixer({ channels: baseChannels, onChannelChange })
    const muteButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-mixer-mute"]',
    )
    // drums is currently un-muted -> click should emit muted=true
    muteButtons[0]!.click()
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'drums', muted: true })
    // vox is currently muted -> click should emit muted=false
    muteButtons[2]!.click()
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'vox', muted: false })
  })

  it('reflects mute state via aria-pressed and data-muted', () => {
    const container = renderMixer({ channels: baseChannels })
    const muteButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-mixer-mute"]',
    )
    expect(muteButtons[0]!.getAttribute('aria-pressed')).toBe('false')
    expect(muteButtons[2]!.getAttribute('aria-pressed')).toBe('true')
    const strips = container.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]')
    expect(strips[0]!.getAttribute('data-muted')).toBe('false')
    expect(strips[2]!.getAttribute('data-muted')).toBe('true')
  })

  it('toggles solo on click and emits the new state', () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const container = renderMixer({ channels: baseChannels, onChannelChange })
    const soloButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-mixer-solo"]',
    )
    soloButtons[1]!.click()
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'bass', solo: true })
  })

  it('renders a sends row for channels with sends and emits send patches', () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const container = renderMixer({ channels: baseChannels, onChannelChange })
    const sendsRows = container.querySelectorAll('[data-mol-id="audio-mixer-sends"]')
    // Only drums has sends in baseChannels
    expect(sendsRows.length).toBe(1)
    const sendFaders = container.querySelectorAll<HTMLInputElement>(
      '[data-mol-id="audio-mixer-send-fader"]',
    )
    expect(sendFaders.length).toBe(2)
    typeValue(sendFaders[0]!, '0.6')
    expect(onChannelChange).toHaveBeenCalledWith({
      id: 'drums',
      sendId: 'reverb',
      sendLevel: 0.6,
    })
  })

  it('omits the sends row when a channel has no sends', () => {
    const container = renderMixer({ channels: [baseChannels[1]!] })
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
    const onMasterChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const container = renderMixer({ channels: baseChannels, master, onMasterChange })
    const masterStrip = container.querySelector('[data-mol-id="audio-mixer-master-strip"]')
    expect(masterStrip).not.toBeNull()
    expect(masterStrip?.getAttribute('data-channel-id')).toBe('master')
    const masterFader = container.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-mixer-master-fader"]',
    )
    expect(masterFader).not.toBeNull()
    typeValue(masterFader!, '0.55')
    expect(onMasterChange).toHaveBeenCalledWith({ id: 'master', level: 0.55 })
  })

  it('does not render the master strip when master is omitted', () => {
    const container = renderMixer({ channels: baseChannels })
    expect(container.querySelector('[data-mol-id="audio-mixer-master-strip"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="audio-mixer-master-fader"]')).toBeNull()
  })

  it('exposes channel ids via data-channel-id', () => {
    const container = renderMixer({ channels: baseChannels })
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
    const onMasterChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const container = renderMixer({ channels: baseChannels, master, onMasterChange })
    // Locate the pan input inside the master strip specifically.
    const masterStrip = container.querySelector('[data-mol-id="audio-mixer-master-strip"]')
    const masterPan = masterStrip?.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-mixer-pan"]',
    )
    expect(masterPan).not.toBeNull()
    typeValue(masterPan!, '-0.4')
    expect(onMasterChange).toHaveBeenCalledWith({ id: 'master', pan: -0.4 })
  })
})
