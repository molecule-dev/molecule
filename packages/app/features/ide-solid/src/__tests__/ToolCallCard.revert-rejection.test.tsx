// @vitest-environment jsdom

/**
 * A host whose file revert rejects must not leave an unhandled promise
 * rejection behind: `handleRevert` catches the failure, logs it through the
 * module's logger, and leaves the card exactly as it was (still not undone,
 * its toggle never announced). A port of
 * `@molecule/app-ide-react/src/__tests__/ToolCallCard.revert-rejection.test.tsx`
 * with the same test name and the same assertions, mounted as a real Solid
 * root under the theme provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** The props an undoable `edit_file` card carries. */
const EDIT_PROPS = {
  id: 'tc-1',
  name: 'edit_file',
  input: { path: 'src/app.ts', old_string: 'a', new_string: 'b' },
  output: { diff: { type: 'modified', added: 1, removed: 1 } },
  status: 'done',
  fileDiff: { original: 'a', modified: 'b' },
} satisfies Partial<ToolCallCardProps>

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void; container?: HTMLElement } = {}

/**
 * Render one tool call inside the contexts it mounts in.
 *
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderCall(overrides: Partial<ToolCallCardProps> = {}): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.container = container
  mounted.dispose = render(
    () => (
      <MoleculeProvider theme={buildThemeProvider()}>
        <ToolCallCard {...EDIT_PROPS} {...overrides} />
      </MoleculeProvider>
    ),
    container,
  )
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('ToolCallCard — a revert the host rejects', () => {
  it('logs the failure and leaves the card un-reverted', async () => {
    const warn = vi.spyOn(getLogger('tool-call-card'), 'warn')
    const onUndoToggle = vi.fn()
    const onFileRevert = vi.fn(() => Promise.reject(new Error('disk full')))
    const container = renderCall({ onFileRevert, onUndoToggle })

    const undo = container.querySelector('[title="Undo this change"]') as HTMLElement
    expect(undo).not.toBeNull()
    undo.click()

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith('tool-call-card: reverting a file change failed', {
        error: expect.any(Error),
        path: 'src/app.ts',
      })
    })

    // The card stays exactly as it was: still offering undo, never announced undone.
    expect(onUndoToggle).not.toHaveBeenCalled()
    expect(container.querySelector('[title="Undo this change"]')).not.toBeNull()
    // The busy state cleared, so the control can be tried again.
    await vi.waitFor(() => {
      expect(
        (container.querySelector('[title="Undo this change"]') as HTMLElement).style.cursor,
      ).toBe('pointer')
    })
    warn.mockRestore()
  })
})
