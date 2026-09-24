/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

// The outside world: `monaco-editor` needs a real browser DOM + workers, so it is
// replaced by a fake that records `editor.create` / `createModel`, and answers
// every other registration call (themes, token providers, markers, code actions)
// with an inert disposable stub.
const fake = vi.hoisted(() => {
  /**
   * Builds an inert, infinitely-chainable stub (any property / call returns a stub
   * that is also a disposable).
   *
   * @returns The stub.
   */
  const stub = (): unknown =>
    new Proxy(() => undefined, {
      get: (_target, prop) => (prop === 'then' ? undefined : stub()),
      apply: () => stub(),
    })

  const models: Array<{ value: string; language?: string; uri: string }> = []
  const contentListeners: Array<() => void> = []
  let current: { getValue(): string } | null = null
  const created: Array<Record<string, unknown>> = []

  const editorInstance = {
    setModel: (model: { getValue(): string } | null) => {
      current = model
    },
    getModel: () => current,
    layout: () => undefined,
    onDidChangeModelContent: (listener: () => void) => {
      contentListeners.push(listener)
      return { dispose: () => contentListeners.splice(contentListeners.indexOf(listener), 1) }
    },
    addAction: () => ({ dispose: () => undefined }),
    addCommand: () => 'cmd-1',
    dispose: vi.fn(),
  }

  const editorNs = new Proxy(
    {
      create: (_element: unknown, options: Record<string, unknown>) => {
        created.push(options)
        return editorInstance
      },
      getModel: () => null,
      createModel: (value: string, language: string | undefined, uri: { toString(): string }) => {
        const entry = { value, language, uri: uri.toString() }
        models.push(entry)
        return {
          uri,
          getValue: () => entry.value,
          setValue: (next: string) => {
            entry.value = next
          },
          dispose: () => undefined,
        }
      },
    } as Record<string, unknown>,
    { get: (target, prop: string) => (prop in target ? target[prop] : stub()) },
  )

  const monaco = {
    editor: editorNs,
    languages: stub(),
    typescript: undefined,
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 },
    Uri: { parse: (value: string) => ({ toString: () => value }) },
  }

  /**
   * Simulates the user typing: replaces the active model's text and fires Monaco's
   * content-change event.
   *
   * @param text - The new model text.
   */
  const type = (text: string): void => {
    const last = models[models.length - 1]
    if (last) last.value = text
    for (const listener of [...contentListeners]) listener()
  }

  return { monaco, models, created, editorInstance, type }
})

vi.mock('monaco-editor', () => fake.monaco)

import { requireProvider, setProvider } from '@molecule/app-code-editor'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds Monaco, mounts, opens a file, and reports edits', async () => {
    const element = { id: 'editor' }
    vi.stubGlobal('window', {})
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'editor' ? element : null),
    })
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    setProvider(createProvider({ fontSize: 14, tabSize: 2, minimap: false }))

    const container = document.getElementById('editor')
    if (!container) throw new Error('Missing #editor element')

    const editor = requireProvider()
    await editor.mount(container, { wordWrap: true })
    expect(fake.created[0]).toMatchObject({
      theme: 'molecule-dark',
      fontSize: 14,
      tabSize: 2,
      wordWrap: 'on',
      minimap: { enabled: false },
    })

    editor.openFile({
      path: '/src/greet.ts',
      content: 'export const greet = (name: string) => `Hi ${name}`\n',
      language: 'typescript',
    })
    expect(fake.models[0]).toEqual({
      value: 'export const greet = (name: string) => `Hi ${name}`\n',
      language: 'typescript',
      uri: 'file:///src/greet.ts',
    })

    const edits: Array<{ path: string; content: string }> = []
    const unsubscribe = editor.onChange(({ path, content }) => edits.push({ path, content }))
    expect(editor.getContent()).toBe('export const greet = (name: string) => `Hi ${name}`\n')

    fake.type('export const greet = (name: string) => `Hello ${name}`\n')
    expect(editor.getContent()).toBe('export const greet = (name: string) => `Hello ${name}`\n')
    expect(edits.at(-1)).toEqual({
      path: '/src/greet.ts',
      content: 'export const greet = (name: string) => `Hello ${name}`\n',
    })
    expect(editor.getTabs()[0]?.isDirty).toBe(true)

    unsubscribe()
    editor.dispose()
    await Promise.resolve()
    expect(fake.editorInstance.dispose).toHaveBeenCalledTimes(1)
  })
})
