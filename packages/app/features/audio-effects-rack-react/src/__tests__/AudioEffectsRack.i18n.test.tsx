// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  AudioEffectsRack,
  type Effect,
  EFFECT_KINDS,
  EFFECT_PARAM_SCHEMAS,
} from '../AudioEffectsRack.js'

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() — or a key built at runtime — would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const effects: Effect[] = EFFECT_KINDS.map((kind) => ({
  id: `f-${kind}`,
  kind,
  enabled: true,
  params: {},
}))

describe('<AudioEffectsRack> literal locale keys', () => {
  it('renders every effect kind label through its literal locale key', () => {
    const { container } = render(<AudioEffectsRack effects={effects} />)
    const titles = container.querySelectorAll('[data-mol-id="audio-effects-rack-panel-title"]')
    expect(Array.from(titles).map((el) => el.textContent)).toEqual(
      EFFECT_KINDS.map((kind) => `«audioEffectsRack.kind.${kind}»`),
    )
    const options = Array.from(
      container.querySelectorAll<HTMLOptionElement>(
        '[data-mol-id="audio-effects-rack-add-select"] option',
      ),
    ).filter((o) => o.value.length > 0)
    expect(options.map((o) => o.textContent)).toEqual(
      EFFECT_KINDS.map((kind) => `«audioEffectsRack.kind.${kind}»`),
    )
  })

  it('renders every built-in param label through its literal locale key', () => {
    for (const kind of EFFECT_KINDS) {
      const { container, unmount } = render(
        <AudioEffectsRack effects={[{ id: 'f', kind, enabled: true, params: {} }]} />,
      )
      for (const schema of EFFECT_PARAM_SCHEMAS[kind]) {
        const expected = `«audioEffectsRack.param.${kind}.${schema.id}»`
        const label = container.querySelector(
          `[data-mol-id="audio-effects-rack-param"][data-param-id="${schema.id}"] > span`,
        )
        const input = container.querySelector<HTMLInputElement>(
          `[data-mol-id="audio-effects-rack-param-input"][data-param-id="${schema.id}"]`,
        )
        expect(label?.textContent, `${kind}.${schema.id} label`).toBe(expected)
        expect(input?.getAttribute('aria-label'), `${kind}.${schema.id} aria-label`).toBe(expected)
      }
      unmount()
    }
  })

  it('renders the rack chrome through literal locale keys', () => {
    const { container } = render(<AudioEffectsRack effects={effects.slice(0, 1)} />)
    const root = container.querySelector('[data-mol-id="audio-effects-rack"]')
    expect(root?.getAttribute('aria-label')).toBe('«audioEffectsRack.aria.rack»')
    expect(container.querySelector('[data-mol-id="audio-effects-rack-title"]')?.textContent).toBe(
      '«audioEffectsRack.aria.rack»',
    )
    expect(
      container.querySelector('[data-mol-id="audio-effects-rack-add"] span')?.textContent,
    ).toBe('«audioEffectsRack.button.add»')
    const select = container.querySelector<HTMLSelectElement>(
      '[data-mol-id="audio-effects-rack-add-select"]',
    )
    expect(select?.getAttribute('aria-label')).toBe('«audioEffectsRack.button.add»')
    expect(
      container.querySelector('[data-mol-id="audio-effects-rack-add-select"] option')?.textContent,
    ).toBe('«audioEffectsRack.button.addPlaceholder»')
    expect(
      container
        .querySelector('[data-mol-id="audio-effects-rack-drag-handle"]')
        ?.getAttribute('aria-label'),
    ).toBe('«audioEffectsRack.aria.dragHandle»')
    expect(
      container
        .querySelector('[data-mol-id="audio-effects-rack-bypass"]')
        ?.getAttribute('aria-label'),
    ).toBe('«audioEffectsRack.button.bypass»')
    expect(
      container
        .querySelector('[data-mol-id="audio-effects-rack-remove"]')
        ?.getAttribute('aria-label'),
    ).toBe('«audioEffectsRack.button.remove»')
  })

  it('renders the empty state through its literal locale key', () => {
    const { container } = render(<AudioEffectsRack effects={[]} />)
    expect(container.querySelector('[data-mol-id="audio-effects-rack-empty"]')?.textContent).toBe(
      '«audioEffectsRack.empty»',
    )
  })
})
