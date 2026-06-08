// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  AudioEffectsRack,
  type Effect,
  EFFECT_KINDS,
  EFFECT_PARAM_SCHEMAS,
  type EffectChangePatch,
  reorderEffects,
  resolveParamValue,
} from '../AudioEffectsRack.js'

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

const baseEffects: Effect[] = [
  { id: 'eq-1', kind: 'eq', enabled: true, params: { low: 2, mid: 0, high: -1 } },
  { id: 'comp-1', kind: 'compressor', enabled: false, params: { threshold: -20, ratio: 4 } },
  { id: 'rev-1', kind: 'reverb', enabled: true, params: { mix: 0.4 } },
]

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('resolveParamValue', () => {
  it('returns the effect value when present and in range', () => {
    const schema = EFFECT_PARAM_SCHEMAS.eq[0]
    const effect: Effect = { id: 'x', kind: 'eq', enabled: true, params: { [schema.id]: 5 } }
    expect(resolveParamValue(effect, schema)).toBe(5)
  })

  it('falls back to the schema default when the param is missing', () => {
    const schema = EFFECT_PARAM_SCHEMAS.eq[0]
    const effect: Effect = { id: 'x', kind: 'eq', enabled: true, params: {} }
    expect(resolveParamValue(effect, schema)).toBe(schema.default)
  })

  it('falls back to the schema default when the param is non-finite', () => {
    const schema = EFFECT_PARAM_SCHEMAS.eq[0]
    const effect: Effect = {
      id: 'x',
      kind: 'eq',
      enabled: true,
      params: { [schema.id]: Number.NaN },
    }
    expect(resolveParamValue(effect, schema)).toBe(schema.default)
  })

  it('clamps below-min values up to min', () => {
    const schema = EFFECT_PARAM_SCHEMAS.compressor[0] // threshold: min=-60
    const effect: Effect = {
      id: 'x',
      kind: 'compressor',
      enabled: true,
      params: { [schema.id]: -1000 },
    }
    expect(resolveParamValue(effect, schema)).toBe(schema.min)
  })

  it('clamps above-max values down to max', () => {
    const schema = EFFECT_PARAM_SCHEMAS.compressor[1] // ratio: max=20
    const effect: Effect = {
      id: 'x',
      kind: 'compressor',
      enabled: true,
      params: { [schema.id]: 9999 },
    }
    expect(resolveParamValue(effect, schema)).toBe(schema.max)
  })
})

describe('reorderEffects', () => {
  it('moves an effect from one index to another', () => {
    const next = reorderEffects(baseEffects, 0, 2)
    expect(next.map((e) => e.id)).toEqual(['comp-1', 'rev-1', 'eq-1'])
  })

  it('does not mutate the input array', () => {
    const before = baseEffects.map((e) => e.id)
    reorderEffects(baseEffects, 0, 2)
    expect(baseEffects.map((e) => e.id)).toEqual(before)
  })

  it('returns the same reference when from === to', () => {
    expect(reorderEffects(baseEffects, 1, 1)).toBe(baseEffects)
  })

  it('clamps out-of-range indices', () => {
    const next = reorderEffects(baseEffects, -5, 99)
    // -5 → 0, 99 → length-1 = 2, so this moves the first item to the last slot
    expect(next.map((e) => e.id)).toEqual(['comp-1', 'rev-1', 'eq-1'])
  })

  it('returns the input array on empty input', () => {
    expect(reorderEffects([], 0, 0)).toEqual([])
  })
})

