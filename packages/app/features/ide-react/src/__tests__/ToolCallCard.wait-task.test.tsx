// @vitest-environment jsdom

/**
 * A `wait_for_task` card carries only the opaque task id in its input; the
 * command it is waiting on lives on the earlier `exec_command` that returned
 * that id, which the chat panel publishes through
 * {@link BackgroundTaskCommandsContext}. This drives the WIRING — context →
 * ToolCallCard label — which is the only place the two ends meet: the pure
 * helpers are covered in background-task-context.test.ts, but nothing pinned
 * the card reading the map. Without it the card regresses to a bare task id
 * while every helper test still passes.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BackgroundTaskCommandsContext } from '../components/background-task-context.js'
import { ToolCallCard } from '../components/ToolCallCard.js'
import type { ToolCallCardProps } from '../types.js'

/** A minimal light theme so `useThemeMode` resolves. */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

const TASK_ID = 'mol-bg-abc-123'
const COMMAND = 'npm run build'

/**
 * Wrap a card in the contexts it mounts in, plus the background-task map.
 *
 * @param children - The card.
 * @param commands - The task-id → command map the panel publishes (empty by default).
 * @returns The wrapped tree.
 */
function wrap(
  children: ReactNode,
  commands: ReadonlyMap<string, string> = new Map<string, string>(),
): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <BackgroundTaskCommandsContext.Provider value={commands}>
          {children}
        </BackgroundTaskCommandsContext.Provider>
      </ThemeProvider>
    </I18nProvider>
  )
}

/**
 * Render a `wait_for_task` card.
 *
 * @param commands - The task-id → command map the panel publishes.
 * @param overrides - Prop overrides.
 * @returns The rendered container.
 */
function renderWait(
  commands: ReadonlyMap<string, string>,
  overrides: Partial<ToolCallCardProps> = {},
): HTMLElement {
  const { container } = render(
    wrap(
      <ToolCallCard
        id="tc-wait"
        name="wait_for_task"
        input={{ taskId: TASK_ID }}
        status="done"
        output={{ taskId: TASK_ID, exitCode: 0 }}
        {...overrides}
      />,
      commands,
    ),
  )
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('ToolCallCard — wait_for_task names the command from the transcript map', () => {
  it('names the background command the wait is for, not just its task id', () => {
    const container = renderWait(new Map([[TASK_ID, COMMAND]]))

    expect(container.textContent).toContain('Wait for')
    expect(container.textContent).toContain(COMMAND)
    // The id is the fallback, not the answer, once the command is known.
    expect(container.textContent).not.toContain(TASK_ID)
  })

  it('falls back to the task id when the starting command is not in the transcript', () => {
    // A wait whose `exec_command` predates the loaded transcript window: the
    // id is then the only thing the card can honestly say.
    const container = renderWait(new Map())

    expect(container.textContent).toContain(TASK_ID)
    expect(container.textContent).not.toContain(COMMAND)
  })
})
