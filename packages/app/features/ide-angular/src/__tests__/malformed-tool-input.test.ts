// @vitest-environment jsdom

/**
 * Adversarial coverage for model-authored tool input — the Angular port of
 * `@molecule/app-ide-react/src/__tests__/malformed-tool-input.test.tsx` with the
 * same test names and the same behavioral assertions.
 *
 * Every other test in this suite feeds the chat well-formed data, which is exactly why
 * the 2026-08-14 production outage was invisible here: `ask_user` declares
 * `options: string[]`, the smaller model routed to discovery answered
 * `options: [{ label: 'Recipe box' }]`, and rendering that object threw during
 * render — blanking the whole IDE on the user's first prompt.
 *
 * A JSON schema is a request to a language model, never a guarantee about its output, so
 * every field a tool card renders is treated here as hostile input. These tests fail if a
 * card can be made to throw by a value of the wrong type.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  ErrorHandler,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { provideTheme } from '@molecule/app-angular'
import type { TranslateFunction } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { normalizeAskUserInput, toolLabel } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
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

/**
 * Angular's `ErrorHandler`, which records the errors a template or event
 * handler raised instead of printing them (React rethrows them out of
 * `render`; Angular routes them here).
 */
class RecordingErrorHandler implements ErrorHandler {
  /** Every error Angular reported during the current mount. */
  readonly errors: unknown[] = []

  /**
   * Records the error.
   * @param error - The reported error.
   */
  handleError(error: unknown): void {
    this.errors.push(error)
  }
}

/** The recorder the current mount reports to. */
const recorder = new RecordingErrorHandler()

/** The JIT host the way the conformance kit mounts the card: it binds every input the card takes. */
const ToolCallCardHost = Component({
  selector: 'mol-malformed-card-host',
  standalone: true,
  imports: [ToolCallCard],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-tool-call-card [id]="p['id']" [name]="p['name']" [input]="p['input']" [output]="p['output']" [status]="p['status']"></div>`,
})(
  class ToolCallCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ToolCallCardHost>>
  container: HTMLElement
} | null = null

/** Lets Angular's zoneless change detection settle. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
  current.appRef.tick()
}

/**
 * Mount one tool call the way the chat timeline does.
 *
 * @param props - The card's inputs.
 * @returns The container.
 */
async function renderCard(props: Record<string, unknown>): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  recorder.errors.length = 0
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideTheme(buildThemeProvider()),
      { provide: ErrorHandler, useValue: recorder },
    ],
  })
  const ref: ComponentRef<InstanceType<typeof ToolCallCardHost>> = createComponent(
    ToolCallCardHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return container
}

/**
 * Mounts the card and asserts neither `mount` nor the change-detection pass
 * raised — the Angular form of React's `expect(() => render(...)).not.toThrow()`.
 *
 * @param props - The card's inputs.
 */
async function expectRenderable(props: Record<string, unknown>): Promise<void> {
  let thrown: unknown
  try {
    await renderCard(props)
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBeUndefined()
  expect(recorder.errors).toEqual([])
}

/**
 * Clicks the card's row the way a user expands it (React's `fireEvent.click` on
 * the row's button; here the row itself is a `role="button"` div).
 *
 * @param container - The render container.
 */
async function clickRow(container: HTMLElement): Promise<void> {
  const toggle = container.querySelector('[role="button"]')
  if (toggle) {
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await flush()
  }
}

beforeAll(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
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
    expect(absent.planReview?.goesLive).toBeUndefined()
    // A model sending junk where a boolean is declared degrades to "not stated".
    const junk = normalizeAskUserInput({
      question: 'q',
      options: [],
      planReview: { path: 'p.md', steps: 2, preview: [], goesLive: 'yes' },
    })
    expect(junk.planReview?.goesLive).toBeUndefined()
  })
})

describe('ToolCallCard renders hostile tool input without throwing', () => {
  it('renders an ask_user card whose options are objects', async () => {
    const container = await renderCard({
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

  it('says the plan goes live under the step count when the review says so', async () => {
    const container = await renderCard({
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

  it('stays silent about going live when the plan review does not flag it', async () => {
    const container = await renderCard({
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

  it('renders an ask_user card for every hostile question/options/hint combination', async () => {
    for (const value of HOSTILE_VALUES) {
      await expectRenderable({
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

  // Mounts every tool card through Angular's JIT compiler: 0.85s alone, and past the 10s default
  // in a full test wave on a loaded machine (2026-11-22).
  it('renders every tool card with a wholly wrong-typed input', async () => {
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
        await expectRenderable({
          id: 'tc-label-loop',
          name,
          input,
          output: undefined,
          status: 'running',
        })
      }
    }
  }, 60_000)

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
        const container = await renderCard({
          id: 'tc-output-loop',
          name,
          input,
          output,
          status: 'done',
        })
        // Clicking is the whole point — expansion is where the second set of
        // model-authored fields reaches the render tree.
        await clickRow(container)
        expect(recorder.errors).toEqual([])
      }
    }
  })

  it('renders an errored tool result whose `error` is an object', async () => {
    const container = await renderCard({
      id: 'tc-errored',
      name: 'exec_command',
      input: { command: 'npm test' },
      output: { error: { label: 'boom', code: 1 } },
      status: 'error',
    })
    await clickRow(container)
    expect(recorder.errors).toEqual([])
    expect(container.textContent).not.toContain('[object Object]')
  })
})
