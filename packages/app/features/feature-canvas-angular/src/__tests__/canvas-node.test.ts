// @vitest-environment jsdom
/**
 * Unit tests for the Angular `CanvasNode` — a port of
 * `@molecule/app-feature-canvas-react/src/__tests__/CanvasNode.test.tsx`: the
 * same test names and behavioral assertions, mounted through Angular's real
 * renderer and asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import type { CanvasDragInfo, CanvasResizeInfo } from '../types.js'
import { type Mounted, mountNode, pointer } from './helpers.js'

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown>, inner = ''): Promise<Mounted> => {
  const m = await mountNode(props, inner)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('<CanvasNode>', () => {
  it('positions the wrapper at canvas-space coords', async () => {
    const m = await render({ id: 'a', position: { x: 100, y: 50 } })
    const node = m.host.querySelector('[data-mol-id="canvas-node-a"]') as HTMLElement
    expect(node.style.left).toBe('100px')
    expect(node.style.top).toBe('50px')
  })

  it('renders as a named group; a selected node is described as Selected', async () => {
    const m = await render({ id: 'a', position: { x: 0, y: 0 }, selected: true })
    const node = m.host.querySelector('[data-mol-id="canvas-node-a"]') as HTMLElement
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
    await m.setProps({ selected: false })
    expect(node.hasAttribute('aria-describedby')).toBe(false)
    expect(node.getAttribute('data-selected')).toBeNull()
    expect(document.getElementById(descriptionId as string)).toBeNull()
    expect(node.getAttribute('role')).toBe('group')
  })

  it('fires onSelect on pointer-down → pointer-up without movement', async () => {
    const onSelect = vi.fn()
    const m = await render({ id: 'a', position: { x: 0, y: 0 }, onSelect })
    const node = m.host.querySelector('[data-mol-id="canvas-node-a"]')!
    pointer(node, 'pointerdown', 10, 10)
    pointer(node, 'pointerup', 10, 10)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0]![0]).toBe('a')
  })

  it('drags fire onDrag with canvas-space deltas (no surface zoom = 1)', async () => {
    const onDrag = vi.fn<(info: CanvasDragInfo) => void>()
    const onSelect = vi.fn()
    const m = await render({ id: 'a', position: { x: 0, y: 0 }, onDrag, onSelect })
    const node = m.host.querySelector('[data-mol-id="canvas-node-a"]')!
    pointer(node, 'pointerdown', 0, 0)
    pointer(node, 'pointermove', 30, 40)
    pointer(node, 'pointerup', 30, 40)
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

  it('reads zoom from ancestor with data-canvas-zoom and divides delta by it', async () => {
    const onDrag = vi.fn<(info: CanvasDragInfo) => void>()
    const m = await render({ id: 'a', position: { x: 0, y: 0 }, onDrag }, '')
    // Wrap the node the way the surface's canvas-space layer does.
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-canvas-zoom', '2')
    m.host.appendChild(wrapper)
    wrapper.appendChild(m.host.querySelector('[data-mol-id="canvas-node-a"]')!)
    const node = wrapper.querySelector('[data-mol-id="canvas-node-a"]')!
    pointer(node, 'pointerdown', 0, 0)
    pointer(node, 'pointermove', 100, 60)
    pointer(node, 'pointerup', 100, 60)
    const first = onDrag.mock.calls[0]![0]
    // At zoom 2, screen 100/60 → canvas 50/30.
    expect(first.delta).toEqual({ x: 50, y: 30 })
  })

  it('renders a resize handle when onResize is supplied AND size is set', async () => {
    const onResize = vi.fn<(info: CanvasResizeInfo) => void>()
    const m = await render({
      id: 'a',
      position: { x: 0, y: 0 },
      size: { width: 80, height: 40 },
      onResize,
    })
    const handle = m.host.querySelector('[data-mol-id="canvas-node-resize-handle-a"]')
    expect(handle).not.toBeNull()
  })

  it('resize gestures fire onResize with canvas-space deltas', async () => {
    const onResize = vi.fn<(info: CanvasResizeInfo) => void>()
    const m = await render({
      id: 'a',
      position: { x: 10, y: 20 },
      size: { width: 80, height: 40 },
      onResize,
    })
    const handle = m.host.querySelector(
      '[data-mol-id="canvas-node-resize-handle-a"]',
    ) as HTMLElement
    pointer(handle, 'pointerdown', 0, 0, 2)
    pointer(handle, 'pointermove', 20, 10, 2)
    pointer(handle, 'pointerup', 20, 10, 2)
    expect(onResize).toHaveBeenCalled()
    const first = onResize.mock.calls[0]![0]
    expect(first.size.width).toBe(100)
    expect(first.size.height).toBe(50)
    expect(first.position).toEqual({ x: 10, y: 20 })
  })
})
