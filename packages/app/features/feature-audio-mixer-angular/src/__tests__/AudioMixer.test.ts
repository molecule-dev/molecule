// @vitest-environment jsdom

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

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The input bindings the spec host template writes onto the component. */
const BINDINGS =
  `[channels]="p['channels']" [onChannelChange]="p['onChannelChange']" [master]="p['master']"` +
  ` [onMasterChange]="p['onMasterChange']" [faderHeight]="p['faderHeight']"` +
  ` [className]="p['className']"`

/** The mounts created by {@link render}, destroyed after each test. */
const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param template - The host template (the component element).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/**
 * Renders the mixer with the given props.
 *
 * @param props - The props object the template binds.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount(
    `<div mol-audio-mixer ${BINDINGS}></div>`,
    AudioMixer as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
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
  it('renders one channel strip per channel', async () => {
    const m = await render({ channels: baseChannels })
    const strips = m.host.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]')
    expect(strips.length).toBe(3)
    const names = Array.from(
      m.host.querySelectorAll('[data-mol-id="audio-mixer-channel-name"]'),
    ).map((el) => el.textContent?.trim())
    expect(names.slice(0, 3)).toEqual(['Drums', 'Bass', 'Vox'])
  })

  it('exposes the console aria-label from the locale bond', async () => {
    const m = await render({ channels: baseChannels })
    const root = m.host.querySelector('[data-mol-id="audio-mixer"]')
    expect(root?.getAttribute('aria-label')).toBeTruthy()
  })

  it('renders an empty mixer when channels is []', async () => {
    const m = await render({ channels: [] })
    expect(m.host.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]').length).toBe(0)
  })

  it('renders the mute button initial through t()', async () => {
    // A marker per key: a letter that bypassed t() would show as plain 'M'.
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', {
      audioMixer: { button: { muteInitial: '«audioMixer.button.muteInitial»' } },
    })
    setProvider(provider)
    const m = await render({ channels: [baseChannels[0]] })
    const mute = m.host.querySelector('[data-mol-id="audio-mixer-mute"]')
    expect(mute?.textContent?.trim()).toBe('«audioMixer.button.muteInitial»')
  })

  it('renders the solo button initial through t()', async () => {
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', {
      audioMixer: { button: { soloInitial: '«audioMixer.button.soloInitial»' } },
    })
    setProvider(provider)
    const m = await render({ channels: [baseChannels[0]] })
    const solo = m.host.querySelector('[data-mol-id="audio-mixer-solo"]')
    expect(solo?.textContent?.trim()).toBe('«audioMixer.button.soloInitial»')
  })

  it('emits onChannelChange with a level patch when the fader moves', async () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const m = await render({ channels: baseChannels, onChannelChange })
    const fader = m.host.querySelectorAll<HTMLInputElement>('[data-mol-id="audio-mixer-fader"]')[0]!
    typeValue(fader, '0.42')
    expect(onChannelChange).toHaveBeenCalledTimes(1)
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'drums', level: 0.42 })
  })

  it('clamps fader values to [0, 1] before emitting', async () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const m = await render({ channels: baseChannels, onChannelChange })
    const fader = m.host.querySelectorAll<HTMLInputElement>('[data-mol-id="audio-mixer-fader"]')[1]!
    // Native range inputs already clamp via min/max, but the handler
    // applies clampLevel defensively — bypass the DOM clamp via JS:
    typeValue(fader, '7')
    const last = onChannelChange.mock.calls[onChannelChange.mock.calls.length - 1]![0]
    expect(last.id).toBe('bass')
    expect(last.level).toBeLessThanOrEqual(MAX_LEVEL)
    expect(last.level).toBeGreaterThanOrEqual(MIN_LEVEL)
  })

  it('emits onChannelChange with a pan patch when the pan knob moves', async () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const m = await render({ channels: baseChannels, onChannelChange })
    const pan = m.host.querySelectorAll<HTMLInputElement>('[data-mol-id="audio-mixer-pan"]')[1]!
    typeValue(pan, '0.5')
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'bass', pan: 0.5 })
  })

  it('toggles mute on click and emits the new state', async () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const m = await render({ channels: baseChannels, onChannelChange })
    const muteButtons = m.host.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-mixer-mute"]',
    )
    // drums is currently un-muted -> click should emit muted=true
    muteButtons[0]!.click()
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'drums', muted: true })
    // vox is currently muted -> click should emit muted=false
    muteButtons[2]!.click()
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'vox', muted: false })
  })

  it('reflects mute state via aria-pressed and data-muted', async () => {
    const m = await render({ channels: baseChannels })
    const muteButtons = m.host.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-mixer-mute"]',
    )
    expect(muteButtons[0]!.getAttribute('aria-pressed')).toBe('false')
    expect(muteButtons[2]!.getAttribute('aria-pressed')).toBe('true')
    const strips = m.host.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]')
    expect(strips[0]!.getAttribute('data-muted')).toBe('false')
    expect(strips[2]!.getAttribute('data-muted')).toBe('true')
  })

  it('toggles solo on click and emits the new state', async () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const m = await render({ channels: baseChannels, onChannelChange })
    const soloButtons = m.host.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-mixer-solo"]',
    )
    soloButtons[1]!.click()
    expect(onChannelChange).toHaveBeenCalledWith({ id: 'bass', solo: true })
  })

  it('renders a sends row for channels with sends and emits send patches', async () => {
    const onChannelChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const m = await render({ channels: baseChannels, onChannelChange })
    const sendsRows = m.host.querySelectorAll('[data-mol-id="audio-mixer-sends"]')
    // Only drums has sends in baseChannels
    expect(sendsRows.length).toBe(1)
    const sendFaders = m.host.querySelectorAll<HTMLInputElement>(
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

  it('omits the sends row when a channel has no sends', async () => {
    const m = await render({ channels: [baseChannels[1]!] })
    expect(m.host.querySelectorAll('[data-mol-id="audio-mixer-sends"]').length).toBe(0)
  })

  it('renders the master channel column when master is supplied', async () => {
    const master: Channel = {
      id: 'master',
      name: 'Master',
      level: 0.9,
      pan: 0,
      muted: false,
      solo: false,
    }
    const onMasterChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const m = await render({ channels: baseChannels, master, onMasterChange })
    const masterStrip = m.host.querySelector('[data-mol-id="audio-mixer-master-strip"]')
    expect(masterStrip).not.toBeNull()
    expect(masterStrip?.getAttribute('data-channel-id')).toBe('master')
    const masterFader = m.host.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-mixer-master-fader"]',
    )
    expect(masterFader).not.toBeNull()
    typeValue(masterFader!, '0.55')
    expect(onMasterChange).toHaveBeenCalledWith({ id: 'master', level: 0.55 })
  })

  it('does not render the master strip when master is omitted', async () => {
    const m = await render({ channels: baseChannels })
    expect(m.host.querySelector('[data-mol-id="audio-mixer-master-strip"]')).toBeNull()
    expect(m.host.querySelector('[data-mol-id="audio-mixer-master-fader"]')).toBeNull()
  })

  it('exposes channel ids via data-channel-id', async () => {
    const m = await render({ channels: baseChannels })
    const ids = Array.from(
      m.host.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]'),
    ).map((el) => el.getAttribute('data-channel-id'))
    expect(ids).toEqual(['drums', 'bass', 'vox'])
  })

  it('forwards pan changes from the master strip to onMasterChange', async () => {
    const master: Channel = {
      id: 'master',
      name: 'Master',
      level: 0.9,
      pan: 0,
      muted: false,
      solo: false,
    }
    const onMasterChange = vi.fn<(patch: ChannelChangePatch) => void>()
    const m = await render({ channels: baseChannels, master, onMasterChange })
    // Locate the pan input inside the master strip specifically.
    const masterStrip = m.host.querySelector('[data-mol-id="audio-mixer-master-strip"]')
    const masterPan = masterStrip?.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-mixer-pan"]',
    )
    expect(masterPan).not.toBeNull()
    typeValue(masterPan!, '-0.4')
    expect(onMasterChange).toHaveBeenCalledWith({ id: 'master', pan: -0.4 })
  })
})
