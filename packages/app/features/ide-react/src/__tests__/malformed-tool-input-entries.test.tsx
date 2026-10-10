// @vitest-environment jsdom

/**
 * Adversarial coverage for model-authored tool input in the two shapes the
 * existing hostile-input suite does not reach.
 *
 * `malformed-tool-input.test.tsx` feeds every card a wrong-typed FIELD value —
 * including `replacements: <hostile>` — but never an ARRAY whose ELEMENTS are
 * malformed (`replacements: [null]`, `["a"]`). `renderIn()` guards that shape
 * with `entry ?? {}`; `fileDiffStats()` — which runs on the very same input, in
 * a `useMemo` on the card's render path — read `entry.old_string` directly, so a
 * null element threw a TypeError out of render and took the whole IDE down,
 * not one card.
 *
 * A second read of the same class lives in `streamingActivityLabel` (the live
 * "Writing `x.ts`" indicator): it casts `toolCalls[].input` to strings and calls
 * `.split` on them, so a declared-string field arriving as a number or object
 * threw from render as well.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { streamingActivityLabel } from '../components/ChatPanel.js'
import { fileDiffStats } from '../components/tool-call-utilities.js'
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

/**
 * Wrap a card in the i18n + theme contexts it needs to mount.
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
 * Wrong-typed values a model can produce where a string is declared — the same
 * set `malformed-tool-input.test.tsx` uses, so both suites agree on what
 * "hostile" means.
 */
const HOSTILE_VALUES: readonly unknown[] = [
  { label: 'Recipe box' },
  { value: 'recipes' },
  {},
  { nested: { deep: { unexpected: true } } },
  ['a', 'b'],
  [{ label: 'a' }],
  42,
  0,
  true,
  false,
  null,
  undefined,
]

beforeAll(() => {
  setClassMap(classMap)
})

afterEach(() => {
  cleanup()
})

describe('fileDiffStats skips malformed replacement ENTRIES', () => {
  it('skips a null entry instead of reading .old_string off it, and counts the readable ones', () => {
    const input = { replacements: [null, { old_string: 'a', new_string: 'a\nb' }] }
    expect(fileDiffStats('edit_file', input, {})).toEqual({ added: 1, removed: 0 })
  })

  it('skips undefined and primitive entries instead of throwing', () => {
    const input = { replacements: [undefined, 'not-an-entry', 42, true] }
    expect(fileDiffStats('edit_file', input, {})).toEqual({ added: 0, removed: 0 })
  })

  it('never throws for any hostile element shape', () => {
    for (const value of HOSTILE_VALUES) {
      expect(() => fileDiffStats('edit_file', { replacements: [value] }, {})).not.toThrow()
    }
  })
})

describe('an edit_file card whose replacements array holds a malformed entry', () => {
  it('renders the diff stats for the readable entries instead of throwing', () => {
    const { container } = render(
      wrap(
        <ToolCallCard
          name="edit_file"
          input={{
            path: 'src/a.ts',
            replacements: [null, { old_string: 'a', new_string: 'a\nb' }],
          }}
          output={{}}
          status="done"
        />,
      ),
    )
    // The stat the readable replacement contributes — proof the card both
    // survived the null entry and still counted the good one.
    expect(container.textContent).toContain('+1')
  })
})

describe('streamingActivityLabel reads model-authored fields as strings', () => {
  /**
   * Build a streaming message whose last block is a tool_use.
   *
   * @param name - The tool name.
   * @param input - The tool's model-authored input.
   * @returns The message shape the label reads.
   */
  function message(name: string, input: unknown): Parameters<typeof streamingActivityLabel>[0] {
    return {
      blocks: [{ type: 'tool_use', id: 'call-1' }],
      toolCalls: [{ id: 'call-1', name, input }],
    }
  }

  it('does not throw when a declared-string path arrives as a non-string', () => {
    for (const name of ['write_file', 'edit_file']) {
      for (const value of HOSTILE_VALUES) {
        expect(() => streamingActivityLabel(message(name, { path: value }))).not.toThrow()
      }
    }
  })

  it('still names the file when the path is a real string', () => {
    expect(streamingActivityLabel(message('write_file', { path: 'a/b/App.tsx' }))).toContain(
      'App.tsx',
    )
  })

  it('stringifies a numeric field rather than dropping the label', () => {
    expect(streamingActivityLabel(message('write_file', { path: 42 }))).toContain('42')
  })
})
