// @vitest-environment jsdom
/**
 * Unit tests for the Solid `LayerPanel` — a port of
 * `@molecule/app-layer-panel-react/src/__tests__/LayerPanel.test.tsx`: the
 * same test names and behavioral assertions, rendered with Solid in jsdom and
 * asserted on the DOM the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React suite uses.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n lookup the React suite gets from `I18nProvider`: React's
// `defaultValue` when the provider has no translation.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'

import { formatOpacityPercent, type Layer, LayerPanel, moveLayer } from '../index.js'

/** A mounted panel: its host element and a teardown. */
interface Mounted {
  /** The element the panel rendered into. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes the render. */
  setProps(next: Record<string, unknown>): void
  /** Disposes the Solid root and removes the host. */
  destroy(): void
}

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Build a small set of layers used across many tests.
 *
 * @returns An array of three predictable layers.
 */
function makeLayers(): Layer[] {
  return [
    { id: 'top', name: 'Top', visible: true, locked: false, opacity: 1, blendMode: 'normal' },
    { id: 'mid', name: 'Mid', visible: true, locked: false, opacity: 0.5 },
    { id: 'bot', name: 'Bot', visible: false, locked: true },
  ]
}

/**
 * Mounts a stateful harness around `LayerPanel`, like the React suite's
 * `Harness`: it owns the layer list and active id, and records the callbacks
 * the tests assert on.
 *
 * @param initial - Initial layer list (defaults to `makeLayers()`).
 * @param spies - Optional recorder for each callback.
 * @returns The mounted panel.
 */
function mountHarness(
  initial: Layer[] = makeLayers(),
  spies: {
    onReorder?: (next: Layer[]) => void
    onVisibilityToggle?: (id: string) => void
    onLockToggle?: (id: string) => void
    onSelect?: (id: string) => void
    onRename?: (id: string, name: string) => void
  } = {},
): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const [layers, setLayers] = createSignal<Layer[]>(initial)
  const [activeId, setActiveId] = createSignal<string | undefined>(undefined)
  const [extra, setExtra] = createSignal<Record<string, unknown>>({})
  const view = (): JSX.Element => (
    <LayerPanel
      {...extra()}
      layers={layers()}
      activeId={activeId()}
      onReorder={(next) => {
        spies.onReorder?.(next)
        setLayers(next)
      }}
      onVisibilityToggle={(id) => {
        spies.onVisibilityToggle?.(id)
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)))
      }}
      onLockToggle={(id) => {
        spies.onLockToggle?.(id)
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)))
      }}
      onSelect={(id) => {
        spies.onSelect?.(id)
        setActiveId(id)
      }}
      onRename={(id, name) => {
        spies.onRename?.(id, name)
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)))
      }}
    />
  )
  disposers.push(render(view, host))
  return {
    host,
    setProps: (next) => setExtra((current) => ({ ...current, ...next })),
    destroy: () => {
      host.remove()
    },
  }
}

/** The first element matching `selector` inside a mounted panel. */
const one = (host: HTMLElement, selector: string): HTMLElement => {
  const el = host.querySelector(selector)
  if (!el) throw new Error(`no element matches ${selector}`)
  return el as HTMLElement
}

/** Every element matching `selector` inside a mounted panel. */
const all = (host: HTMLElement, selector: string): HTMLElement[] =>
  Array.from(host.querySelectorAll(selector)) as HTMLElement[]

describe('utilities', () => {
  it('moveLayer reorders top-down arrays', () => {
    const ls = makeLayers()
    const next = moveLayer(ls, 0, 2)
    expect(next.map((l) => l.id)).toEqual(['mid', 'bot', 'top'])
  })

  it('moveLayer is a no-op when source === destination', () => {
    const ls = makeLayers()
    expect(moveLayer(ls, 1, 1)).toBe(ls)
  })

  it('moveLayer clamps out-of-range indices', () => {
    const ls = makeLayers()
    const next = moveLayer(ls, -5, 99)
    // -5 clamps to 0, 99 clamps to last → moves "top" to bottom.
    expect(next.map((l) => l.id)).toEqual(['mid', 'bot', 'top'])
  })

  it('moveLayer returns the original ref for empty arrays', () => {
    const empty: Layer[] = []
    expect(moveLayer(empty, 0, 1)).toBe(empty)
  })

  it('formatOpacityPercent renders 0–1 floats as integer percent', () => {
    expect(formatOpacityPercent(1)).toBe('100%')
    expect(formatOpacityPercent(0)).toBe('0%')
    expect(formatOpacityPercent(0.5)).toBe('50%')
    expect(formatOpacityPercent(0.333)).toBe('33%')
  })

  it('formatOpacityPercent returns "" for undefined / NaN', () => {
    expect(formatOpacityPercent(undefined)).toBe('')
    expect(formatOpacityPercent(Number.NaN)).toBe('')
  })

  it('formatOpacityPercent clamps out-of-range values', () => {
    expect(formatOpacityPercent(-1)).toBe('0%')
    expect(formatOpacityPercent(2)).toBe('100%')
  })
})

