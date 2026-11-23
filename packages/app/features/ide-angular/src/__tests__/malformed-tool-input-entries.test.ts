// @vitest-environment jsdom

/**
 * Adversarial coverage for model-authored tool input in the two shapes the
 * existing hostile-input suite does not reach — the Angular port of
 * `@molecule/app-ide-react/src/__tests__/malformed-tool-input-entries.test.tsx`
 * with the same test names and the same behavioral assertions.
 *
 * `malformed-tool-input.test.ts` feeds every card a wrong-typed FIELD value —
 * including `replacements: <hostile>` — but never an ARRAY whose ELEMENTS are
 * malformed (`replacements: [null]`, `["a"]`). `renderIn()` guards that shape
 * with `entry ?? {}`; `fileDiffStats()` — which runs on the very same input, on
 * the card's render path — read `entry.old_string` directly, so a null element
 * threw a TypeError out of render and took the whole IDE down, not one card.
 *
 * A second read of the same class lives in `streamingActivityLabel` (the live
 * "Writing `x.ts`" indicator): it casts `toolCalls[].input` to strings and calls
 * `.split` on them, so a declared-string field arriving as a number or object
 * threw from render as well.
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

import { provideDomPlacement, provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { streamingActivityLabel } from '@molecule/app-ide-panel-logic'
import { fileDiffStats } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/tool-call-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * Wrong-typed values a model can produce where a string is declared. A subset of
 * the array `malformed-tool-input.test.ts` uses — that one also feeds
 * `{ label, value }`, `{ title }`, `{ text }` and `{ name }` objects, all of
 * which these readers coerce exactly like the `{}` entry below.
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
  selector: 'mol-malformed-entries-card-host',
  standalone: true,
  imports: [ToolCallCard],
  changeDetection: ChangeDetectionStrategy.Eager,
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
 * Render one tool call.
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
      provideDomPlacement(),
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
  it('renders the diff stats for the readable entries instead of throwing', async () => {
    const container = await renderCard({
      id: 'tc-entries',
      name: 'edit_file',
      input: {
        path: 'src/a.ts',
        replacements: [null, { old_string: 'a', new_string: 'a\nb' }],
      },
      output: {},
      status: 'done',
    })
    expect(recorder.errors).toEqual([])
    // The stat the readable replacement contributes — proof the card both
    // survived the null entry and still counted the good one. The rendered
    // value is pinned EXACTLY: a substring match on '+1' also accepts '+11',
    // '+101'…, so it could not tell a correct count from an order-of-magnitude
    // mis-count.
    const added = Array.from(container.querySelectorAll('span'))
      .map((span) => span.textContent ?? '')
      .find((text) => /^\+\d+$/.test(text))
    expect(added).toBe('+1')
  })
})

describe('streamingActivityLabel reads model-authored fields as strings', () => {
  /**
   * The translation function the component passes into the helper: the real
   * provider's, so a missing key falls back to the call's own `defaultValue`.
   */
  const t = createSimpleI18nProvider('en').t

  /**
   * Build a streaming message whose last block is a tool call, as the chat session stores it.
   *
   * @param name - The tool name.
   * @param input - The tool's model-authored input.
   * @returns The message shape the label reads.
   */
  function message(name: string, input: unknown): Parameters<typeof streamingActivityLabel>[1] {
    return {
      blocks: [{ type: 'tool_call', id: 'call-1' }],
      toolCalls: [{ id: 'call-1', name, input }],
    }
  }

  it('does not throw when a declared-string path arrives as a non-string', () => {
    for (const name of ['write_file', 'edit_file']) {
      for (const value of HOSTILE_VALUES) {
        expect(() => streamingActivityLabel(t, message(name, { path: value }))).not.toThrow()
      }
    }
  })

  it('still names the file when the path is a real string', () => {
    expect(streamingActivityLabel(t, message('write_file', { path: 'a/b/App.tsx' }))).toContain(
      'App.tsx',
    )
  })

  it('stringifies a numeric field rather than dropping the label', () => {
    expect(streamingActivityLabel(t, message('write_file', { path: 42 }))).toContain('42')
  })
})
