// @vitest-environment jsdom
/**
 * Adversarial coverage for model-authored tool input.
 *
 * Every other test in this suite feeds the chat well-formed data, which is exactly why
 * the 2026-08-14 production outage was invisible here: `ask_user` declares
 * `options: string[]`, the smaller model routed to discovery answered
 * `options: [{ label: 'Recipe box' }]`, and rendering that object threw React error #31
 * during render — blanking the whole IDE on the user's first prompt.
 *
 * A JSON schema is a request to a language model, never a guarantee about its output, so
 * every field a tool card renders is treated here as hostile input. These tests fail if a
 * card can be made to throw by a value of the wrong type.
 */

import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { normalizeAskUserInput, toolLabel } from '../components/tool-call-utilities.js'
import { ToolCallCard } from '../components/ToolCallCard.js'

beforeAll(() => {
  setClassMap(classMap)
})

/**
 * Wrong-typed values a model can produce where a string is declared. Each one has been
 * seen from some provider; `{ label }` is the shape that caused the outage.
 */
const HOSTILE_VALUES: readonly unknown[] = [
  { label: 'Recipe box' },
  { label: 'Recipe box', value: 'recipes' },
  { value: 'recipes' },
  { title: 'Recipes' },
  { text: 'Recipes' },
  { name: 'Recipes' },
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

/** Wrap a card in the i18n + theme contexts it needs to mount. */
function wrap(children: ReactNode): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
    </I18nProvider>
  )
}

describe('normalizeAskUserInput', () => {
  it('turns option objects into their label text', () => {
    const result = normalizeAskUserInput({
      question: 'What should we build?',
      options: [{ label: 'Recipe box' }, { label: 'Budget tracker', value: 'budget' }],
    })
    expect(result.options).toEqual(['Recipe box', 'Budget tracker'])
  })

  it('reads the other text keys models use', () => {
    const result = normalizeAskUserInput({
      question: 'q',
      options: [{ value: 'v' }, { title: 't' }, { text: 'x' }, { name: 'n' }],
    })
    expect(result.options).toEqual(['v', 't', 'x', 'n'])
  })

  it('keeps plain strings untouched', () => {
    const result = normalizeAskUserInput({ question: 'q', options: ['A', 'B'] })
    expect(result.options).toEqual(['A', 'B'])
  })

  it('never yields a non-string option, for any hostile value', () => {
    const result = normalizeAskUserInput({ question: 'q', options: HOSTILE_VALUES })
    for (const option of result.options) {
      expect(typeof option).toBe('string')
      expect(option).not.toBe('')
    }
  })

  it('always yields renderable strings for question and hint', () => {
    for (const value of HOSTILE_VALUES) {
      const result = normalizeAskUserInput({ question: value, options: [], hint: value })
      expect(typeof result.question).toBe('string')
      expect(typeof result.hint).toBe('string')
    }
  })

  it('survives non-object and non-array input entirely', () => {
    for (const value of [...HOSTILE_VALUES, 'a string', () => undefined]) {
      const result = normalizeAskUserInput(value)
      expect(Array.isArray(result.options)).toBe(true)
      expect(typeof result.question).toBe('string')
    }
  })

  it('survives a circular option object', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => normalizeAskUserInput({ question: 'q', options: [circular] })).not.toThrow()
  })
})

describe('ToolCallCard renders hostile tool input without throwing', () => {
  it('renders an ask_user card whose options are objects', () => {
    const { container } = render(
      wrap(
        <ToolCallCard
          name="ask_user"
          input={{
            question: 'What should we build?',
            options: [{ label: 'Recipe box' }, { label: 'Budget tracker' }],
          }}
          output={{ status: 'awaiting_response' }}
          status="running"
        />,
      ),
    )
    // The salvaged label is what the user clicks — not `[object Object]`, and not nothing.
    expect(container.textContent).toContain('Recipe box')
    expect(container.textContent).toContain('Budget tracker')
    expect(container.textContent).not.toContain('[object Object]')
  })

  it('renders an ask_user card for every hostile question/options/hint combination', () => {
    for (const value of HOSTILE_VALUES) {
      expect(() =>
        render(
          wrap(
            <ToolCallCard
              name="ask_user"
              input={{
                question: value,
                options: HOSTILE_VALUES,
                hint: value,
                allowFreeText: value,
              }}
              output={{ status: 'awaiting_response' }}
              status="running"
            />,
          ),
        ),
      ).not.toThrow()
    }
  })

  it('renders every tool card with a wholly wrong-typed input', () => {
    // The tool names whose cards read fields out of `input`. A new tool that renders
    // input belongs in this list — that is the point of the test.
    const TOOLS = [
      'ask_user',
      'read_file',
      'write_file',
      'edit_file',
      'search_files',
      'list_files',
      'find_files',
      'exec_command',
      'sandbox_fetch',
      'web_fetch',
      'web_search',
      'find_package',
      'read_molecule_doc',
      'load_skill',
      'save_plan',
      'set_mode',
      'rename_file',
      'delete_file',
      'create_directory',
      'request_repo_import',
    ]
    for (const name of TOOLS) {
      for (const value of HOSTILE_VALUES) {
        // Every declared-string field set to the same hostile value at once.
        const input = {
          path: value,
          command: value,
          pattern: value,
          url: value,
          query: value,
          name: value,
          question: value,
          options: value,
          mode: value,
          source: value,
          text: value,
          reason: value,
        }
        expect(() => toolLabel(name, input)).not.toThrow()
        expect(typeof toolLabel(name, input)).toBe('string')
        expect(() =>
          render(
            wrap(<ToolCallCard name={name} input={input} output={undefined} status="running" />),
          ),
        ).not.toThrow()
      }
    }
  })
})
