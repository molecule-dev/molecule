// @vitest-environment jsdom

/**
 * Adversarial coverage for model-authored tool input — the Vue port of
 * `@molecule/app-ide-react/src/__tests__/malformed-tool-input.test.tsx` with the
 * same test names and the same behavioral assertions.
 *
 * A JSON schema is a request to a language model, never a guarantee about its
 * output, so every field a tool card renders is treated here as hostile input.
 * These tests fail if a card can be made to throw by a value of the wrong type.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import type { TranslateFunction } from '@molecule/app-i18n'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { normalizeAskUserInput, toolLabel } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * English passthrough translator — the text the package's former static `t`
 * returned for `en`, so these direct-call expectations stay plain English while
 * following the caller-supplied-translate-function contract.
 */
const t: TranslateFunction = (key, values, opts) =>
  opts?.defaultValue
    ? Object.entries(values ?? {}).reduce(
        (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
        opts.defaultValue,
      )
    : key

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

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * The errors Vue's app-level handler caught during the last mount or click.
 *
 * React throws a render error out of `render`; Vue routes it to
 * `app.config.errorHandler` and keeps going, so a card that throws in render
 * would otherwise look fine here. Collecting them gives the same contract: a
 * hostile value must produce NO render error.
 */
const renderErrors: unknown[] = []

/**
 * Mount one tool call the way the chat timeline does.
 *
 * @param props - The card's props.
 * @returns The host element the card rendered into.
 */
function renderCard(props: ToolCallCardProps): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  renderErrors.length = 0
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(ToolCallCard, props),
    }),
  )
  app.config.errorHandler = (error) => {
    renderErrors.push(error)
  }
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
  return host
}

/**
 * Mounts the card and asserts neither `mount` nor Vue's render pass raised — the
 * Vue form of React's `expect(() => render(...)).not.toThrow()`.
 *
 * @param props - The card's props.
 */
function expectRenderable(props: ToolCallCardProps): void {
  expect(() => renderCard(props)).not.toThrow()
  expect(renderErrors).toEqual([])
}

/**
 * Clicks the card's row the way a user expands it (React's `fireEvent.click` on
 * the row's button; here the row itself is a `role="button"` div).
 *
 * @param host - The render host.
 */
async function clickRow(host: HTMLElement): Promise<void> {
  const toggle = host.querySelector('[role="button"]')
  if (toggle) {
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await nextTick()
  }
}

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
})

