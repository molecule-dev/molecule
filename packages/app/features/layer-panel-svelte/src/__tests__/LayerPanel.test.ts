// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `LayerPanel` — a port of
 * `@molecule/app-layer-panel-react/src/__tests__/LayerPanel.test.tsx`: the
 * same test names and behavioral assertions, rendered with a real mount
 * (jsdom) and the bonded ClassMap.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatOpacityPercent, type Layer, moveLayer } from '../index.js'
import Harness from './Harness.svelte'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
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

/** A mounted panel: its host element and the spies it was given. */
interface Mounted {
  /** The element the panel rendered into. */
  readonly host: HTMLElement
}

/**
 * Mounts the stateful harness around `LayerPanel`, like the React suite's
 * `Harness`.
 *
 * @param props - The harness props (initial layers and callback spies).
 * @returns The mounted panel.
 */
function render(props: Record<string, unknown> = {}): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Harness, {
    target: host,
    props: { initial: makeLayers(), ...props },
  })
  mounted.push(instance)
  flushSync()
  return { host }
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

/** Flushes Svelte's pending state updates. */
const settle = (): void => flushSync()

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
    const { host } = render()
    expect(all(host, 'ul > li').length).toBe(3)
    // The rows hold their own buttons, so neither the list nor a row may
    // carry a role whose children are presentational.
    expect(host.querySelector('[role="listbox"]')).toBeNull()
    expect(host.querySelector('[role="option"]')).toBeNull()
  })

  it('renders layer names in the original (top-down) order', () => {
    const { host } = render()
    const names = all(host, '[data-mol-id^="layer-panel-name-"]').map((n) => n.textContent)
    expect(names).toEqual(['Top', 'Mid', 'Bot'])
  })

  it('renders blend-mode + opacity metadata when provided', () => {
    const { host } = render()
    const meta = one(host, '[data-mol-id="layer-panel-meta-top"]')
    expect(meta.textContent).toContain('normal')
    expect(meta.textContent).toContain('100%')
  })

  it('omits metadata span entirely when neither blend-mode nor opacity is set', () => {
    const { host } = render({
      initial: [{ id: 'plain', name: 'Plain', visible: true, locked: false }],
    })
    expect(host.querySelector('[data-mol-id="layer-panel-meta-plain"]')).toBeNull()
  })
})

describe('<LayerPanel> selection', () => {
  it('clicking the layer-name button calls onSelect and marks the name button aria-current', () => {
    const onSelect = vi.fn()
    const { host } = render({ onSelectSpy: onSelect })
    const midName = one(host, '[data-mol-id="layer-panel-name-mid"]')
    const mid = one(host, '[data-mol-id="layer-panel-row-mid"]')
    midName.click()
    settle()
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
    const { host } = render()
    const nameButton = one(host, '[data-mol-id="layer-panel-name-mid"]')
    expect(nameButton.tagName).toBe('BUTTON')
    expect(nameButton.getAttribute('type')).toBe('button')
    expect(nameButton.textContent).toBe('Mid')
  })

  it('clicking the row outside the name button does not select', () => {
    const onSelect = vi.fn()
    const { host } = render({ onSelectSpy: onSelect })
    one(host, '[data-mol-id="layer-panel-row-mid"]').click()
    one(host, '[data-mol-id="layer-panel-meta-mid"]').click()
    settle()
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('<LayerPanel> visibility + lock toggles', () => {
  it('clicking the eye button toggles visibility and stops row selection', () => {
    const onVis = vi.fn()
    const onSelect = vi.fn()
    const { host } = render({ onVisibilityToggleSpy: onVis, onSelectSpy: onSelect })
    one(host, '[data-mol-id="layer-panel-visibility-top"]').click()
    settle()
    expect(onVis).toHaveBeenCalledWith('top')
    // The row element has no click handler, so toggling never selects.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('clicking the lock button toggles lock', () => {
    const onLock = vi.fn()
    const { host } = render({ onLockToggleSpy: onLock })
    one(host, '[data-mol-id="layer-panel-lock-bot"]').click()
    settle()
    expect(onLock).toHaveBeenCalledWith('bot')
  })
})

describe('<LayerPanel> inline rename', () => {
  it('double-click reveals an input and Enter commits the trimmed value', () => {
    const onRename = vi.fn()
    const { host } = render({ onRenameSpy: onRename })
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    settle()
    const input = one(host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = '  Background  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    settle()
    expect(onRename).toHaveBeenCalledWith('top', 'Background')
  })

  it('Escape cancels rename without committing', () => {
    const onRename = vi.fn()
    const { host } = render({ onRenameSpy: onRename })
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    settle()
    const input = one(host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    input.value = 'Discarded'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    settle()
    expect(onRename).not.toHaveBeenCalled()
  })

  it('empty trimmed input does not commit', () => {
    const onRename = vi.fn()
    const { host } = render({ onRenameSpy: onRename })
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    settle()
    const input = one(host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    input.value = '   '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    settle()
    expect(onRename).not.toHaveBeenCalled()
  })

  it('locked layers do not enter rename mode on double-click', () => {
    const { host } = render()
    const nameSlot = one(host, '[data-mol-id="layer-panel-name-bot"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    settle()
    expect(host.querySelector('[data-mol-id="layer-panel-rename-bot"]')).toBeNull()
  })
})

describe('<LayerPanel> aria + i18n', () => {
  it('exposes a localized aria-label on the list', () => {
    const { host } = render()
    expect(one(host, '[data-mol-id="layer-panel"]').getAttribute('aria-label')).toBe('Layers')
  })

  it('eye button aria-label flips with visibility state', () => {
    const { host } = render()
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
