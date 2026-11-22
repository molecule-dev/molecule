// @vitest-environment jsdom

/**
 * PV6 — the chat ↔ preview/editor resize sash must be IDE-grade.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/WorkspaceLayout.resize.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Svelte 5's own `mount`/`flushSync`. It reproduces the 2-children-vs-3-configs
 * mismatch and asserts the corrected geometry and affordances.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  PanelId,
  WorkspaceLayout as WorkspaceLayoutState,
  WorkspaceProvider as WorkspaceProviderType,
  WorkspaceState,
} from '@molecule/app-ide'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import WorkspaceLayoutHost from './WorkspaceLayoutHost.svelte'

/**
 * A ClassMap stub whose every member resolves to its own key as a class token,
 * so a component's composed token set is observable (e.g. `bgPrimary` vs
 * `bgBorder`) without a concrete styling bond.
 * @returns A stub {@link UIClassMap}.
 */
function buildStubClassMap(): UIClassMap {
  const token = (name: string): ((...args: unknown[]) => string) => {
    const fn = (..._args: unknown[]): string => name
    return new Proxy(fn, {
      get(_t, key) {
        if (key === 'toString' || key === 'valueOf' || key === Symbol.toPrimitive) {
          return () => name
        }
        return undefined
      },
    }) as (...args: unknown[]) => string
  }

  const cn = (...classes: unknown[]): string => {
    const out: string[] = []
    const walk = (c: unknown): void => {
      if (Array.isArray(c)) c.forEach(walk)
      else if (typeof c === 'string') {
        if (c) out.push(c)
      } else if (typeof c === 'function') {
        const s = String(c)
        if (s) out.push(s)
      }
    }
    classes.forEach(walk)
    return out.join(' ')
  }

  return new Proxy({} as UIClassMap, {
    get(_t, prop): unknown {
      if (prop === 'cn') return cn
      return token(String(prop))
    },
  })
}

/**
 * The 3-panel default layout (chat 25 / editor 50 / preview 25) — the same
 * shape the bond ships, used to reproduce the 2-children-vs-3-configs case.
 * @returns The workspace layout.
 */
function buildLayout(): WorkspaceLayoutState {
  return {
    panels: [
      { id: 'chat', position: 'left', defaultSize: 25, resizable: true, visible: true },
      { id: 'editor', position: 'center', defaultSize: 50, resizable: true, visible: true },
      { id: 'preview', position: 'right', defaultSize: 25, resizable: true, visible: true },
    ],
    sizes: { left: [25], center: [50], right: [25], bottom: [] },
  }
}

/**
 * A minimal {@link WorkspaceProviderType} returning a fixed 3-panel layout, with
 * `resizePanel` spied so drag/keyboard resizes are observable end to end.
 * @param resizePanel - The spy to wire as `resizePanel`.
 * @returns A stub workspace provider.
 */
function buildStubProvider(
  resizePanel: (id: PanelId, size: number) => void,
): WorkspaceProviderType {
  const layout = buildLayout()
  const state: WorkspaceState = {
    layout,
    activePanel: null,
    collapsedPanels: new Set(),
    isFullscreen: false,
  }
  return {
    name: 'stub',
    getLayout: () => state.layout,
    setLayout: () => {},
    togglePanel: () => {},
    resizePanel,
    setActivePanel: () => {},
    subscribe: () => () => {},
    resetLayout: () => {},
  }
}

/** The mount alive right now, if any. */
let instance: ReturnType<typeof mount> | null = null
/** The container the current mount rendered into. */
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(buildStubClassMap())
  // jsdom does not implement pointer capture; the handle calls it on drag.
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = (): void => {}
    Element.prototype.releasePointerCapture = (): void => {}
    Element.prototype.hasPointerCapture = (): boolean => false
  }
})