describe('normalizeAskUserInput', () => {
  it('turns option objects into their label text', () => {
    const result = normalizeAskUserInput({
      question: 'What should we build?',
      options: [{ label: 'Recipe box' }, { label: 'Budget tracker', value: 'budget' }],
    })
    expect(result.options.map((o) => o.label)).toEqual(['Recipe box', 'Budget tracker'])
  })

  it('preserves rich-option description and preview alongside the label', () => {
    const result = normalizeAskUserInput({
      question: 'Which data model?',
      multiSelect: false,
      options: [
        {
          label: 'Single table',
          description: 'One row per order, items as JSON',
          preview: 'CREATE TABLE orders (\n  id uuid PRIMARY KEY\n);',
        },
        'Two tables',
      ],
    })
    expect(result.options).toHaveLength(2)
    expect(result.options[0]).toEqual({
      label: 'Single table',
      description: 'One row per order, items as JSON',
      preview: 'CREATE TABLE orders (\n  id uuid PRIMARY KEY\n);',
    })
    expect(result.options[1]).toEqual({ label: 'Two tables' })
    expect(result.multiSelect).toBe(false)
  })

  it('carries the multiSelect flag through', () => {
    const result = normalizeAskUserInput({
      question: 'q',
      multiSelect: true,
      options: ['A', 'B'],
    })
    expect(result.multiSelect).toBe(true)
  })

  it('defaults multiSelect to false when the model omits it', () => {
    const result = normalizeAskUserInput({ question: 'q', options: ['A'] })
    expect(result.multiSelect).toBe(false)
  })

  it('reads the other text keys models use', () => {
    const result = normalizeAskUserInput({
      question: 'q',
      options: [{ value: 'v' }, { title: 't' }, { text: 'x' }, { name: 'n' }],
    })
    expect(result.options.map((o) => o.label)).toEqual(['v', 't', 'x', 'n'])
  })

  it('keeps plain strings untouched', () => {
    const result = normalizeAskUserInput({ question: 'q', options: ['A', 'B'] })
    expect(result.options.map((o) => o.label)).toEqual(['A', 'B'])
  })

  it('unwraps option objects the model pre-serialized as JSON strings (observed live 2026-08-15)', () => {
    const result = normalizeAskUserInput({
      question: 'q',
      options: [
        '{"key": "build-new", "label": "Build a new app"}',
        '{"key": "import-existing", "label": "Import my existing app"}',
      ],
    })
    expect(result.options.map((o) => o.label)).toEqual([
      'Build a new app',
      'Import my existing app',
    ])
  })

  it('leaves brace-shaped strings that are not JSON untouched', () => {
    const result = normalizeAskUserInput({
      question: 'q',
      options: ['{not json}', '[also not json'],
    })
    expect(result.options.map((o) => o.label)).toEqual(['{not json}', '[also not json'])
  })

  it('recovers labels from MANGLED pseudo-JSON with mixed escaping (observed live 2026-08-15)', () => {
    const result = normalizeAskUserInput({
      question: 'q',
      options: [
        // Byte-exact strings a production conversation stored: the stray \" after
        // the first value makes these parse as VALID JSON into a label-less
        // object, so the recovery must prefer the unescaped re-parse.
        '{"key": "dev\\", \\"label\\": \\"I\'m a developer — I know my way around code"}',
        '{"key": "some\\", \\"label\\": \\"I have some technical knowledge"}',
        // Fully-escaped variant (never parses directly).
        '{"key":"nontech\\", \\"label\\": \\"I\'m not technical — just help me\\"}',
      ],
    })
    expect(result.options.map((o) => o.label)).toEqual([
      "I'm a developer — I know my way around code",
      'I have some technical knowledge',
      "I'm not technical — just help me",
    ])
  })

  it('never yields a non-string option label, for any hostile value', () => {
    const result = normalizeAskUserInput({ question: 'q', options: HOSTILE_VALUES })
    for (const option of result.options) {
      expect(typeof option.label).toBe('string')
      expect(option.label).not.toBe('')
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

  it('carries planReview.goesLive only when strictly true', () => {
    const yes = normalizeAskUserInput({
      question: 'q',
      options: [],
      planReview: { path: 'p.md', steps: 2, preview: [], goesLive: true },
    })
    expect(yes.planReview?.goesLive).toBe(true)
    const absent = normalizeAskUserInput({
      question: 'q',
      options: [],
      planReview: { path: 'p.md', steps: 2, preview: [] },
    })
    expect(absent.planReview).toBeDefined()
    expect(absent.planReview!.goesLive).toBeUndefined()
    // A model sending junk where a boolean is declared degrades to "not stated".
    const junk = normalizeAskUserInput({
      question: 'q',
      options: [],
      planReview: { path: 'p.md', steps: 2, preview: [], goesLive: 'yes' },
    })
    expect(junk.planReview).toBeDefined()
    expect(junk.planReview!.goesLive).toBeUndefined()
  })
})

describe('ToolCallCard renders hostile tool input without throwing', () => {
  it('renders an ask_user card whose options are objects', () => {
    const container = renderCard({
      id: 'tc-hostile-1',
      name: 'ask_user',
      input: {
        question: 'What should we build?',
        options: [{ label: 'Recipe box' }, { label: 'Budget tracker' }],
      },
      output: { status: 'awaiting_response' },
      status: 'running',
    })
    // The salvaged label is what the user clicks — not `[object Object]`, and not nothing.
    expect(container.textContent).toContain('Recipe box')
    expect(container.textContent).toContain('Budget tracker')
    expect(container.textContent).not.toContain('[object Object]')
  })

  it('says the plan goes live under the step count when the review says so', () => {
    const container = renderCard({
      id: 'tc-hostile-2',
      name: 'ask_user',
      input: {
        question: 'Ship it?',
        options: [{ label: 'Approve plan' }, { label: 'Request changes' }],
        planReview: { path: 'plan.md', name: null, steps: 3, preview: [], goesLive: true },
      },
      output: { status: 'awaiting_response' },
      status: 'running',
    })
    expect(container.textContent).toContain(
      'Goes live: the platform publishes the app and runs its test suite once, on the live app.',
    )
  })

  it('stays silent about going live when the plan review does not flag it', () => {
    const container = renderCard({
      id: 'tc-hostile-3',
      name: 'ask_user',
      input: {
        question: 'Ship it?',
        options: [{ label: 'Approve plan' }, { label: 'Request changes' }],
        planReview: { path: 'plan.md', name: null, steps: 3, preview: [] },
      },
      output: { status: 'awaiting_response' },
      status: 'running',
    })
    expect(container.textContent).not.toContain('Goes live:')
  })

  it('renders an ask_user card for every hostile question/options/hint combination', () => {
    for (const value of HOSTILE_VALUES) {
      expectRenderable({
        id: 'tc-hostile-loop',
        name: 'ask_user',
        input: {
          question: value,
          options: HOSTILE_VALUES,
          hint: value,
          allowFreeText: value,
        },
        output: { status: 'awaiting_response' },
        status: 'running',
      })
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
        expect(() => toolLabel(t, name, input)).not.toThrow()
        expect(typeof toolLabel(t, name, input)).toBe('string')
        expectRenderable({
          id: 'tc-label-loop',
          name,
          input,
          output: undefined,
          status: 'running',
        })
      }
    }
  })

  it('renders the EXPANDED IN/OUT sections with wrong-typed input and output', async () => {
    // The collapsed row and the expanded detail read DIFFERENT fields, so a card that
    // renders fine collapsed can still throw the moment the user clicks it. Both halves
    // of every card are exercised.
    const TOOLS = [
      'exec_command',
      'write_file',
      'edit_file',
      'search_files',
      'find_files',
      'read_file',
      'delete_file',
      'list_files',
      'create_directory',
      'rename_file',
      'web_fetch',
      'find_package',
      'read_molecule_doc',
    ]
    for (const name of TOOLS) {
      for (const value of HOSTILE_VALUES) {
        const input = {
          command: value,
          path: value,
          old_path: value,
          new_path: value,
          pattern: value,
          include: value,
          method: value,
          url: value,
          replacements: value,
        }
        const output = {
          stdout: value,
          stderr: value,
          content: value,
          body: value,
          files: value,
          diff: value,
          results: value,
          packages: value,
          matches: value,
          entries: value,
          skills: value,
          examples: value,
          status: value,
          exitCode: value,
        }
        const container = renderCard({
          id: 'tc-output-loop',
          name,
          input,
          output,
          status: 'done',
        })
        // Clicking is the whole point — expansion is where the second set of
        // model-authored fields reaches the render tree.
        await clickRow(container)
        expect(renderErrors).toEqual([])
      }
    }
  })

  it('renders an errored tool result whose `error` is an object', async () => {
    const container = renderCard({
      id: 'tc-errored',
      name: 'exec_command',
      input: { command: 'npm test' },
      output: { error: { label: 'boom', code: 1 } },
      status: 'error',
    })
    await clickRow(container)
    expect(renderErrors).toEqual([])
    expect(container.textContent).not.toContain('[object Object]')
  })
})
