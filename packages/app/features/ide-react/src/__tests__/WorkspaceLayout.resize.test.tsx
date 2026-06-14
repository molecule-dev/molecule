// @vitest-environment jsdom

/**
 * PV6 — the chat ↔ preview/editor resize sash must be IDE-grade.
 *
 * The MVP audit found four real defects in a live render (not a grep):
 *  1. Feeding 2 children into the default 3-panel layout while EVERY pane
 *     `flex-grow:1` made the divider start at the wrong split (~37.5/62.5 not
 *     the configured 25%) and lag the cursor 2× (a leading pane's basis change
 *     was diluted across all grow members).
 *  2. The handle was a near-invisible 4px line with a dead hover transition.
 *  3. It was mouse-only (`onMouseDown`) — no touch on an iPad.
 *  4. (covered by the bond test) the width didn't persist.
 *
 * This mounts the real {@link WorkspaceLayout} + {@link ResizeHandle} with the
 * exact 2-children-vs-3-configs mismatch and asserts the corrected geometry and
 * affordances. Each assertion fails against the reverted code.
 *
 * @module
 */

import { fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import type {
  PanelId,
  WorkspaceLayout as WorkspaceLayoutState,
  WorkspaceProvider as WorkspaceProviderType,
  WorkspaceState,
} from '@molecule/app-ide'
import { I18nProvider, WorkspaceProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { WorkspaceLayout } from '../components/WorkspaceLayout.js'

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

  return new Proxy(
    {},
    {
      get(_t, prop): unknown {
        if (prop === 'cn') return cn
        return token(String(prop))
      },
    },
  ) as unknown as UIClassMap
}

/**
 * The 3-panel default layout (chat 25 / editor 50 / preview 25) — the same
 * shape the bond ships, used to reproduce the 2-children-vs-3-configs case.
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

/**
 * Wrap children with the i18n + workspace context the layout needs.
 * @param props - Wrapper props.
 * @param props.provider - The workspace provider to supply.
 * @param props.children - Children to render inside the layout.
 * @returns The wrapped tree.
 */
function Wrap({
  provider,
  children,
}: {
  provider: WorkspaceProviderType
  children: ReactNode
}): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <WorkspaceProvider provider={provider}>
        <WorkspaceLayout>{children}</WorkspaceLayout>
      </WorkspaceProvider>
    </I18nProvider>
  )
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  // jsdom does not implement pointer capture; the handle calls it on drag.
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = (): void => {}
    Element.prototype.releasePointerCapture = (): void => {}
    Element.prototype.hasPointerCapture = (): boolean => false
  }
})

/** Render the layout with exactly two children (chat + combined main pane). */
function renderTwoPane(resizePanel = vi.fn()): {
  container: HTMLElement
  resizePanel: ReturnType<typeof vi.fn>
} {
  const spy = resizePanel
  const { container } = render(
    <Wrap provider={buildStubProvider(spy)}>
      <div data-testid="chat-pane">chat</div>
      <div data-testid="main-pane">main</div>
    </Wrap>,
  )
  return { container, resizePanel: spy as ReturnType<typeof vi.fn> }
}

describe('WorkspaceLayout resize sash (PV6)', () => {
  it('honors the leading pane basis exactly and only grows the trailing pane', () => {
    const { container } = renderTwoPane()

    const chatWrap = container.querySelector('[data-testid="chat-pane"]')
      ?.parentElement as HTMLElement
    const mainWrap = container.querySelector('[data-testid="main-pane"]')
      ?.parentElement as HTMLElement

    // The leading (chat) pane keeps its configured 25% basis and does NOT grow,
    // so the split starts where the config says — not the diluted ~37.5%.
    expect(chatWrap.style.flexBasis).toBe('25%')
    expect(chatWrap.style.flexGrow).toBe('0')
    expect(chatWrap.style.flexShrink).toBe('0')

    // Only the trailing pane absorbs leftover space.
    expect(mainWrap.style.flexGrow).toBe('1')
  })

  it('renders exactly one divider between two panes, as a wide touch-ready separator', () => {
    const { container } = renderTwoPane()

    const handles = container.querySelectorAll('[data-mol-id="workspace-resize-handle"]')
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
    const { container } = renderTwoPane()
    const handle = container.querySelector('[data-mol-id="workspace-resize-handle"]') as HTMLElement
    const line = handle.querySelector('[aria-hidden="true"]') as HTMLElement

    expect(line.className.split(/\s+/)).toContain('bgBorder')
    expect(line.className.split(/\s+/)).not.toContain('bgPrimary')

    fireEvent.pointerEnter(handle)

    expect(line.className.split(/\s+/)).toContain('bgPrimary')
  })

  it('resizes on a pointer drag (touch/pen/mouse), writing the new size to layout state', () => {
    const { container, resizePanel } = renderTwoPane()
    const handle = container.querySelector('[data-mol-id="workspace-resize-handle"]') as HTMLElement

    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 })
    fireEvent.pointerUp(handle, { clientX: 150, pointerId: 1 })

    // +50px of the 1000px fallback width = +5% → chat 25% becomes 30%.
    expect(resizePanel).toHaveBeenCalledWith('chat', 30)
  })

  it('resizes via the keyboard for a11y (arrow keys nudge the split)', () => {
    const { container, resizePanel } = renderTwoPane()
    const handle = container.querySelector('[data-mol-id="workspace-resize-handle"]') as HTMLElement

    fireEvent.keyDown(handle, { key: 'ArrowRight' })

    // +24px of the 1000px fallback width = +2.4% → chat 25% becomes 27.4%.
    expect(resizePanel).toHaveBeenCalledTimes(1)
    const [panelId, size] = resizePanel.mock.calls[0]
    expect(panelId).toBe('chat')
    expect(size).toBeCloseTo(27.4, 5)
  })
})
