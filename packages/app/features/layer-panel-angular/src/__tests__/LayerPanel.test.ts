// @vitest-environment jsdom
/**
 * Unit tests of `LayerPanel` — the port of
 * `@molecule/app-layer-panel-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the DOM; this port mounts
 * the same tree through Angular's real renderer (the same `createApplication`
 * + JIT host approach the conformance kit's Angular adapter uses) and asserts
 * the same markup.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatOpacityPercent, type Layer, LayerPanel, moveLayer } from '../index.js'

/** A mounted panel: its host element and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Flushes change detection. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

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

/** The callback recorders a test may pass to the harness. */
interface Spies {
  onReorder?: (next: Layer[]) => void
  onVisibilityToggle?: (id: string) => void
  onLockToggle?: (id: string) => void
  onSelect?: (id: string) => void
  onRename?: (id: string, name: string) => void
}

/**
 * Mounts a stateful harness around `LayerPanel`, like the React suite's
 * `Harness`: a host component that owns the layer list and the active id,
 * exactly as the React `Harness` owns them in `useState`.
 *
 * @param initial - Initial layer list (defaults to `makeLayers()`).
 * @param spies - Optional recorder for each callback.
 * @returns The mounted panel.
 */
async function mountHarness(initial: Layer[] = makeLayers(), spies: Spies = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [LayerPanel],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<ul
      mol-layer-panel
      [layers]="layers()"
      [activeId]="activeId()"
      [onReorder]="reorder"
      [onVisibilityToggle]="toggleVisibility"
      [onLockToggle]="toggleLock"
      [onSelect]="select"
      [onRename]="rename"
    ></ul>`,
  })(
    class SpecHost {
      /** The layer list the panel renders (React's `layers` state). */
      readonly layers = signal<Layer[]>(initial)
      /** The active layer id (React's `activeId` state). */
      readonly activeId = signal<string | undefined>(undefined)

      /** Records a reorder and adopts it, as the React harness does. */
      readonly reorder = (next: Layer[]): void => {
        spies.onReorder?.(next)
        this.layers.set(next)
      }

      /** Records a visibility toggle and flips the flag. */
      readonly toggleVisibility = (id: string): void => {
        spies.onVisibilityToggle?.(id)
        this.layers.update((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)))
      }

      /** Records a lock toggle and flips the flag. */
      readonly toggleLock = (id: string): void => {
        spies.onLockToggle?.(id)
        this.layers.update((ls) => ls.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)))
      }

      /** Records a selection and makes it active. */
      readonly select = (id: string): void => {
        spies.onSelect?.(id)
        this.activeId.set(id)
      }

      /** Records a rename and applies it. */
      readonly rename = (id: string, name: string): void => {
        spies.onRename?.(id, name)
        this.layers.update((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)))
      }
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

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
    const m = await mountHarness()
    mounted.push(m)
    expect(all(m.host, 'ul > li').length).toBe(3)
    // The rows hold their own buttons, so neither the list nor a row may
    // carry a role whose children are presentational.
    expect(m.host.querySelector('[role="listbox"]')).toBeNull()
    expect(m.host.querySelector('[role="option"]')).toBeNull()
  })

  it('renders layer names in the original (top-down) order', async () => {
    const m = await mountHarness()
    mounted.push(m)
    const names = all(m.host, '[data-mol-id^="layer-panel-name-"]').map((n) =>
      n.textContent?.trim(),
    )
    expect(names).toEqual(['Top', 'Mid', 'Bot'])
  })

  it('renders blend-mode + opacity metadata when provided', async () => {
    const m = await mountHarness()
    mounted.push(m)
    const meta = one(m.host, '[data-mol-id="layer-panel-meta-top"]')
    expect(meta.textContent).toContain('normal')
    expect(meta.textContent).toContain('100%')
  })

  it('omits metadata span entirely when neither blend-mode nor opacity is set', async () => {
    const m = await mountHarness([{ id: 'plain', name: 'Plain', visible: true, locked: false }])
    mounted.push(m)
    expect(m.host.querySelector('[data-mol-id="layer-panel-meta-plain"]')).toBeNull()
  })
})

describe('<LayerPanel> selection', () => {
  it('clicking the layer-name button calls onSelect and marks the name button aria-current', async () => {
    const onSelect = vi.fn()
    const m = await mountHarness(makeLayers(), { onSelect })
    mounted.push(m)
    const mid = one(m.host, '[data-mol-id="layer-panel-row-mid"]')
    one(m.host, '[data-mol-id="layer-panel-name-mid"]').click()
    m.tick()
    expect(onSelect).toHaveBeenCalledWith('mid')
    // The selected layer is announced on its select control, not the row.
    expect(one(m.host, '[data-mol-id="layer-panel-name-mid"]').getAttribute('aria-current')).toBe(
      'true',
    )
    expect(
      one(m.host, '[data-mol-id="layer-panel-name-top"]').getAttribute('aria-current'),
    ).toBeNull()
    expect(mid.getAttribute('aria-selected')).toBeNull()
  })

  it('renders the layer name as a native button — Enter/Space select via platform activation', async () => {
    const m = await mountHarness()
    mounted.push(m)
    const nameButton = one(m.host, '[data-mol-id="layer-panel-name-mid"]')
    expect(nameButton.tagName).toBe('BUTTON')
    expect(nameButton.getAttribute('type')).toBe('button')
    expect(nameButton.textContent?.trim()).toBe('Mid')
  })

  it('clicking the row outside the name button does not select', async () => {
    const onSelect = vi.fn()
    const m = await mountHarness(makeLayers(), { onSelect })
    mounted.push(m)
    one(m.host, '[data-mol-id="layer-panel-row-mid"]').click()
    one(m.host, '[data-mol-id="layer-panel-meta-mid"]').click()
    m.tick()
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('<LayerPanel> visibility + lock toggles', () => {
  it('clicking the eye button toggles visibility and stops row selection', async () => {
    const onVis = vi.fn()
    const onSelect = vi.fn()
    const m = await mountHarness(makeLayers(), { onVisibilityToggle: onVis, onSelect })
    mounted.push(m)
    one(m.host, '[data-mol-id="layer-panel-visibility-top"]').click()
    m.tick()
    expect(onVis).toHaveBeenCalledWith('top')
    // The row element has no click handler, so toggling never selects.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('clicking the lock button toggles lock', async () => {
    const onLock = vi.fn()
    const m = await mountHarness(makeLayers(), { onLockToggle: onLock })
    mounted.push(m)
    one(m.host, '[data-mol-id="layer-panel-lock-bot"]').click()
    m.tick()
    expect(onLock).toHaveBeenCalledWith('bot')
  })
})

describe('<LayerPanel> inline rename', () => {
  it('double-click reveals an input and Enter commits the trimmed value', async () => {
    const onRename = vi.fn()
    const m = await mountHarness(makeLayers(), { onRename })
    mounted.push(m)
    const nameSlot = one(m.host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    m.tick()
    const input = one(m.host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = '  Background  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    m.tick()
    expect(onRename).toHaveBeenCalledWith('top', 'Background')
  })

  it('Escape cancels rename without committing', async () => {
    const onRename = vi.fn()
    const m = await mountHarness(makeLayers(), { onRename })
    mounted.push(m)
    const nameSlot = one(m.host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    m.tick()
    const input = one(m.host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    input.value = 'Discarded'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    m.tick()
    expect(onRename).not.toHaveBeenCalled()
  })

  it('empty trimmed input does not commit', async () => {
    const onRename = vi.fn()
    const m = await mountHarness(makeLayers(), { onRename })
    mounted.push(m)
    const nameSlot = one(m.host, '[data-mol-id="layer-panel-name-top"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    m.tick()
    const input = one(m.host, '[data-mol-id="layer-panel-rename-top"]') as HTMLInputElement
    input.value = '   '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    m.tick()
    expect(onRename).not.toHaveBeenCalled()
  })

  it('locked layers do not enter rename mode on double-click', async () => {
    const m = await mountHarness()
    mounted.push(m)
    const nameSlot = one(m.host, '[data-mol-id="layer-panel-name-bot"]').parentElement!
    nameSlot.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    m.tick()
    expect(m.host.querySelector('[data-mol-id="layer-panel-rename-bot"]')).toBeNull()
  })
})

describe('<LayerPanel> aria + i18n', () => {
  it('exposes a localized aria-label on the list', async () => {
    const m = await mountHarness()
    mounted.push(m)
    expect(one(m.host, '[data-mol-id="layer-panel"]').getAttribute('aria-label')).toBe('Layers')
  })

  it('eye button aria-label flips with visibility state', async () => {
    const m = await mountHarness()
    mounted.push(m)
    // "top" is visible → label says Hide.
    expect(
      one(m.host, '[data-mol-id="layer-panel-visibility-top"]').getAttribute('aria-label'),
    ).toBe('Hide layer')
    // "bot" is hidden → label says Show.
    expect(
      one(m.host, '[data-mol-id="layer-panel-visibility-bot"]').getAttribute('aria-label'),
    ).toBe('Show layer')
  })
})
