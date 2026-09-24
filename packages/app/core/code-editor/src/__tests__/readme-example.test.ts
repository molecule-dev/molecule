// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Monaco bond with the
 * `monaco-editor` package (a browser-only engine) replaced by a fake.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

const { fakeMonaco, created } = vi.hoisted(() => {
  const disposable = (): { dispose: () => void } => ({ dispose: (): void => undefined })

  /**
   * A catch-all stand-in for Monaco API namespaces the bond configures but the
   * example never reads (language services, markers, themes, commands).
   *
   * @returns A callable proxy whose every property is another stub.
   */
  const stub = (): unknown =>
    new Proxy(() => undefined, {
      get: (_target, prop) => (prop === 'then' || typeof prop === 'symbol' ? undefined : stub()),
      apply: () => disposable(),
    })

  interface FakeModel {
    uri: string
    getValue: () => string
    setValue: (value: string) => void
    dispose: () => void
  }
  const created: { element: unknown; options: Record<string, unknown> }[] = []

  const withFallback = <T extends object>(target: T): T =>
    new Proxy(target, {
      get: (obj, prop) =>
        prop in obj ? obj[prop as keyof T] : prop === 'then' ? undefined : stub(),
    })

  const createEditor = (element: unknown, options: Record<string, unknown>): unknown => {
    created.push({ element, options })
    let current: FakeModel | null = null
    return withFallback({
      onDidChangeModelContent: () => disposable(),
      setModel: (model: FakeModel) => {
        current = model
      },
      getModel: () => current,
      layout: (): void => undefined,
      dispose: (): void => undefined,
      addCommand: () => 'cmd-1',
    })
  }

  const fakeMonaco = {
    languages: stub(),
    typescript: stub(),
    MarkerSeverity: { Hint: 1, Info: 2, Warning: 4, Error: 8 },
    Uri: { parse: (value: string) => ({ toString: () => value }) },
    editor: withFallback({
      create: createEditor,
      getModel: () => null,
      getModelMarkers: () => [],
      createModel: (content: string, _language: string, uri: unknown): FakeModel => {
        let value = content
        return {
          uri: String(uri),
          getValue: () => value,
          setValue: (next: string) => {
            value = next
          },
          dispose: (): void => undefined,
        }
      },
    }),
  }
  return { fakeMonaco, created }
})

vi.mock('monaco-editor', () => fakeMonaco)

import { provider } from '@molecule/app-code-editor-monaco'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  it('mounts Monaco into the element, opens a file as a tab, and reports changes', async () => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    setProvider(provider)

    const container = document.createElement('div')
    document.body.append(container)

    const editor = requireProvider()
    await editor.mount(container, { theme: 'molecule-dark', fontSize: 13 })
    expect(created[0]?.element).toBe(container)
    expect(created[0]?.options).toMatchObject({ theme: 'molecule-dark', fontSize: 13 })

    const drafts = new Map<string, string>()
    const unsubscribe = editor.onChange((event) => drafts.set(event.path, event.content))
    editor.openFile({
      path: '/src/index.ts',
      content: 'export const answer = 42\n',
      language: 'typescript',
    })

    expect(editor.getContent()).toBe('export const answer = 42\n')
    expect(editor.getTabs()[0]?.label).toBe('index.ts')
    expect(drafts.get('/src/index.ts')).toBe('export const answer = 42\n')

    unsubscribe()
    editor.dispose()
    expect(editor.getTabs()).toEqual([])
  })
})
