// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FlowCanvas, type FlowEdge, type FlowNode } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered workflow builder.
 */
function WorkflowBuilder(): React.JSX.Element {
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: 'signup', type: 'step', position: { x: 40, y: 40 }, data: { label: 'New signup' } },
    {
      id: 'email',
      type: 'step',
      position: { x: 320, y: 40 },
      data: { label: 'Send welcome email' },
    },
    { id: 'slack', type: 'step', position: { x: 600, y: 40 }, data: { label: 'Notify #sales' } },
  ])
  const [edges, setEdges] = useState<FlowEdge[]>([{ id: 'e1', source: 'signup', target: 'email' }])
  return (
    <div style={{ height: 480 }}>
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        onChange={(next) => {
          setNodes(next.nodes)
          setEdges(next.edges)
        }}
        nodeRenderers={{ step: (n) => <strong>{(n.data as { label: string }).label}</strong> }}
      />
    </div>
  )
}

/** A fixed 800×480 rect at the origin so client → world math is stable in jsdom. */
const RECT = {
  left: 0,
  top: 0,
  right: 800,
  bottom: 480,
  width: 800,
  height: 480,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT)
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  })
  afterEach(() => {
    cleanup()
  })
  afterAll(() => {
    vi.restoreAllMocks()
  })

  it('renders the graph, connects two steps, drags a node and deletes an edge', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <WorkflowBuilder />
      </I18nProvider>,
    )
    const q = (id: string): HTMLElement | null =>
      view.container.querySelector<HTMLElement>(`[data-mol-id="${id}"]`)
    expect(view.getByRole('application', { name: 'Flow canvas' })).toBeTruthy()
    expect(q('flow-canvas-node-signup')?.textContent).toContain('New signup')
    expect(q('flow-canvas-node-email')?.textContent).toContain('Send welcome email')
    expect(q('flow-canvas-edge-e1')).not.toBeNull()

    // Connect "Send welcome email" → "Notify #sales" by dragging its handle.
    fireEvent.pointerDown(q('flow-canvas-node-handle-email') as HTMLElement, {
      button: 0,
      pointerId: 1,
      clientX: 500,
      clientY: 80,
    })
    fireEvent.pointerUp(q('flow-canvas-node-slack') as HTMLElement, {
      button: 0,
      pointerId: 1,
      clientX: 620,
      clientY: 80,
    })
    const newEdge = view.container.querySelector('[data-mol-id^="flow-canvas-edge-e-email-slack-"]')
    expect(newEdge).not.toBeNull()

    // Drag "New signup" 20px right / 10px down — the new position is fed back through state.
    const signup = q('flow-canvas-node-signup') as HTMLElement
    fireEvent.pointerDown(signup, { button: 0, pointerId: 2, clientX: 60, clientY: 60 })
    fireEvent.pointerMove(signup, { pointerId: 2, clientX: 80, clientY: 70 })
    fireEvent.pointerUp(signup, { pointerId: 2, clientX: 80, clientY: 70 })
    expect(q('flow-canvas-node-signup')?.style.transform).toBe('translate(60px, 50px)')

    // Select the original edge and delete it with the keyboard.
    fireEvent.click(q('flow-canvas-edge-hit-e1') as HTMLElement)
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(q('flow-canvas-edge-e1')).toBeNull()
    expect(q('flow-canvas-node-signup')).not.toBeNull()
  })
})
