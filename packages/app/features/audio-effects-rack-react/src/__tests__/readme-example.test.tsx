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

import { AudioEffectsRack, type Effect, type EffectChangePatch } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered effects rack bound to local state.
 */
function TrackEffects(): React.JSX.Element {
  const [effects, setEffects] = useState<Effect[]>([
    { id: 'eq-1', kind: 'eq', enabled: true, params: { low: 2, mid: 0, high: -1 } },
    { id: 'rev-1', kind: 'reverb', enabled: true, params: { mix: 0.4, decay: 3 } },
  ])
  const applyPatch = (patch: EffectChangePatch): void =>
    setEffects((list) =>
      list.map((fx) => {
        if (fx.id !== patch.id) return fx
        if (patch.enabled !== undefined) return { ...fx, enabled: patch.enabled }
        if (patch.paramId && patch.paramValue !== undefined) {
          return { ...fx, params: { ...fx.params, [patch.paramId]: patch.paramValue } }
        }
        return fx
      }),
    )
  return (
    <AudioEffectsRack
      effects={effects}
      onChange={applyPatch}
      onReorder={setEffects}
      onAdd={(kind) =>
        setEffects((list) => [
          ...list,
          { id: `${kind}-${Date.now()}`, kind, enabled: true, params: {} },
        ])
      }
      onRemove={(id) => setEffects((list) => list.filter((fx) => fx.id !== id))}
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

  it('renders one panel per effect and applies bypass, param, add and remove to state', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <TrackEffects />
      </I18nProvider>,
    )
    const panels = (): HTMLElement[] =>
      Array.from(
        view.container.querySelectorAll<HTMLElement>('[data-mol-id="audio-effects-rack-panel"]'),
      )
    expect(panels().map((p) => p.dataset.effectKind)).toEqual(['eq', 'reverb'])

    const eq = panels()[0] as HTMLElement
    fireEvent.click(eq.querySelector('[data-mol-id="audio-effects-rack-bypass"]') as Element)
    expect(panels()[0]?.dataset.enabled).toBe('false')

    const low = eq.querySelector('input[data-param-id="low"]') as HTMLInputElement
    expect(low.value).toBe('2')
    fireEvent.change(low, { target: { value: '6' } })
    expect(
      (panels()[0]?.querySelector('input[data-param-id="low"]') as HTMLInputElement).value,
    ).toBe('6')

    const add = view.getByRole('combobox', { name: 'Add effect' })
    fireEvent.change(add, { target: { value: 'delay' } })
    expect(panels().map((p) => p.dataset.effectKind)).toEqual(['eq', 'reverb', 'delay'])
    const delayTime = panels()[2]?.querySelector('input[data-param-id="time"]') as HTMLInputElement
    expect(delayTime.value).toBe('0.25')

    fireEvent.click(
      panels()[1]?.querySelector('[data-mol-id="audio-effects-rack-remove"]') as Element,
    )
    expect(panels().map((p) => p.dataset.effectKind)).toEqual(['eq', 'delay'])
  })
})
