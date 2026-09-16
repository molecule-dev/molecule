// @vitest-environment jsdom

/**
 * Skipping the executor's in-flight tool call, and saying so honestly.
 *
 * Measured on production (X0 rehearsal 84): the person watches a command run
 * for minutes with nothing to do but wait. The Skip drops THAT call without
 * ending the turn — and the result it produces must never read as a success,
 * because a command that did not run is not a command that worked.
 *
 * @module
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { isSkippedByUser, toolSummary } from '../components/tool-call-utilities.js'
import { ToolCallCard } from '../components/ToolCallCard.js'
import type { ToolCallCardProps } from '../types.js'

/** The output the API sends back for a call the person skipped. */
const SKIPPED_OUTPUT = {
  status: 'skipped_by_user',
  message: 'This command did not run to completion — the person skipped it.',
}

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

/**
 * Render one tool call.
 *
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderCall(overrides: Partial<ToolCallCardProps> = {}): HTMLElement {
  const { container } = render(
    wrap(
      <ToolCallCard
        id="tc-1"
        name="exec_command"
        input={{ command: 'npx playwright test' }}
        status="running"
        {...overrides}
      />,
    ),
  )
  return container
}

const molId = (container: HTMLElement, id: string): HTMLElement | null =>
  container.querySelector(`[data-mol-id="${id}"]`)

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('ToolCallCard — Skip on a running call', () => {
  it('offers Skip while the call is running, and hands the host its id', () => {
    const skipped: string[] = []
    const container = renderCall({
      onSkip: (id) => {
        skipped.push(id)
      },
    })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    expect(skip).not.toBeNull()
    expect(skip.textContent).toBe('Skip')
    fireEvent.click(skip)
    expect(skipped).toEqual(['tc-1'])
  })

  it('is a real button, not a control nested inside the row button', () => {
    const container = renderCall({ onSkip: () => {} })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    expect(skip.tagName).toBe('BUTTON')
    expect(skip.closest('button')).toBe(skip)
  })

  it('renders as a filled button, never as a text link', () => {
    const container = renderCall({ onSkip: () => {} })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    const solid = classMap.button({ variant: 'solid', color: 'primary', size: 'xs' })
    const ghost = classMap.button({ variant: 'ghost', size: 'xs' })
    expect(solid).not.toBe(ghost)
    for (const token of solid.split(/\s+/).filter(Boolean)) {
      expect(skip.classList.contains(token), `missing ${token}`).toBe(true)
    }
    for (const token of ghost.split(/\s+/).filter(Boolean)) {
      if (solid.split(/\s+/).includes(token)) continue
      expect(skip.classList.contains(token), `ghost token ${token} present`).toBe(false)
    }
  })

  it('says Skipping… once asked, and takes no second click', async () => {
    let calls = 0
    const container = renderCall({
      onSkip: () => {
        calls += 1
      },
    })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    fireEvent.click(skip)
    await waitFor(() => {
      expect(skip.textContent).toBe('Skipping…')
    })
    expect(skip.disabled).toBe(true)
    fireEvent.click(skip)
    expect(calls).toBe(1)
  })

  it('returns to rest when the host says nothing was in flight', async () => {
    const container = renderCall({ onSkip: () => Promise.resolve(false) })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    fireEvent.click(skip)
    // The stale-button race is not an error — the control simply comes back.
    await waitFor(() => {
      expect(skip.textContent).toBe('Skip')
    })
    expect(skip.disabled).toBe(false)
  })

  it('returns to rest when the request throws, rather than sticking on Skipping…', async () => {
    const container = renderCall({ onSkip: () => Promise.reject(new Error('offline')) })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    fireEvent.click(skip)
    await waitFor(() => {
      expect(skip.textContent).toBe('Skip')
    })
  })

  it('a viewer sees it disabled with the reason, not missing', () => {
    let calls = 0
    const container = renderCall({
      onSkip: () => {
        calls += 1
      },
      skipDisabledReason: 'Only editors can skip this.',
    })
    const skip = molId(container, 'tool-call-skip-tc-1') as HTMLButtonElement
    expect(skip.disabled).toBe(true)
    expect(skip.getAttribute('title')).toBe('Only editors can skip this.')
    fireEvent.click(skip)
    expect(calls).toBe(0)
  })

  it('offers nothing when the call is not running, or when no host serves it', () => {
    expect(
      molId(renderCall({ onSkip: () => {}, status: 'done' }), 'tool-call-skip-tc-1'),
    ).toBeNull()
    cleanup()
    expect(molId(renderCall({}), 'tool-call-skip-tc-1')).toBeNull()
  })
})

describe('a skipped tool call reads as skipped', () => {
  it('recognises the API’s skipped result and nothing else', () => {
    expect(isSkippedByUser(SKIPPED_OUTPUT)).toBe(true)
    expect(isSkippedByUser({ status: 'ok' })).toBe(false)
    expect(isSkippedByUser({ exitCode: 0 })).toBe(false)
    expect(isSkippedByUser('skipped_by_user')).toBe(false)
    expect(isSkippedByUser(null)).toBe(false)
    expect(isSkippedByUser(undefined)).toBe(false)
  })

  it('summarises as Skipped — not the empty summary that means it worked', () => {
    expect(toolSummary('exec_command', SKIPPED_OUTPUT, 'done')).toBe('Skipped')
    expect(toolSummary('write_file', SKIPPED_OUTPUT, 'done')).toBe('Skipped')
    // A real success still summarises the way it always did.
    expect(toolSummary('exec_command', { exitCode: 0 }, 'done')).not.toBe('Skipped')
  })

  it('shows Skipped on the row and does not colour it as a pass or a failure', () => {
    const container = renderCall({ status: 'done', output: SKIPPED_OUTPUT })
    expect(container.textContent).toContain('Skipped')
    const dots = [...container.querySelectorAll('circle')].map((c) => c.getAttribute('fill'))
    // Gray: it did not happen. Never the success green or the failure red.
    expect(dots).toContain('#888888')
    expect(dots).not.toContain('#3fb950')
    expect(dots).not.toContain('#f04040')
  })
})
