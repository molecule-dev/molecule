/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap, real i18n provider,
 * the companion locale bond and the real `CanvasSurface` base.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useRef, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as canvasEngineLocales from '@molecule/app-locales-canvas-engine'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  type CanvasDocument,
  CanvasEngine,
  type CanvasEngineHandle,
  type CanvasSelection,
} from '../index.js'

setClassMap(classMap)
registerLocaleModule(canvasEngineLocales)

/**
 * The README example, verbatim.
 *
 * @returns The editor with its toolbar.
 */
function Editor(): JSX.Element {
  const engine = useRef<CanvasEngineHandle>(null)
  const [doc, setDoc] = useState<CanvasDocument>({
    width: 800,
    height: 600,
    layers: [
      { id: 'card', kind: 'rect', x: 40, y: 40, width: 120, height: 80, fill: '#3b82f6' },
      { id: 'dot', kind: 'ellipse', x: 240, y: 200, width: 60, height: 60, fill: '#f97316' },
    ],
  })
  const [selection, setSelection] = useState<CanvasSelection>(['card', 'dot'])
  return (
    <I18nProvider provider={getI18nProvider()}>
      <button onClick={() => engine.current?.align('left')}>Align left</button>
      <button onClick={() => engine.current?.group()}>Group</button>
      <button onClick={() => engine.current?.undo()}>Undo</button>
      <CanvasEngine
        ref={engine}
        document={doc}
        onChange={setDoc}
        selection={selection}
        onSelectionChange={setSelection}
        snapToGrid
        gridSize={8}
      />
    </I18nProvider>
  )
}

/**
 * Finds the rendered wrapper for a document element.
 *
 * @param id - Element id.
 * @returns The element wrapper, or null when not rendered at top level.
 */
function el(id: string): Element | null {
  return document.querySelector(`[data-canvas-element-id="${id}"]`)
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the layers, aligns the selection, groups it and undoes', () => {
    const { container } = render(<Editor />)

    expect(screen.getByLabelText('Vector canvas editor')).toBeTruthy()
    expect(
      container
        .querySelector('[data-mol-id="canvas-engine"]')
        ?.getAttribute('data-canvas-engine-grid'),
    ).toBe('8')
    expect(el('card')?.querySelector('rect')?.getAttribute('x')).toBe('40')
    expect(el('dot')?.querySelector('ellipse')?.getAttribute('cx')).toBe('270')
    expect(el('card')?.getAttribute('data-selected')).toBe('true')

    // Align left → the ellipse's left edge moves to x=40 (cx = 40 + 30).
    fireEvent.click(screen.getByText('Align left'))
    expect(el('dot')?.querySelector('ellipse')?.getAttribute('cx')).toBe('70')
    expect(el('card')?.querySelector('rect')?.getAttribute('x')).toBe('40')

    // Group → both layers are wrapped in one selected group.
    fireEvent.click(screen.getByText('Group'))
    const group = container.querySelector('[data-canvas-element-kind="group"]')
    expect(group?.getAttribute('data-selected')).toBe('true')
    expect(group?.querySelector('rect')).not.toBeNull()
    expect(group?.querySelector('ellipse')).not.toBeNull()

    // Undo twice → back to the original, ungrouped document.
    fireEvent.click(screen.getByText('Undo'))
    expect(container.querySelector('[data-canvas-element-kind="group"]')).toBeNull()
    fireEvent.click(screen.getByText('Undo'))
    expect(el('dot')?.querySelector('ellipse')?.getAttribute('cx')).toBe('270')
  })
})
