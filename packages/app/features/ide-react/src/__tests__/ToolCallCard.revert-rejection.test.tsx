// @vitest-environment jsdom

/**
 * A host whose file revert rejects must not leave an unhandled promise
 * rejection behind: `handleRevert` catches the failure, logs it through the
 * module's logger, and leaves the card exactly as it was (still not undone,
 * its toggle never announced).
 *
 * Before the catch existed, the rejected `onFileRevert` promise escaped the
 * async click handler — an unhandled rejection — and nothing was logged.
 *
 * @module
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * Wrap a card in the contexts it mounts in.
 *
 * @param children - The card.
 * @returns The wrapped tree.
 */
function wrap(children: ReactNode): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
    </I18nProvider>
  )
}

/** The props an undoable `edit_file` card carries. */
const EDIT_PROPS = {
  id: 'tc-1',
  name: 'edit_file',
  input: { path: 'src/app.ts', old_string: 'a', new_string: 'b' },
  output: { diff: { type: 'modified', added: 1, removed: 1 } },
  status: 'done',
  fileDiff: { original: 'a', modified: 'b' },
} satisfies Partial<ToolCallCardProps>

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('ToolCallCard — a revert the host rejects', () => {
  it('logs the failure and leaves the card un-reverted', async () => {
    const warn = vi.spyOn(getLogger('tool-call-card'), 'warn')
    const onUndoToggle = vi.fn()
    const onFileRevert = vi.fn(() => Promise.reject(new Error('disk full')))
    const { container } = render(
      wrap(
        <ToolCallCard {...EDIT_PROPS} onFileRevert={onFileRevert} onUndoToggle={onUndoToggle} />,
      ),
    )

    const undo = container.querySelector('[title="Undo this change"]') as HTMLElement
    expect(undo).not.toBeNull()
    fireEvent.click(undo)

    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith('tool-call-card: reverting a file change failed', {
        error: expect.any(Error),
        path: 'src/app.ts',
      })
    })

    // The card stays exactly as it was: still offering undo, never announced undone.
    expect(onUndoToggle).not.toHaveBeenCalled()
    expect(container.querySelector('[title="Undo this change"]')).not.toBeNull()
    // The busy state cleared, so the control can be tried again.
    await waitFor(() => {
      expect(
        (container.querySelector('[title="Undo this change"]') as HTMLElement).style.cursor,
      ).toBe('pointer')
    })
    warn.mockRestore()
  })
})
