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

import { MindMapCanvas, type MindMapNode } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The project mind map.
 */
function ProjectMindMap(): React.JSX.Element {
  const [root, setRoot] = useState<MindMapNode>({
    id: 'r',
    text: 'Project',
    children: [
      { id: 'plan', text: 'Plan', children: [{ id: 'scope', text: 'Scope', children: [] }] },
      { id: 'build', text: 'Build', children: [] },
    ],
  })
  // Controlled: every fold / rename / add-child hands back the next tree — persist it here.
  return (
    <MindMapCanvas root={root} onChange={setRoot} layout="horizontal" width={960} height={540} />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the tree and applies fold, add-child and rename through onChange', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ProjectMindMap />
      </I18nProvider>,
    )
    const q = (id: string): Element | null => view.container.querySelector(`[data-mol-id="${id}"]`)
    expect(q('mind-map-node-text-r')?.textContent).toBe('Project')
    expect(q('mind-map-node-text-scope')?.textContent).toBe('Scope')

    // fold "Plan": its child disappears
    fireEvent.click(q('mind-map-node-toggle-plan') as Element)
    expect(q('mind-map-node-text-scope')).toBeNull()
    expect(q('mind-map-node-toggle-plan')?.getAttribute('aria-label')).toBe('Expand subtree')

    // add a child under "Build"
    fireEvent.click(q('mind-map-node-add-build') as Element)
    expect(view.getByText('New idea')).toBeTruthy()

    // rename "Build"
    fireEvent.doubleClick(q('mind-map-node-body-build') as Element)
    const input = view.getByLabelText('Edit node text')
    fireEvent.change(input, { target: { value: 'Ship' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(q('mind-map-node-text-build')?.textContent).toBe('Ship')
  })
})