afterEach(() => {
  if (instance) {
    unmount(instance)
    instance = null
  }
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

/**
 * Render the layout with exactly two children (chat + combined main pane)
 * through a real Svelte root with the workspace and i18n services.
 * @param resizePanel - The spy to wire as the workspace provider's `resizePanel`.
 * @returns The container and the spy.
 */
function renderTwoPane(resizePanel = vi.fn()): {
  container: HTMLElement
  resizePanel: ReturnType<typeof vi.fn>
} {
  if (instance) {
    unmount(instance)
    instance = null
  }
  document.body.innerHTML = ''
  const root = document.createElement('div')
  document.body.appendChild(root)
  instance = mount(WorkspaceLayoutHost, {
    target: root,
    props: { workspace: buildStubProvider(resizePanel) },
  })
  flushSync()
  container = root
  return { container: root, resizePanel }
}

describe('WorkspaceLayout resize sash (PV6)', () => {
  it('honors the leading pane basis exactly and only grows the trailing pane', () => {
    const { container: root } = renderTwoPane()

    const chatWrap = root.querySelector('[data-testid="chat-pane"]')?.parentElement as HTMLElement
    const mainWrap = root.querySelector('[data-testid="main-pane"]')?.parentElement as HTMLElement

    // The leading (chat) pane keeps its configured 25% basis and does NOT grow,
    // so the split starts where the config says — not the diluted ~37.5%.
    expect(chatWrap.style.flexBasis).toBe('25%')
    expect(chatWrap.style.flexGrow).toBe('0')
    expect(chatWrap.style.flexShrink).toBe('0')

    // Only the trailing pane absorbs leftover space.
    expect(mainWrap.style.flexGrow).toBe('1')
  })

  it('renders exactly one divider between two panes, as a wide touch-ready separator', () => {
    const { container: root } = renderTwoPane()

    const handles = root.querySelectorAll('[data-mol-id="workspace-resize-handle"]')
    expect(handles).toHaveLength(1)

    const handle = handles[0] as HTMLElement
    expect(handle.getAttribute('role')).toBe('separator')
    expect(handle.getAttribute('aria-orientation')).toBe('vertical')
    // Keyboard-operable.
    expect(handle.getAttribute('tabindex')).toBe('0')
    // Wider grab zone than the old 4px line, and a real touch target.
    expect(handle.style.width).toBe('11px')
    expect(handle.style.touchAction).toBe('none')
  })

  it('brightens the divider to the primary color on hover (live affordance)', () => {
    const { container: root } = renderTwoPane()
    const handle = root.querySelector('[data-mol-id="workspace-resize-handle"]') as HTMLElement
    const line = handle.querySelector('[aria-hidden="true"]') as HTMLElement

    expect(line.className.split(/\s+/)).toContain('bgBorder')
    expect(line.className.split(/\s+/)).not.toContain('bgPrimary')

    handle.dispatchEvent(new Event('pointerover', { bubbles: true }))
    flushSync()

    expect(line.className.split(/\s+/)).toContain('bgPrimary')
  })

  it('resizes on a pointer drag (touch/pen/mouse), writing the new size to layout state', () => {
    const { container: root, resizePanel } = renderTwoPane()
    const handle = root.querySelector('[data-mol-id="workspace-resize-handle"]') as HTMLElement

    handle.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 100, pointerId: 1, bubbles: true }),
    )
    handle.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 150, pointerId: 1, bubbles: true }),
    )
    handle.dispatchEvent(
      new PointerEvent('pointerup', { clientX: 150, pointerId: 1, bubbles: true }),
    )
    flushSync()

    // +50px of the 1000px fallback width = +5% → chat 25% becomes 30%.
    expect(resizePanel).toHaveBeenCalledWith('chat', 30)
  })

  it('resizes via the keyboard for a11y (arrow keys nudge the split)', () => {
    const { container: root, resizePanel } = renderTwoPane()
    const handle = root.querySelector('[data-mol-id="workspace-resize-handle"]') as HTMLElement

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    flushSync()

    // +24px of the 1000px fallback width = +2.4% → chat 25% becomes 27.4%.
    expect(resizePanel).toHaveBeenCalledTimes(1)
    const [panelId, size] = resizePanel.mock.calls[0]
    expect(panelId).toBe('chat')
    expect(size).toBeCloseTo(27.4, 5)
  })
})
