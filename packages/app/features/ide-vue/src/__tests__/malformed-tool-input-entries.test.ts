// @vitest-environment jsdom

/**
 * Adversarial coverage for model-authored tool input in the two shapes the
 * existing hostile-input suite does not reach — the Vue port of
 * `@molecule/app-ide-react/src/__tests__/malformed-tool-input-entries.test.tsx`
 * with the same test names and the same behavioral assertions.
 *
 * `malformed-tool-input.test.ts` feeds every card a wrong-typed FIELD value —
 * including `replacements: <hostile>` — but never an ARRAY whose ELEMENTS are
 * malformed (`replacements: [null]`, `["a"]`). `fileDiffStats()` runs on the
 * same input, in the card's render path, so a null element must be skipped
 * rather than read through.
 *
 * A second read of the same class lives in `streamingActivityLabel` (the live
 * "Writing `x.ts`" indicator): it reads model-authored fields as strings, so a
 * declared-string field arriving as a number or object must not throw from
 * render.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { streamingActivityLabel } from '@molecule/app-ide-panel-logic'
import { fileDiffStats } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
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

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Mount the edit_file card the way the chat timeline does.
 *
 * @param props - The card's props.
 * @returns The host element the card rendered into.
 */
function mountCard(props: ToolCallCardProps): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(ToolCallCard, props),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
  return host
}

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
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
  it('renders the diff stats for the readable entries instead of throwing', () => {
    const host = mountCard({
      id: 'tc-entries',
      name: 'edit_file',
      input: {
        path: 'src/a.ts',
        replacements: [null, { old_string: 'a', new_string: 'a\nb' }],
      },
      output: {},
      status: 'done',
    })
    // The stat the readable replacement contributes — proof the card both
    // survived the null entry and still counted the good one. The rendered
    // value is pinned EXACTLY: a substring match on '+1' also accepts '+11',
    // '+101'…, so it could not tell a correct count from an order-of-magnitude
    // mis-count.
    const added = Array.from(host.querySelectorAll('span'))
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
