/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap, real i18n provider and
 * the companion locale bond.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as canvasLocales from '@molecule/app-locales-feature-canvas'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  CanvasEdge,
  CanvasNode,
  CanvasSurface,
  useCanvasSelection,
  useCanvasViewport,
} from '../index.js'

setClassMap(classMap)
registerLocaleModule(canvasLocales)

const size = { width: 120, height: 48 }

/**
 * The README example, verbatim.
 *
 * @returns The board.
 */
function Board(): JSX.Element {
  const { viewport, setViewport } = useCanvasViewport()
  const { selected, select } = useCanvasSelection()
  const [nodes, setNodes] = useState([
    { id: 'idea', label: 'Idea', position: { x: 40, y: 40 } },
    { id: 'plan', label: 'Plan', position: { x: 280, y: 160 } },
  ])
  const [a, b] = nodes
  return (
    <I18nProvider provider={getI18nProvider()}>
      <CanvasSurface viewport={viewport} onViewportChange={setViewport} width={800} height={600}>
        <CanvasEdge
          from={{ x: a.position.x + size.width, y: a.position.y + size.height / 2 }}
          to={{ x: b.position.x, y: b.position.y + size.height / 2 }}
          kind="bezier"
        />
        {nodes.map((node) => (
          <CanvasNode
            key={node.id}
            id={node.id}
            position={node.position}
            size={size}
            selected={selected.has(node.id)}
            onSelect={(id, e) => id && select([id], e.shiftKey)}
            onDrag={({ position }) =>
              setNodes((list) => list.map((n) => (n.id === node.id ? { ...n, position } : n)))
            }
          >
            {node.label}
          </CanvasNode>
        ))}
      </CanvasSurface>
    </I18nProvider>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders nodes + edge, selects on click and moves a node on drag', () => {
    const { container, getByLabelText } = render(<Board />)
    expect(getByLabelText('Canvas surface')).toBeTruthy()
    expect(
      container.querySelector('[data-mol-id="canvas-edge"]')?.getAttribute('data-edge-kind'),
    ).toBe('bezier')

    const idea = container.querySelector('[data-mol-id="canvas-node-idea"]') as HTMLElement
    expect(idea.textContent).toBe('Idea')
    expect(idea.style.left).toBe('40px')
    expect(idea.getAttribute('aria-label')).toBe('Canvas node')

    // A press that does not move selects.
    fireEvent.pointerDown(idea, {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientX: 50,
      clientY: 50,
    })
    fireEvent.pointerUp(idea, { pointerId: 1, clientX: 50, clientY: 50 })
    expect(idea.getAttribute('data-selected')).toBe('true')

    // A press that moves drags; the example writes the position back.
    const edgeBefore = container.querySelector('[data-mol-id="canvas-edge"]')?.getAttribute('style')
    fireEvent.pointerDown(idea, {
      pointerId: 2,
      button: 0,
      pointerType: 'mouse',
      clientX: 50,
      clientY: 50,
    })
    fireEvent.pointerMove(idea, { pointerId: 2, clientX: 80, clientY: 70 })
    fireEvent.pointerUp(idea, { pointerId: 2, clientX: 80, clientY: 70 })
    expect(idea.style.left).toBe('70px')
    expect(idea.style.top).toBe('60px')
    // The edge follows because its endpoints are derived from node state.
    expect(container.querySelector('[data-mol-id="canvas-edge"]')?.getAttribute('style')).not.toBe(
      edgeBefore,
    )
  })
})
