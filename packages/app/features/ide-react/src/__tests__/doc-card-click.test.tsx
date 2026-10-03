// @vitest-environment jsdom
/**
 * Click-wiring coverage for the package-doc cards.
 *
 * The 2026-10-03 bug this suite pins down was invisible to every existing
 * test: the read_molecule_doc / find_package cards DID switch the IDE to the
 * code view on click, but the path they handed the editor named a file that no
 * longer exists (MOLECULE.md, pre-rename). The unit suite asserts the path
 * constant and `molecule-doc-path-reality.test.ts` anchors the filename
 * against the installed fleet — THIS file proves the last hop: a real click on
 * the rendered card delivers that exact path to the host's `onFileOpen`,
 * which is the callback whose fetch loads the file into the editor.
 */

import { fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.js'

beforeAll(() => {
  setClassMap(classMap)
})

/** A minimal light theme so `useThemeMode` resolves (same as the hostile-input suite). */
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

/** Wrap a card in the i18n + theme contexts it needs to mount. */
function wrap(children: ReactNode): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
    </I18nProvider>
  )
}

describe('package-doc cards open the file on click', () => {
  it('read_molecule_doc: clicking the package name hands onFileOpen the sandbox README.md path', () => {
    const onFileOpen = vi.fn()
    const { container, getByText } = render(
      wrap(
        <ToolCallCard
          name="read_molecule_doc"
          input={{ name: '@molecule/api-payments-stripe' }}
          output={{ package: '@molecule/api-payments-stripe', doc: '# docs' }}
          status="done"
          onFileOpen={onFileOpen}
        />,
      ),
    )
    // The clickable code span is the only <code> in the card label row.
    const codeLinks = container.querySelectorAll('code[style*="cursor: pointer"]')
    expect(codeLinks.length).toBeGreaterThan(0)
    fireEvent.click(getByText('@molecule/api-payments-stripe'))
    expect(onFileOpen).toHaveBeenCalledWith(
      '/workspace/node_modules/@molecule/api-payments-stripe/README.md',
    )
  })

  it('find_package: clicking a result row hands onFileOpen that package’s README.md path', () => {
    const onFileOpen = vi.fn()
    const { container } = render(
      wrap(
        <ToolCallCard
          name="find_package"
          input={{ query: 'ui' }}
          output={{
            found: 2,
            results: [{ name: '@molecule/app-ui' }, { name: '@molecule/app-ui-react' }],
          }}
          status="done"
          onFileOpen={onFileOpen}
        />,
      ),
    )
    // Result rows live in the expandable body — open the card first (the
    // chevron sits on the summary row whose click toggles expansion).
    const chevron = container.querySelector('svg')
    expect(chevron).not.toBeNull()
    fireEvent.click(chevron!)
    const firstRow = container.querySelector('[data-mol-id="find-package-result-0"]')
    expect(firstRow).not.toBeNull()
    fireEvent.click(firstRow!)
    expect(onFileOpen).toHaveBeenCalledWith('/workspace/node_modules/@molecule/app-ui/README.md')
  })
})
