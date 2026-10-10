// @vitest-environment jsdom

/**
 * A `read_file` card names the file(s) it read — one `path` or a batch `paths` — and
 * each name opens its own file.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

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

function renderRead(overrides: Partial<ToolCallCardProps> = {}): HTMLElement {
  const { container } = render(
    wrap(
      <ToolCallCard
        id="tc-1"
        name="read_file"
        input={{ paths: ['my-app/app/src/App.tsx', 'my-app/app/src/pages/Home.tsx'] }}
        status="done"
        output={{
          files: [
            { path: '/workspace/my-app/app/src/App.tsx', content: 'export const App = 1' },
            { path: '/workspace/my-app/app/src/pages/Home.tsx', error: 'No such file' },
          ],
        }}
        {...overrides}
      />,
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

describe('ToolCallCard — read_file', () => {
  it('names every file of a batch read and opens the one clicked', () => {
    const opened: string[] = []
    const container = renderRead({ onFileOpen: (p) => opened.push(p) })
    expect(container.textContent).toContain('Read')
    expect(container.textContent).toContain('App.tsx')
    expect(container.textContent).toContain('Home.tsx')
    const codes = Array.from(container.querySelectorAll('code'))
    const home = codes.find((c) => c.textContent === 'Home.tsx') as HTMLElement
    fireEvent.click(home)
    expect(opened).toContain('my-app/app/src/pages/Home.tsx')
  })

  it('still names a single-path read', () => {
    const container = renderRead({
      input: { path: 'my-app/AGENTS.md' },
      output: { path: '/workspace/my-app/AGENTS.md', content: '# Agents' },
    })
    expect(container.textContent).toContain('AGENTS.md')
  })
})
