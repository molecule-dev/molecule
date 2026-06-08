// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { formatOpacityPercent, type Layer, LayerPanel, moveLayer } from '../index.js'

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
        get(_t, key): (() => string) | undefined {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in I18nProvider so `useTranslation()` resolves.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  cleanup()
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

/**
 * Convenience harness owning the layers state so tests can drive the
 * panel through user actions.
 *
 * @param props - Component props.
 * @param props.initial - Initial layer list (defaults to `makeLayers()`).
 * @param props.onReorderSpy - Optional spy invoked on reorder commits.
 * @param props.onVisibilityToggleSpy - Optional spy.
 * @param props.onLockToggleSpy - Optional spy.
 * @param props.onSelectSpy - Optional spy.
 * @param props.onRenameSpy - Optional spy.
 * @returns The harness element.
 */
function Harness(props: {
  initial?: Layer[]
  onReorderSpy?: (next: Layer[]) => void
  onVisibilityToggleSpy?: (id: string) => void
  onLockToggleSpy?: (id: string) => void
  onSelectSpy?: (id: string) => void
  onRenameSpy?: (id: string, name: string) => void
}): React.ReactElement {
  const [layers, setLayers] = useState<Layer[]>(props.initial ?? makeLayers())
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  return (
    <LayerPanel
      layers={layers}
      activeId={activeId}
      onReorder={(next) => {
        props.onReorderSpy?.(next)
        setLayers(next)
      }}
      onVisibilityToggle={(id) => {
        props.onVisibilityToggleSpy?.(id)
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)))
      }}
      onLockToggle={(id) => {
        props.onLockToggleSpy?.(id)
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)))
      }}
      onSelect={(id) => {
        props.onSelectSpy?.(id)
        setActiveId(id)
      }}
      onRename={(id, name) => {
        props.onRenameSpy?.(id, name)
        setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)))
      }}
    />
  )
}

describe('<LayerPanel> rendering', () => {
  it('renders one row per layer with role=option', () => {
    const { container } = render(
      <Wrap>
        <Harness />
      </Wrap>,
    )
    const rows = container.querySelectorAll('[role="option"]')
    expect(rows.length).toBe(3)
  })

  it('renders layer names in the original (top-down) order', () => {
    const { container } = render(
      <Wrap>
        <Harness />
      </Wrap>,
    )
    const names = Array.from(container.querySelectorAll('[data-mol-id^="layer-panel-name-"]')).map(
      (n) => n.textContent,
    )
    expect(names).toEqual(['Top', 'Mid', 'Bot'])
  })

  it('renders blend-mode + opacity metadata when provided', () => {
    const { container } = render(
      <Wrap>
        <Harness />
      </Wrap>,
    )
    const meta = container.querySelector('[data-mol-id="layer-panel-meta-top"]')
    expect(meta?.textContent).toContain('normal')
    expect(meta?.textContent).toContain('100%')
  })

  it('omits metadata span entirely when neither blend-mode nor opacity is set', () => {
    const { container } = render(
      <Wrap>
        <Harness initial={[{ id: 'plain', name: 'Plain', visible: true, locked: false }]} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="layer-panel-meta-plain"]')).toBeNull()
  })
})

describe('<LayerPanel> selection', () => {
  it('clicking a row calls onSelect and marks it aria-selected', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness onSelectSpy={onSelect} />
      </Wrap>,
    )
    const mid = container.querySelector('[data-mol-id="layer-panel-row-mid"]')!
    fireEvent.click(mid)
    expect(onSelect).toHaveBeenCalledWith('mid')
    expect(mid.getAttribute('aria-selected')).toBe('true')
  })
})

describe('<LayerPanel> visibility + lock toggles', () => {
  it('clicking the eye button toggles visibility and stops row selection', () => {
    const onVis = vi.fn()
    const onSelect = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness onVisibilityToggleSpy={onVis} onSelectSpy={onSelect} />
      </Wrap>,
    )
    const eye = container.querySelector('[data-mol-id="layer-panel-visibility-top"]')!
    fireEvent.click(eye)
    expect(onVis).toHaveBeenCalledWith('top')
    // stopPropagation should prevent the row's onClick from firing.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('clicking the lock button toggles lock', () => {
    const onLock = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness onLockToggleSpy={onLock} />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="layer-panel-lock-bot"]')!)
    expect(onLock).toHaveBeenCalledWith('bot')
  })
})

describe('<LayerPanel> inline rename', () => {
  it('double-click reveals an input and Enter commits the trimmed value', () => {
    const onRename = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness onRenameSpy={onRename} />
      </Wrap>,
    )
    const nameSlot = container.querySelector('[data-mol-id="layer-panel-name-top"]')!.parentElement!
    fireEvent.doubleClick(nameSlot)
    const input = container.querySelector(
      '[data-mol-id="layer-panel-rename-top"]',
    ) as HTMLInputElement
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: '  Background  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledWith('top', 'Background')
  })

  it('Escape cancels rename without committing', () => {
    const onRename = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness onRenameSpy={onRename} />
      </Wrap>,
    )
    const nameSlot = container.querySelector('[data-mol-id="layer-panel-name-top"]')!.parentElement!
    fireEvent.doubleClick(nameSlot)
    const input = container.querySelector(
      '[data-mol-id="layer-panel-rename-top"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Discarded' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onRename).not.toHaveBeenCalled()
  })

  it('empty trimmed input does not commit', () => {
    const onRename = vi.fn()
    const { container } = render(
      <Wrap>
        <Harness onRenameSpy={onRename} />
      </Wrap>,
    )
    const nameSlot = container.querySelector('[data-mol-id="layer-panel-name-top"]')!.parentElement!
    fireEvent.doubleClick(nameSlot)
    const input = container.querySelector(
      '[data-mol-id="layer-panel-rename-top"]',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRename).not.toHaveBeenCalled()
  })

  it('locked layers do not enter rename mode on double-click', () => {
    const { container } = render(
      <Wrap>
        <Harness />
      </Wrap>,
    )
    const nameSlot = container.querySelector('[data-mol-id="layer-panel-name-bot"]')!.parentElement!
    fireEvent.doubleClick(nameSlot)
    expect(container.querySelector('[data-mol-id="layer-panel-rename-bot"]')).toBeNull()
  })
})

describe('<LayerPanel> aria + i18n', () => {
  it('exposes a localized aria-label on the listbox', () => {
    const { container } = render(
      <Wrap>
        <Harness />
      </Wrap>,
    )
    const list = container.querySelector('[data-mol-id="layer-panel"]')!
    expect(list.getAttribute('aria-label')).toBe('Layers')
  })

  it('eye button aria-label flips with visibility state', () => {
    const { container } = render(
      <Wrap>
        <Harness />
      </Wrap>,
    )
    // "top" is visible → label says Hide.
    expect(
      container
        .querySelector('[data-mol-id="layer-panel-visibility-top"]')!
        .getAttribute('aria-label'),
    ).toBe('Hide layer')
    // "bot" is hidden → label says Show.
    expect(
      container
        .querySelector('[data-mol-id="layer-panel-visibility-bot"]')!
        .getAttribute('aria-label'),
    ).toBe('Show layer')
  })
})
