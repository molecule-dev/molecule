// @vitest-environment jsdom

/**
 * The working-plan card marks each task with the shared check icon (done), the
 * molecule spinner (in progress) or an empty ring (to do) — no text glyphs, and
 * no "!" priority marker.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.js'

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

function renderPlan(): HTMLElement {
  const { container } = render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <ToolCallCard
          id="tc-plan"
          name="update_task_list"
          status="done"
          input={{
            todos: [
              { content: 'Write tests', status: 'completed', priority: 'high' },
              { content: 'Fix the card', status: 'in_progress', priority: 'high' },
              { content: 'Ship it', status: 'pending', priority: 'high' },
            ],
          }}
        />
      </ThemeProvider>
    </I18nProvider>,
  )
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({ paths: [{ d: `glyph:${String(name)}` }], viewBox: '0 0 16 16' }),
      },
    ),
  )
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('ToolCallCard — working plan', () => {
  it('shows every task and no text glyphs or priority marker', () => {
    const text = renderPlan().textContent ?? ''
    for (const label of ['Write tests', 'Fix the card', 'Ship it']) expect(text).toContain(label)
    for (const glyph of ['✓', '◐', '○', '!']) expect(text).not.toContain(glyph)
  })

  it('marks each row with an icon: check, spinner, or empty ring', () => {
    const rows = renderPlan().querySelectorAll(
      '[data-mol-id="task-list-card"] > div:not(:first-child)',
    )
    expect(rows).toHaveLength(3)
    expect(rows[0].querySelector('svg')).not.toBeNull()
    expect(rows[1].querySelector('svg')).not.toBeNull()
    expect(rows[2].querySelector('svg')).toBeNull()
  })
})