describe('<AudioEffectsRack>', () => {
  it('renders one panel per effect in the input order', () => {
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} />
      </Wrap>,
    )
    const panels = container.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]')
    expect(panels.length).toBe(3)
    const ids = Array.from(panels).map((el) => el.getAttribute('data-effect-id'))
    expect(ids).toEqual(['eq-1', 'comp-1', 'rev-1'])
  })

  it('exposes the rack aria-label from the locale bond', () => {
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="audio-effects-rack"]')
    expect(root?.getAttribute('aria-label')).toBeTruthy()
  })

  it('renders the empty state when effects is []', () => {
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={[]} />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]').length).toBe(0)
    expect(container.querySelector('[data-mol-id="audio-effects-rack-empty"]')).not.toBeNull()
  })

  it('reflects each effect.enabled via aria-pressed + data-enabled', () => {
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} />
      </Wrap>,
    )
    const panels = container.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]')
    expect(panels[0].getAttribute('data-enabled')).toBe('true')
    expect(panels[1].getAttribute('data-enabled')).toBe('false')
    const bypassButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-bypass"]',
    )
    // bypass is "pressed" when the effect is bypassed (i.e. NOT enabled).
    expect(bypassButtons[0].getAttribute('aria-pressed')).toBe('false')
    expect(bypassButtons[1].getAttribute('aria-pressed')).toBe('true')
  })

  it('emits onChange with an enabled-flip patch when the bypass button is clicked', () => {
    const onChange = vi.fn<[EffectChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} onChange={onChange} />
      </Wrap>,
    )
    const bypassButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-bypass"]',
    )
    // eq-1 is currently enabled → click bypass → enabled becomes false
    fireEvent.click(bypassButtons[0])
    expect(onChange).toHaveBeenCalledWith({ id: 'eq-1', enabled: false })
    // comp-1 is currently disabled → click bypass → enabled becomes true
    fireEvent.click(bypassButtons[1])
    expect(onChange).toHaveBeenCalledWith({ id: 'comp-1', enabled: true })
  })

  it('emits onChange with a paramId/paramValue patch when a param slider moves', () => {
    const onChange = vi.fn<[EffectChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} onChange={onChange} />
      </Wrap>,
    )
    const eqPanel = container.querySelector('[data-mol-id="audio-effects-rack-panel"]')!
    const lowInput = eqPanel.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-effects-rack-param-input"][data-param-id="low"]',
    )!
    fireEvent.change(lowInput, { target: { value: '6' } })
    expect(onChange).toHaveBeenCalledWith({ id: 'eq-1', paramId: 'low', paramValue: 6 })
  })

  it('clamps param values to the schema [min, max] interval before emitting', () => {
    const onChange = vi.fn<[EffectChangePatch], void>()
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} onChange={onChange} />
      </Wrap>,
    )
    const eqPanel = container.querySelector('[data-mol-id="audio-effects-rack-panel"]')!
    const lowInput = eqPanel.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-effects-rack-param-input"][data-param-id="low"]',
    )!
    // EQ low has min=-24/max=24 — bypass the DOM clamp via JS:
    fireEvent.change(lowInput, { target: { value: '999' } })
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(last.id).toBe('eq-1')
    expect(last.paramId).toBe('low')
    expect(last.paramValue).toBeLessThanOrEqual(24)
    expect(last.paramValue).toBeGreaterThanOrEqual(-24)
  })

  it('renders one slider per param defined in the schema for each effect kind', () => {
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} />
      </Wrap>,
    )
    const panels = container.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]')
    panels.forEach((panel, i) => {
      const effect = baseEffects[i]
      const expected = EFFECT_PARAM_SCHEMAS[effect.kind].length
      const inputs = panel.querySelectorAll('[data-mol-id="audio-effects-rack-param-input"]')
      expect(inputs.length).toBe(expected)
    })
  })

  it('renders an option in the add-effect dropdown for every supported kind', () => {
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} />
      </Wrap>,
    )
    const select = container.querySelector<HTMLSelectElement>(
      '[data-mol-id="audio-effects-rack-add-select"]',
    )!
    // +1 for the disabled placeholder option
    expect(select.querySelectorAll('option').length).toBe(EFFECT_KINDS.length + 1)
    const kinds = Array.from(select.querySelectorAll<HTMLOptionElement>('option'))
      .map((o) => o.value)
      .filter((v) => v.length > 0)
    expect(kinds).toEqual(Array.from(EFFECT_KINDS))
  })

  it('emits onAdd with the chosen kind when the add-effect select changes', () => {
    const onAdd = vi.fn<[string], void>()
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} onAdd={onAdd} />
      </Wrap>,
    )
    const select = container.querySelector<HTMLSelectElement>(
      '[data-mol-id="audio-effects-rack-add-select"]',
    )!
    fireEvent.change(select, { target: { value: 'phaser' } })
    expect(onAdd).toHaveBeenCalledWith('phaser')
  })

  it('emits onRemove with the effect id when the remove button is clicked', () => {
    const onRemove = vi.fn<[string], void>()
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} onRemove={onRemove} />
      </Wrap>,
    )
    const removeButtons = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-remove"]',
    )
    fireEvent.click(removeButtons[1])
    expect(onRemove).toHaveBeenCalledWith('comp-1')
  })

  it('reorders panels via pointer drag-and-drop and emits the new order', () => {
    const onReorder = vi.fn<[Effect[]], void>()
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} onReorder={onReorder} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="audio-effects-rack"]') as HTMLElement
    const panels = container.querySelectorAll<HTMLElement>(
      '[data-mol-id="audio-effects-rack-panel"]',
    )
    const handles = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-drag-handle"]',
    )
    // Pick up panel 0 (eq-1)…
    fireEvent.pointerDown(handles[0])
    // …drag over panel 2 (rev-1)…
    fireEvent.pointerEnter(panels[2])
    // …and drop.
    fireEvent.pointerUp(root)
    expect(onReorder).toHaveBeenCalledTimes(1)
    const next = onReorder.mock.calls[0][0]
    expect(next.map((e) => e.id)).toEqual(['comp-1', 'rev-1', 'eq-1'])
  })

  it('does not call onReorder when a drag drops on its origin panel', () => {
    const onReorder = vi.fn<[Effect[]], void>()
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} onReorder={onReorder} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="audio-effects-rack"]') as HTMLElement
    const handles = container.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-drag-handle"]',
    )
    fireEvent.pointerDown(handles[1])
    fireEvent.pointerUp(root)
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('exposes effect ids and kinds via data-* attributes', () => {
    const { container } = render(
      <Wrap>
        <AudioEffectsRack effects={baseEffects} />
      </Wrap>,
    )
    const panels = container.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]')
    expect(Array.from(panels).map((p) => p.getAttribute('data-effect-id'))).toEqual([
      'eq-1',
      'comp-1',
      'rev-1',
    ])
    expect(Array.from(panels).map((p) => p.getAttribute('data-effect-kind'))).toEqual([
      'eq',
      'compressor',
      'reverb',
    ])
  })
})
