// @vitest-environment jsdom
/**
 * Unit tests for the Angular `AudioEffectsRack` and its pure helpers — a port of
 * `@molecule/app-feature-audio-effects-rack-react/src/__tests__/AudioEffectsRack.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer
 * (the same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses).
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  AudioEffectsRack,
  EFFECT_KINDS,
  EFFECT_PARAM_SCHEMAS,
  reorderEffects,
  resolveParamValue,
} from '../audio-effects-rack.component.js'
import type { AudioEffectsRackProps, Effect, EffectChangePatch, EffectKind } from '../types.js'

/**
 * Build a Proxy-backed stub of an interface a test double cannot implement
 * member by member.
 *
 * @param handler - The proxy handler.
 * @returns The proxy, typed as the interface.
 */
function proxyOf<T>(handler: ProxyHandler<Record<string, unknown>>): T {
  return new Proxy({}, handler) as T
}

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
  return proxyOf<UIClassMap>(handler)
}

/** A mounted spec host: its DOM, a change-detection tick, and a teardown. */
interface Mounted {
  /** The host element the component template produced. */
  readonly host: HTMLElement
  /** Runs change detection on the host app. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The hosts mounted during one test, torn down after it. */
const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element with its input bindings).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountComponent(template: string, props: AudioEffectsRackProps): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AudioEffectsRack],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: AudioEffectsRackProps = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: AudioEffectsRackProps }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
    host,
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(m)
  return m
}

const HOST_TEMPLATE = `<div mol-audio-effects-rack [effects]="p['effects']" [onChange]="p['onChange']" [onReorder]="p['onReorder']" [onAdd]="p['onAdd']" [onRemove]="p['onRemove']" [className]="p['className']"></div>`

/**
 * Mounts an `<AudioEffectsRack>` with the given props.
 *
 * @param props - The rack's props.
 * @returns The mounted host.
 */
function renderRack(props: AudioEffectsRackProps): Promise<Mounted> {
  return mountComponent(HOST_TEMPLATE, props)
}

/**
 * Dispatches a bubbling click, as a user's does.
 *
 * @param element - The element to click.
 */