describe('<LayerPanel> rendering', () => {
  it('renders one list item per layer with no option role', () => {
    const { host } = mountHarness()
    expect(all(host, 'ul > li').length).toBe(3)
    // The rows hold their own buttons, so neither the list nor a row may
    // carry a role whose children are presentational.
    expect(host.querySelector('[role="listbox"]')).toBeNull()
    expect(host.querySelector('[role="option"]')).toBeNull()
  })

  it('renders layer names in the original (top-down) order', () => {
    const { host } = mountHarness()
    const names = all(host, '[data-mol-id^="layer-panel-name-"]').map((n) => n.textContent)
    expect(names).toEqual(['Top', 'Mid', 'Bot'])
  })

  it('renders blend-mode + opacity metadata when provided', () => {
    const { host } = mountHarness()
    const meta = one(host, '[data-mol-id="layer-panel-meta-top"]')
    expect(meta.textContent).toContain('normal')
    expect(meta.textContent).toContain('100%')
  })

  it('omits metadata span entirely when neither blend-mode nor opacity is set', () => {
    const { host } = mountHarness([{ id: 'plain', name: 'Plain', visible: true, locked: false }])
    expect(host.querySelector('[data-mol-id="layer-panel-meta-plain"]')).toBeNull()
  })
})

describe('<LayerPanel> selection', () => {
  it('clicking the layer-name button calls onSelect and marks the name button aria-current', () => {
    const onSelect = vi.fn()
    const { host } = mountHarness(makeLayers(), { onSelect })
    const midName = one(host, '[data-mol-id="layer-panel-name-mid"]')
    const mid = one(host, '[data-mol-id="layer-panel-row-mid"]')
    midName.click()
    expect(onSelect).toHaveBeenCalledWith('mid')
    // The selected layer is announced on its select control, not the row.
    expect(one(host, '[data-mol-id="layer-panel-name-mid"]').getAttribute('aria-current')).toBe(
      'true',
    )
    expect(
      one(host, '[data-mol-id="layer-panel-name-top"]').getAttribute('aria-current'),
    ).toBeNull()
    expect(mid.getAttribute('aria-selected')).toBeNull()
  })

  it('renders the layer name as a native button — Enter/Space select via platform activation', () => {
    const { host } = mountHarness()
    const nameButton = one(host, '[data-mol-id="layer-panel-name-mid"]')
    expect(nameButton.tagName).toBe('BUTTON')
    expect(nameButton.getAttribute('type')).toBe('button')
    expect(nameButton.textContent).toBe('Mid')
  })

  it('clicking the row outside the name button does not select', () => {
    const onSelect = vi.fn()
    const { host } = mountHarness(makeLayers(), { onSelect })
    one(host, '[data-mol-id="layer-panel-row-mid"]').click()
    one(host, '[data-mol-id="layer-panel-meta-mid"]').click()
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('<LayerPanel> visibility + lock toggles', () => {
  it('clicking the eye button toggles visibility and stops row selection', () => {
    const onVis = vi.fn()
    const onSelect = vi.fn()
    const { host } = mountHarness(makeLayers(), { onVisibilityToggle: onVis, onSelect })
    one(host, '[data-mol-id="layer-panel-visibility-top"]').click()
    expect(onVis).toHaveBeenCalledWith('top')
    // The row element has no click handler, so toggling never selects.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('clicking the lock button toggles lock', () => {
    const onLock = vi.fn()
    const { host } = mountHarness(makeLayers(), { onLockToggle: onLock })
    one(host, '[data-mol-id="layer-panel-lock-bot"]').click()
    expect(onLock).toHaveBeenCalledWith('bot')
  })
})

describe('<LayerPanel> inline rename', () => {
  it('double-click reveals an input and Enter commits the trimmed value', () => {
    const onRename = vi.fn()
    const { host } = mountHarness(makeLayers(), { onRename })
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = one(host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = '  Background  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onRename).toHaveBeenCalledWith('top', 'Background')
  })

  it('Escape cancels rename without committing', () => {
    const onRename = vi.fn()
    const { host } = mountHarness(makeLayers(), { onRename })
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = one(host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    input.value = 'Discarded'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onRename).not.toHaveBeenCalled()
  })

  it('empty trimmed input does not commit', () => {
    const onRename = vi.fn()
    const { host } = mountHarness(makeLayers(), { onRename })
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    const input = one(host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    input.value = '   '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onRename).not.toHaveBeenCalled()
  })

  it('locked layers do not enter rename mode on double-click', () => {
    const { host } = mountHarness()
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-bot"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(host.querySelector('[data-mol-id="layer-panel-rename-bot"]')).toBeNull()
  })
})

describe('<LayerPanel> aria + i18n', () => {
  it('exposes a localized aria-label on the list', () => {
    const { host } = mountHarness()
    expect(one(host, '[data-mol-id="layer-panel"]').getAttribute('aria-label')).toBe('Layers')
  })

  it('eye button aria-label flips with visibility state', () => {
    const { host } = mountHarness()
    // "top" is visible → label says Hide.
    expect(one(host, '[data-mol-id="layer-panel-visibility-top"]').getAttribute('aria-label')).toBe(
      'Hide layer',
    )
    // "bot" is hidden → label says Show.
    expect(one(host, '[data-mol-id="layer-panel-visibility-bot"]').getAttribute('aria-label')).toBe(
      'Show layer',
    )
  })
})
