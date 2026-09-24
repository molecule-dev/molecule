// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type DrawingTool, DrawingToolbar } from '../index.js'

// Labels feed aria-label/title verbatim — translate them in a localized app.
const TOOLS: DrawingTool[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'pen', label: 'Pen', icon: '✎' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'eraser', label: 'Eraser', icon: '⌫' },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered whiteboard tools.
 */
function WhiteboardTools(): React.JSX.Element {
  const [tool, setTool] = useState('select')
  return (
    <div>
      <DrawingToolbar tools={TOOLS} selectedId={tool} onSelect={setTool} orientation="horizontal" />
      <canvas
        width={640}
        height={360}
        data-tool={tool}
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
      />
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders a labelled toolbar and moves the selection on click', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <WhiteboardTools />
      </I18nProvider>,
    )
    const toolbar = view.getByRole('toolbar', { name: 'Drawing tools' })
    const buttons = Array.from(toolbar.querySelectorAll('button'))
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Select',
      'Pen',
      'Rectangle',
      'Eraser',
    ])
    expect(view.getByRole('button', { name: 'Select' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(view.getByRole('button', { name: 'Pen' }))
    expect(view.getByRole('button', { name: 'Pen' }).getAttribute('aria-pressed')).toBe('true')
    expect(view.getByRole('button', { name: 'Select' }).getAttribute('aria-pressed')).toBe('false')
    const canvas = view.container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.getAttribute('data-tool')).toBe('pen')
    expect(canvas.style.cursor).toBe('crosshair')
  })
})