function click(element: Element): void {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

/**
 * Sets an input's (or select's) value and dispatches the native `input` +
 * `change` events a user edit sends.
 *
 * @param element - The input or select.
 * @param value - The new value string.
 */
function setValue(element: HTMLInputElement | HTMLSelectElement, value: string): void {
  const prototype =
    element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Dispatches a bubbling pointer event.
 *
 * @param element - The event target.
 * @param type - The pointer event type (`pointerdown`, `pointerover`, …).
 */
function pointer(element: Element, type: string): void {
  element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
}

const baseEffects: Effect[] = [
  { id: 'eq-1', kind: 'eq', enabled: true, params: { low: 2, mid: 0, high: -1 } },
  { id: 'comp-1', kind: 'compressor', enabled: false, params: { threshold: -20, ratio: 4 } },
  { id: 'rev-1', kind: 'reverb', enabled: true, params: { mix: 0.4 } },
]

beforeEach(() => {
  setClassMap(buildStubClassMap())
  setProvider(createSimpleI18nProvider('en'))
})

describe('resolveParamValue', () => {
  it('returns the effect value when present and in range', () => {
    const schema = EFFECT_PARAM_SCHEMAS.eq[0]!
    const effect: Effect = { id: 'x', kind: 'eq', enabled: true, params: { [schema.id]: 5 } }
    expect(resolveParamValue(effect, schema)).toBe(5)
  })

  it('falls back to the schema default when the param is missing', () => {
    const schema = EFFECT_PARAM_SCHEMAS.eq[0]!
    const effect: Effect = { id: 'x', kind: 'eq', enabled: true, params: {} }
    expect(resolveParamValue(effect, schema)).toBe(schema.default)
  })

  it('falls back to the schema default when the param is non-finite', () => {
    const schema = EFFECT_PARAM_SCHEMAS.eq[0]!
    const effect: Effect = {
      id: 'x',
      kind: 'eq',
      enabled: true,
      params: { [schema.id]: Number.NaN },
    }
    expect(resolveParamValue(effect, schema)).toBe(schema.default)
  })

  it('clamps below-min values up to min', () => {
    const schema = EFFECT_PARAM_SCHEMAS.compressor[0]! // threshold: min=-60
    const effect: Effect = {
      id: 'x',
      kind: 'compressor',
      enabled: true,
      params: { [schema.id]: -1000 },
    }
    expect(resolveParamValue(effect, schema)).toBe(schema.min)
  })

  it('clamps above-max values down to max', () => {
    const schema = EFFECT_PARAM_SCHEMAS.compressor[1]! // ratio: max=20
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
  it('renders one panel per effect in the input order', async () => {
    const { host } = await renderRack({ effects: baseEffects })
    const panels = host.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]')
    expect(panels.length).toBe(3)
    const ids = Array.from(panels).map((el) => el.getAttribute('data-effect-id'))
    expect(ids).toEqual(['eq-1', 'comp-1', 'rev-1'])
  })

  it('exposes the rack aria-label from the locale bond', async () => {
    const { host } = await renderRack({ effects: baseEffects })
    const root = host.querySelector('[data-mol-id="audio-effects-rack"]')
    expect(root?.getAttribute('aria-label')).toBeTruthy()
  })

  it('renders the empty state when effects is []', async () => {
    const { host } = await renderRack({ effects: [] })
    expect(host.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]').length).toBe(0)
    expect(host.querySelector('[data-mol-id="audio-effects-rack-empty"]')).not.toBeNull()
  })

  it('reflects each effect.enabled via aria-pressed + data-enabled', async () => {
    const { host } = await renderRack({ effects: baseEffects })
    const panels = host.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]')
    expect(panels[0]!.getAttribute('data-enabled')).toBe('true')
    expect(panels[1]!.getAttribute('data-enabled')).toBe('false')
    const bypassButtons = host.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-bypass"]',
    )
    // bypass is "pressed" when the effect is bypassed (i.e. NOT enabled).
    expect(bypassButtons[0]!.getAttribute('aria-pressed')).toBe('false')
    expect(bypassButtons[1]!.getAttribute('aria-pressed')).toBe('true')
  })

  it('emits onChange with an enabled-flip patch when the bypass button is clicked', async () => {
    const onChange = vi.fn<(patch: EffectChangePatch) => void>()
    const { host } = await renderRack({ effects: baseEffects, onChange })
    const bypassButtons = host.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-bypass"]',
    )
    // eq-1 is currently enabled → click bypass → enabled becomes false
    click(bypassButtons[0]!)
    expect(onChange).toHaveBeenCalledWith({ id: 'eq-1', enabled: false })
    // comp-1 is currently disabled → click bypass → enabled becomes true
    click(bypassButtons[1]!)
    expect(onChange).toHaveBeenCalledWith({ id: 'comp-1', enabled: true })
  })

  it('emits onChange with a paramId/paramValue patch when a param slider moves', async () => {
    const onChange = vi.fn<(patch: EffectChangePatch) => void>()
    const { host } = await renderRack({ effects: baseEffects, onChange })
    const eqPanel = host.querySelector('[data-mol-id="audio-effects-rack-panel"]')!
    const lowInput = eqPanel.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-effects-rack-param-input"][data-param-id="low"]',
    )!
    setValue(lowInput, '6')
    expect(onChange).toHaveBeenCalledWith({ id: 'eq-1', paramId: 'low', paramValue: 6 })
  })

  it('clamps param values to the schema [min, max] interval before emitting', async () => {
    const onChange = vi.fn<(patch: EffectChangePatch) => void>()
    const { host } = await renderRack({ effects: baseEffects, onChange })
    const eqPanel = host.querySelector('[data-mol-id="audio-effects-rack-panel"]')!
    const lowInput = eqPanel.querySelector<HTMLInputElement>(
      '[data-mol-id="audio-effects-rack-param-input"][data-param-id="low"]',
    )!
    // EQ low has min=-24/max=24 — bypass the DOM clamp via JS:
    setValue(lowInput, '999')
    const last = onChange.mock.calls[onChange.mock.calls.length - 1]![0]
    expect(last.id).toBe('eq-1')
    expect(last.paramId).toBe('low')
    expect(last.paramValue).toBeLessThanOrEqual(24)
    expect(last.paramValue).toBeGreaterThanOrEqual(-24)
  })

  it('renders one slider per param defined in the schema for each effect kind', async () => {
    const { host } = await renderRack({ effects: baseEffects })
    const panels = host.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]')
    panels.forEach((panel, i) => {
      const effect = baseEffects[i]!
      const expected = EFFECT_PARAM_SCHEMAS[effect.kind].length
      const inputs = panel.querySelectorAll('[data-mol-id="audio-effects-rack-param-input"]')
      expect(inputs.length).toBe(expected)
    })
  })

  it('renders an option in the add-effect dropdown for every supported kind', async () => {
    const { host } = await renderRack({ effects: baseEffects })
    const select = host.querySelector<HTMLSelectElement>(
      '[data-mol-id="audio-effects-rack-add-select"]',
    )!
    // +1 for the disabled placeholder option
    expect(select.querySelectorAll('option').length).toBe(EFFECT_KINDS.length + 1)
    const kinds = Array.from(select.querySelectorAll<HTMLOptionElement>('option'))
      .map((o) => o.value)
      .filter((v) => v.length > 0)
    expect(kinds).toEqual(Array.from(EFFECT_KINDS))
  })

  it('emits onAdd with the chosen kind when the add-effect select changes', async () => {
    const onAdd = vi.fn<(kind: EffectKind) => void>()
    const { host } = await renderRack({ effects: baseEffects, onAdd })
    const select = host.querySelector<HTMLSelectElement>(
      '[data-mol-id="audio-effects-rack-add-select"]',
    )!
    setValue(select, 'phaser')
    expect(onAdd).toHaveBeenCalledWith('phaser')
  })

  it('emits onRemove with the effect id when the remove button is clicked', async () => {
    const onRemove = vi.fn<(id: string) => void>()
    const { host } = await renderRack({ effects: baseEffects, onRemove })
    const removeButtons = host.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-remove"]',
    )
    click(removeButtons[1]!)
    expect(onRemove).toHaveBeenCalledWith('comp-1')
  })

  it('reorders panels via pointer drag-and-drop and emits the new order', async () => {
    const onReorder = vi.fn<(nextOrder: Effect[]) => void>()
    const m = await renderRack({ effects: baseEffects, onReorder })
    const root = m.host.querySelector('[data-mol-id="audio-effects-rack"]') as HTMLElement
    const panels = m.host.querySelectorAll<HTMLElement>('[data-mol-id="audio-effects-rack-panel"]')
    const handles = m.host.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-drag-handle"]',
    )
    // Pick up panel 0 (eq-1)…
    pointer(handles[0]!, 'pointerdown')
    m.tick()
    // …drag over panel 2 (rev-1)…
    pointer(panels[2]!, 'pointerover')
    m.tick()
    // …and drop.
    pointer(root, 'pointerup')
    m.tick()
    expect(onReorder).toHaveBeenCalledTimes(1)
    const next = onReorder.mock.calls[0]![0]
    expect(next.map((e) => e.id)).toEqual(['comp-1', 'rev-1', 'eq-1'])
  })

  it('does not call onReorder when a drag drops on its origin panel', async () => {
    const onReorder = vi.fn<(nextOrder: Effect[]) => void>()
    const m = await renderRack({ effects: baseEffects, onReorder })
    const root = m.host.querySelector('[data-mol-id="audio-effects-rack"]') as HTMLElement
    const handles = m.host.querySelectorAll<HTMLButtonElement>(
      '[data-mol-id="audio-effects-rack-drag-handle"]',
    )
    pointer(handles[1]!, 'pointerdown')
    m.tick()
    pointer(root, 'pointerup')
    m.tick()
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('exposes effect ids and kinds via data-* attributes', async () => {
    const { host } = await renderRack({ effects: baseEffects })
    const panels = host.querySelectorAll('[data-mol-id="audio-effects-rack-panel"]')
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
