// @vitest-environment jsdom

/**
 * A host whose file revert rejects must not leave an unhandled promise
 * rejection behind: `handleRevert` catches the failure, logs it through the
 * module's logger, and leaves the card exactly as it was (still not undone,
 * its toggle never announced). A port of
 * `@molecule/app-ide-react/src/__tests__/ToolCallCard.revert-rejection.test.tsx`
 * with the same test name and the same assertions, mounted through Vue's own
 * `createApp`.
 *
 * Before the catch existed, the rejected `onFileRevert` promise escaped the
 * async click handler — an unhandled rejection — and nothing was logged.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
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

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Render one tool call inside the contexts it mounts in.
 *
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderCall(overrides: Record<string, unknown> = {}): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild =>
        h(ToolCallCard, {
          ...EDIT_PROPS,
          ...overrides,
        }),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
  return host
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
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

    await nextTick()
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
