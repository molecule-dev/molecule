// @vitest-environment jsdom
/**
 * Unit tests for the Vue `LayerPanel` — a port of
 * `@molecule/app-layer-panel-react/src/__tests__/LayerPanel.test.tsx`: the
 * same test names and behavioral assertions, rendered with Vue in jsdom and
 * asserted on the DOM the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React suite uses.
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n lookup the React suite gets from `I18nProvider`: React's
// `defaultValue` when the provider has no translation.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

import { createApp, defineComponent, h, nextTick, ref, type VNodeChild } from 'vue'

import { formatOpacityPercent, type Layer, LayerPanel, moveLayer } from '../index.js'

afterEach(() => {
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

/** A mounted panel: its host element, a props setter, and a teardown. */
interface Mounted {
  /** The element the panel rendered into. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes the render. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Unmounts the app and removes the host. */
  destroy(): void
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
async function mountHarness(
  initial: Layer[] = makeLayers(),
  spies: {
    onReorder?: (next: Layer[]) => void
    onVisibilityToggle?: (id: string) => void
    onLockToggle?: (id: string) => void
    onSelect?: (id: string) => void
    onRename?: (id: string, name: string) => void
  } = {},
): Promise<Mounted> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const layers = ref<Layer[]>(initial)
  const activeId = ref<string | undefined>(undefined)
  const state = ref<Record<string, unknown>>({})
  const app = createApp(
    defineComponent({
      setup() {
        return (): VNodeChild =>
          h(LayerPanel, {
            ...state.value,
            layers: layers.value,
            activeId: activeId.value,
            onReorder: (next: Layer[]) => {
              spies.onReorder?.(next)
              layers.value = next
            },
            onVisibilityToggle: (id: string) => {
              spies.onVisibilityToggle?.(id)
              layers.value = layers.value.map((l) =>
                l.id === id ? { ...l, visible: !l.visible } : l,
              )
            },
            onLockToggle: (id: string) => {
              spies.onLockToggle?.(id)
              layers.value = layers.value.map((l) =>
                l.id === id ? { ...l, locked: !l.locked } : l,
              )
            },
            onSelect: (id: string) => {
              spies.onSelect?.(id)
              activeId.value = id
            },
            onRename: (id: string, name: string) => {
              spies.onRename?.(id, name)
              layers.value = layers.value.map((l) => (l.id === id ? { ...l, name } : l))
            },
          })
      },
    }),
  )
  app.mount(host)
  await nextTick()
  return {
    host,
    setProps: async (next) => {
      state.value = { ...state.value, ...next }
      await nextTick()
    },
    destroy: () => {
      app.unmount()
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
  it('renders one list item per layer with no option role', async () => {
    const { host, destroy } = await mountHarness()
    expect(all(host, 'ul > li').length).toBe(3)
    // The rows hold their own buttons, so neither the list nor a row may
    // carry a role whose children are presentational.
    expect(host.querySelector('[role="listbox"]')).toBeNull()
    expect(host.querySelector('[role="option"]')).toBeNull()
    destroy()
  })

  it('renders layer names in the original (top-down) order', async () => {
    const { host, destroy } = await mountHarness()
    const names = all(host, '[data-mol-id^="layer-panel-name-"]').map((n) => n.textContent)
    expect(names).toEqual(['Top', 'Mid', 'Bot'])
    destroy()
  })

  it('renders blend-mode + opacity metadata when provided', async () => {
    const { host, destroy } = await mountHarness()
    const meta = one(host, '[data-mol-id="layer-panel-meta-top"]')
    expect(meta.textContent).toContain('normal')
    expect(meta.textContent).toContain('100%')
    destroy()
  })

  it('omits metadata span entirely when neither blend-mode nor opacity is set', async () => {
    const { host, destroy } = await mountHarness([
      { id: 'plain', name: 'Plain', visible: true, locked: false },
    ])
    expect(host.querySelector('[data-mol-id="layer-panel-meta-plain"]')).toBeNull()
    destroy()
  })
})

describe('<LayerPanel> selection', () => {
  it('clicking the layer-name button calls onSelect and marks the name button aria-current', async () => {
    const onSelect = vi.fn()
    const { host, destroy } = await mountHarness(makeLayers(), { onSelect })
    const midName = one(host, '[data-mol-id="layer-panel-name-mid"]')
    const mid = one(host, '[data-mol-id="layer-panel-row-mid"]')
    midName.click()
    await nextTick()
    expect(onSelect).toHaveBeenCalledWith('mid')
    // The selected layer is announced on its select control, not the row.
    expect(one(host, '[data-mol-id="layer-panel-name-mid"]').getAttribute('aria-current')).toBe(
      'true',
    )
    expect(
      one(host, '[data-mol-id="layer-panel-name-top"]').getAttribute('aria-current'),
    ).toBeNull()
    expect(mid.getAttribute('aria-selected')).toBeNull()
    destroy()
  })

  it('renders the layer name as a native button — Enter/Space select via platform activation', async () => {
    const { host, destroy } = await mountHarness()
    const nameButton = one(host, '[data-mol-id="layer-panel-name-mid"]')
    expect(nameButton.tagName).toBe('BUTTON')
    expect(nameButton.getAttribute('type')).toBe('button')
    expect(nameButton.textContent).toBe('Mid')
    destroy()
  })

  it('clicking the row outside the name button does not select', async () => {
    const onSelect = vi.fn()
    const { host, destroy } = await mountHarness(makeLayers(), { onSelect })
    one(host, '[data-mol-id="layer-panel-row-mid"]').click()
    one(host, '[data-mol-id="layer-panel-meta-mid"]').click()
    await nextTick()
    expect(onSelect).not.toHaveBeenCalled()
    destroy()
  })
})

describe('<LayerPanel> visibility + lock toggles', () => {
  it('clicking the eye button toggles visibility and stops row selection', async () => {
    const onVis = vi.fn()
    const onSelect = vi.fn()
    const { host, destroy } = await mountHarness(makeLayers(), {
      onVisibilityToggle: onVis,
      onSelect,
    })
    one(host, '[data-mol-id="layer-panel-visibility-top"]').click()
    await nextTick()
    expect(onVis).toHaveBeenCalledWith('top')
    // The row element has no click handler, so toggling never selects.
    expect(onSelect).not.toHaveBeenCalled()
    destroy()
  })

  it('clicking the lock button toggles lock', async () => {
    const onLock = vi.fn()
    const { host, destroy } = await mountHarness(makeLayers(), { onLockToggle: onLock })
    one(host, '[data-mol-id="layer-panel-lock-bot"]').click()
    await nextTick()
    expect(onLock).toHaveBeenCalledWith('bot')
    destroy()
  })
})

describe('<LayerPanel> inline rename', () => {
  it('double-click reveals an input and Enter commits the trimmed value', async () => {
    const onRename = vi.fn()
    const { host, destroy } = await mountHarness(makeLayers(), { onRename })
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await nextTick()
    const input = one(host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = '  Background  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()
    expect(onRename).toHaveBeenCalledWith('top', 'Background')
    destroy()
  })

  it('Escape cancels rename without committing', async () => {
    const onRename = vi.fn()
    const { host, destroy } = await mountHarness(makeLayers(), { onRename })
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await nextTick()
    const input = one(host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    input.value = 'Discarded'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(onRename).not.toHaveBeenCalled()
    destroy()
  })

  it('empty trimmed input does not commit', async () => {
    const onRename = vi.fn()
    const { host, destroy } = await mountHarness(makeLayers(), { onRename })
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await nextTick()
    const input = one(host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    input.value = '   '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()
    expect(onRename).not.toHaveBeenCalled()
    destroy()
  })

  it('locked layers do not enter rename mode on double-click', async () => {
    const { host, destroy } = await mountHarness()
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-bot"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await nextTick()
    expect(host.querySelector('[data-mol-id="layer-panel-rename-bot"]')).toBeNull()
    destroy()
  })
})

describe('<LayerPanel> aria + i18n', () => {
  it('exposes a localized aria-label on the list', async () => {
    const { host, destroy } = await mountHarness()
    expect(one(host, '[data-mol-id="layer-panel"]').getAttribute('aria-label')).toBe('Layers')
    destroy()
  })

  it('eye button aria-label flips with visibility state', async () => {
    const { host, destroy } = await mountHarness()
    // "top" is visible → label says Hide.
    expect(one(host, '[data-mol-id="layer-panel-visibility-top"]').getAttribute('aria-label')).toBe(
      'Hide layer',
    )
    // "bot" is hidden → label says Show.
    expect(one(host, '[data-mol-id="layer-panel-visibility-bot"]').getAttribute('aria-label')).toBe(
      'Show layer',
    )
    destroy()
  })
})
