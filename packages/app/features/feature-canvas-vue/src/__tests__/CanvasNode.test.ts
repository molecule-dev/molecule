// @vitest-environment jsdom
/**
 * Unit tests for the Vue `CanvasNode` — a port of
 * `@molecule/app-feature-canvas-react/src/__tests__/CanvasNode.test.tsx`: the
 * same test names and behavioral assertions, rendered with Vue in jsdom and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h } from 'vue'

import { CanvasNode } from '../CanvasNode.js'
import type { CanvasDragInfo, CanvasResizeInfo } from '../types.js'
import { firePointer, mountComponent, type MountedComponent } from './helpers.js'

let mounted: MountedComponent | null = null
let app: ReturnType<typeof createApp> | null = null

afterEach(() => {
  mounted?.unmount()
  mounted = null
  app?.unmount()
  app = null
  document.body.innerHTML = ''
})

describe('<CanvasNode>', () => {
  it('positions the wrapper at canvas-space coords', () => {
    mounted = mountComponent(CanvasNode, { id: 'a', position: { x: 100, y: 50 } })
    const node = mounted.container.querySelector('[data-mol-id="canvas-node-a"]') as HTMLElement
    expect(node.style.left).toBe('100px')
    expect(node.style.top).toBe('50px')
  })

  it('renders as a named group; a selected node is described as Selected', async () => {
    mounted = mountComponent(CanvasNode, { id: 'a', position: { x: 0, y: 0 }, selected: true })
    const node = mounted.container.querySelector('[data-mol-id="canvas-node-a"]') as HTMLElement
    // aria-selected is not valid on a group, and the selectable roles need a
    // listbox/grid/tree parent the application surface is not.
    expect(node.getAttribute('role')).toBe('group')
    expect(node.getAttribute('aria-label')).toBe('Canvas node')
    expect(node.hasAttribute('aria-selected')).toBe(false)
    expect(node.getAttribute('data-selected')).toBe('true')
    const descriptionId = node.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    const description = document.getElementById(descriptionId as string) as HTMLElement
    expect(description.textContent).toBe('Selected')
    expect(description.hidden).toBe(true)
    expect(node.contains(description)).toBe(true)
    await mounted.rerender({ selected: false })
    expect(node.hasAttribute('aria-describedby')).toBe(false)
    expect(node.getAttribute('data-selected')).toBeNull()
    expect(document.getElementById(descriptionId as string)).toBeNull()
    expect(node.getAttribute('role')).toBe('group')
  })

  it('fires onSelect on pointer-down → pointer-up without movement', () => {
    const onSelect = vi.fn()
    mounted = mountComponent(CanvasNode, {
      id: 'a',
      position: { x: 0, y: 0 },
      onSelect,
    })
    const node = mounted.container.querySelector('[data-mol-id="canvas-node-a"]')!
    firePointer(node, 'pointerdown', { clientX: 10, clientY: 10 })
    firePointer(node, 'pointerup', { clientX: 10, clientY: 10 })
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0]![0]).toBe('a')
  })

  it('drags fire onDrag with canvas-space deltas (no surface zoom = 1)', () => {
    const onDrag = vi.fn<(info: CanvasDragInfo) => void>()
    const onSelect = vi.fn()
    mounted = mountComponent(CanvasNode, {
      id: 'a',
      position: { x: 0, y: 0 },
      onDrag,
      onSelect,
    })
    const node = mounted.container.querySelector('[data-mol-id="canvas-node-a"]')!
    firePointer(node, 'pointerdown', { clientX: 0, clientY: 0 })
    firePointer(node, 'pointermove', { clientX: 30, clientY: 40 })
    firePointer(node, 'pointerup', { clientX: 30, clientY: 40 })
    // First drag tick has start=true.
    expect(onDrag).toHaveBeenCalled()
    const first = onDrag.mock.calls[0]![0]
    expect(first.start).toBe(true)
    expect(first.delta).toEqual({ x: 30, y: 40 })
    expect(first.position).toEqual({ x: 30, y: 40 })
    // Last call is the end signal.
    const last = onDrag.mock.calls[onDrag.mock.calls.length - 1]![0]
    expect(last.end).toBe(true)
    // onSelect should NOT have fired because the gesture moved.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('reads zoom from ancestor with data-canvas-zoom and divides delta by it', () => {
    const onDrag = vi.fn<(info: CanvasDragInfo) => void>()
    const host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp(
      defineComponent({
        setup() {
          return () =>
            h('div', { 'data-canvas-zoom': '2' }, [
              h(CanvasNode, { id: 'a', position: { x: 0, y: 0 }, onDrag }),
            ])
        },
      }),
    )
    app.mount(host)
    const node = host.querySelector('[data-mol-id="canvas-node-a"]')!
    firePointer(node, 'pointerdown', { clientX: 0, clientY: 0 })
    firePointer(node, 'pointermove', { clientX: 100, clientY: 60 })
    firePointer(node, 'pointerup', { clientX: 100, clientY: 60 })
    const first = onDrag.mock.calls[0]![0]
    // At zoom 2, screen 100/60 → canvas 50/30.
    expect(first.delta).toEqual({ x: 50, y: 30 })
  })

  it('renders a resize handle when onResize is supplied AND size is set', () => {
    const onResize = vi.fn<(info: CanvasResizeInfo) => void>()
    mounted = mountComponent(CanvasNode, {
      id: 'a',
      position: { x: 0, y: 0 },
      size: { width: 80, height: 40 },
      onResize,
    })
    const handle = mounted.container.querySelector('[data-mol-id="canvas-node-resize-handle-a"]')
    expect(handle).not.toBeNull()
  })

  it('resize gestures fire onResize with canvas-space deltas', () => {
    const onResize = vi.fn<(info: CanvasResizeInfo) => void>()
    mounted = mountComponent(CanvasNode, {
      id: 'a',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      onResize,
    })
    const handle = mounted.container.querySelector(
      '[data-mol-id="canvas-node-resize-handle-a"]',
    ) as HTMLElement
    firePointer(handle, 'pointerdown', { clientX: 0, clientY: 0, pointerId: 2 })
    firePointer(handle, 'pointermove', { clientX: 20, clientY: 10, pointerId: 2 })
    firePointer(handle, 'pointerup', { clientX: 20, clientY: 10, pointerId: 2 })
    expect(onResize).toHaveBeenCalled()
    const first = onResize.mock.calls[0]![0]
    expect(first.size.width).toBe(100)
    expect(first.size.height).toBe(50)
    expect(first.position).toEqual({ x: 10, y: 20 })
  })
})
