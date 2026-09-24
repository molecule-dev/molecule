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

import { type GraphEdge, type GraphNode, GraphView } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered note graph.
 */
function NoteGraph(): React.JSX.Element {
  const notes = [
    { id: 'inbox', title: 'Inbox', linkCount: 2 },
    { id: 'ideas', title: 'Ideas', linkCount: 1 },
    { id: 'reading', title: 'Reading list', linkCount: 1 },
  ]
  const links = [
    { id: 'l1', from: 'inbox', to: 'ideas' },
    { id: 'l2', from: 'inbox', to: 'reading' },
  ]
  const [selectedId, setSelectedId] = useState<string>()
  const nodes: GraphNode[] = notes.map((n) => ({ id: n.id, label: n.title, weight: n.linkCount }))
  const edges: GraphEdge[] = links.map((l) => ({ id: l.id, source: l.from, target: l.to }))
  return (
    <div style={{ height: 480 }}>
      <GraphView
        nodes={nodes}
        edges={edges}
        selectedNodeId={selectedId}
        onNodeClick={(node) => setSelectedId(node.id)}
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

  it('renders every note and edge, and selects a node when it is clicked', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <NoteGraph />
      </I18nProvider>,
    )
    expect(view.getByText('Inbox')).toBeTruthy()
    expect(view.getByText('Ideas')).toBeTruthy()
    expect(view.getByText('Reading list')).toBeTruthy()
    expect(view.container.querySelectorAll('line')).toHaveLength(2)
    const selected = (): Element | null => view.container.querySelector('[data-selected="true"]')
    expect(selected()).toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Node Ideas' }))
    expect(selected()?.getAttribute('data-mol-id')).toBe('graph-view-node-ideas')
  })
})
