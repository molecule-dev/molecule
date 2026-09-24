/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the default workspace bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-ide-default'

import type { WorkspaceState } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('drives collapse, active panel and sizes through the bonded workspace', () => {
    setProvider(provider)
    const workspace = requireProvider()
    workspace.resetLayout()

    const seen: Array<[string[], string | null, number[]]> = []
    const unsubscribe = workspace.subscribe((state: WorkspaceState) => {
      seen.push([[...state.collapsedPanels], state.activePanel, state.layout.sizes.left])
    })

    workspace.togglePanel('chat')
    workspace.setActivePanel('editor')
    workspace.resizePanel('chat', 30)
    expect(workspace.getLayout().panels.map((panel) => panel.id)).toEqual([
      'chat',
      'editor',
      'preview',
    ])

    expect(seen).toEqual([
      [['chat'], null, [25]],
      [['chat'], 'editor', [25]],
      [['chat'], 'editor', [30]],
    ])

    unsubscribe()
    workspace.togglePanel('chat')
    expect(seen).toHaveLength(3)
  })
})
