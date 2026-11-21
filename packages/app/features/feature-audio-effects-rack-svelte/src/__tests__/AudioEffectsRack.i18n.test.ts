// @vitest-environment jsdom
/**
 * Locale-key coverage for the Svelte `<AudioEffectsRack>` — a port of
 * `@molecule/app-feature-audio-effects-rack-react/src/__tests__/AudioEffectsRack.i18n.test.tsx`:
 * the same test names and assertions. Every label is rendered from a marked
 * translation, so a default that bypassed `t()` — or a key built at runtime —
 * shows up as plain English.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { describe, expect, it, vi } from 'vitest'

// Translations the bonded i18n provider would supply: each key maps to a marked string.
vi.mock('@molecule/app-svelte', () => ({
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

import AudioEffectsRack from '../AudioEffectsRack.svelte'
import type { AudioEffectsRackProps, Effect } from '../types.js'
import { EFFECT_KINDS, EFFECT_PARAM_SCHEMAS } from '../utilities.js'

/**
 * Mounts an `<AudioEffectsRack>` with the given props.
 *
 * @param props - The rack's props.
 * @returns The host container and an unmount hook.
 */
function renderRack(props: AudioEffectsRackProps): { host: HTMLElement; unmount: () => void } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(AudioEffectsRack, { target: host, props })
  flushSync()
  return {
    host,
    unmount: () => {
      void unmount(instance)
      host.remove()
    },
  }
}

const effects: Effect[] = EFFECT_KINDS.map((kind) => ({
  id: `f-${kind}`,
  kind,
  enabled: true,
  params: {},
}))

describe('<AudioEffectsRack> literal locale keys', () => {
  it('renders every effect kind label through its literal locale key', () => {
    const { host, unmount: teardown } = renderRack({ effects })
    const titles = host.querySelectorAll('[data-mol-id="audio-effects-rack-panel-title"]')
    expect(Array.from(titles).map((el) => el.textContent)).toEqual(
      EFFECT_KINDS.map((kind) => `«audioEffectsRack.kind.${kind}»`),
    )
    const options = Array.from(
      host.querySelectorAll<HTMLOptionElement>(
        '[data-mol-id="audio-effects-rack-add-select"] option',
      ),
    ).filter((o) => o.value.length > 0)
    expect(options.map((o) => o.textContent)).toEqual(
      EFFECT_KINDS.map((kind) => `«audioEffectsRack.kind.${kind}»`),
    )
    teardown()
  })

  it('renders every built-in param label through its literal locale key', () => {
    for (const kind of EFFECT_KINDS) {
      const { host, unmount: teardown } = renderRack({
        effects: [{ id: 'f', kind, enabled: true, params: {} }],
      })
      for (const schema of EFFECT_PARAM_SCHEMAS[kind]) {
        const expected = `«audioEffectsRack.param.${kind}.${schema.id}»`
        const label = host.querySelector(
          `[data-mol-id="audio-effects-rack-param"][data-param-id="${schema.id}"] > span`,
        )
        const input = host.querySelector<HTMLInputElement>(
          `[data-mol-id="audio-effects-rack-param-input"][data-param-id="${schema.id}"]`,
        )
        expect(label?.textContent, `${kind}.${schema.id} label`).toBe(expected)
        expect(input?.getAttribute('aria-label'), `${kind}.${schema.id} aria-label`).toBe(expected)
      }
      teardown()
    }
  })

  it('renders the rack chrome through literal locale keys', () => {
    const { host, unmount: teardown } = renderRack({ effects: effects.slice(0, 1) })
    const root = host.querySelector('[data-mol-id="audio-effects-rack"]')
    expect(root?.getAttribute('aria-label')).toBe('«audioEffectsRack.aria.rack»')
    expect(host.querySelector('[data-mol-id="audio-effects-rack-title"]')?.textContent).toBe(
      '«audioEffectsRack.aria.rack»',
    )
    expect(host.querySelector('[data-mol-id="audio-effects-rack-add"] span')?.textContent).toBe(
      '«audioEffectsRack.button.add»',
    )
    const select = host.querySelector<HTMLSelectElement>(
      '[data-mol-id="audio-effects-rack-add-select"]',
    )
    expect(select?.getAttribute('aria-label')).toBe('«audioEffectsRack.button.add»')
    expect(
      host.querySelector('[data-mol-id="audio-effects-rack-add-select"] option')?.textContent,
    ).toBe('«audioEffectsRack.button.addPlaceholder»')
    expect(
      host
        .querySelector('[data-mol-id="audio-effects-rack-drag-handle"]')
        ?.getAttribute('aria-label'),
    ).toBe('«audioEffectsRack.aria.dragHandle»')
    expect(
      host.querySelector('[data-mol-id="audio-effects-rack-bypass"]')?.getAttribute('aria-label'),
    ).toBe('«audioEffectsRack.button.bypass»')
    expect(
      host.querySelector('[data-mol-id="audio-effects-rack-remove"]')?.getAttribute('aria-label'),
    ).toBe('«audioEffectsRack.button.remove»')
    teardown()
  })

  it('renders the empty state through its literal locale key', () => {
    const { host, unmount: teardown } = renderRack({ effects: [] })
    expect(host.querySelector('[data-mol-id="audio-effects-rack-empty"]')?.textContent).toBe(
      '«audioEffectsRack.empty»',
    )
    teardown()
  })
})
