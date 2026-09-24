// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AudioMixer, type Channel, type ChannelChangePatch } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered mixer bound to local state.
 */
function MixerPanel(): React.JSX.Element {
  const [channels, setChannels] = useState<Channel[]>([
    { id: 'drums', name: 'Drums', level: 0.8, pan: -0.2, muted: false, solo: false },
    { id: 'bass', name: 'Bass', level: 0.7, pan: 0, muted: false, solo: false },
  ])
  const [master, setMaster] = useState<Channel>({
    id: 'master',
    name: 'Master',
    level: 0.9,
    pan: 0,
    muted: false,
    solo: false,
  })
  const applyPatch = (patch: ChannelChangePatch): void =>
    setChannels((list) => list.map((ch) => (ch.id === patch.id ? { ...ch, ...patch } : ch)))
  return (
    <AudioMixer
      channels={channels}
      master={master}
      onChannelChange={applyPatch}
      onMasterChange={(patch) => setMaster((m) => ({ ...m, ...patch }))}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders a strip per channel plus master and applies fader, pan and mute patches', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <MixerPanel />
      </I18nProvider>,
    )
    expect(view.getByRole('group', { name: 'Audio mixer console' })).toBeTruthy()
    expect(
      view.container.querySelectorAll('[data-mol-id="audio-mixer-channel-strip"]'),
    ).toHaveLength(2)
    expect(view.container.querySelector('[data-mol-id="audio-mixer-master-strip"]')).not.toBe(null)

    const drumsFader = view.getByRole('slider', { name: 'Drums fader' }) as HTMLInputElement
    expect(drumsFader.value).toBe('0.8')
    fireEvent.change(drumsFader, { target: { value: '0.5' } })
    expect(drumsFader.value).toBe('0.5')

    const bassPan = view.getByRole('slider', { name: 'Bass pan' }) as HTMLInputElement
    fireEvent.change(bassPan, { target: { value: '0.6' } })
    expect(bassPan.value).toBe('0.6')

    const masterFader = view.getByRole('slider', { name: 'Master fader' }) as HTMLInputElement
    fireEvent.change(masterFader, { target: { value: '0.3' } })
    expect(masterFader.value).toBe('0.3')

    const drumsStrip = view.getByRole('group', { name: 'Drums' })
    const mute = drumsStrip.querySelector('[data-mol-id="audio-mixer-mute"]') as HTMLElement
    expect(mute.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(mute)
    expect(mute.getAttribute('aria-pressed')).toBe('true')
  })
})
