/**
 * The types `useStore` and `usePromise` give their callers, compiled with the TypeScript API
 * against the real hook sources: without a selector `useStore` returns the store's own state
 * type and refuses a different one, with a selector it returns what the selector returns, and
 * `usePromise` infers the resolved value and the parameters from the function it wraps.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Compiles `source` as if it were a file in this package and returns the
 * flattened diagnostics.
 *
 * @param source - The TSX source to check.
 * @returns The diagnostic messages TypeScript reports.
 */
function diagnosticsFor(source: string): string[] {
  const virtualFile = join(__dirname, '__typed-store-probe__.tsx')
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TSX)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  host.fileExists = (fileName) => fileName === virtualFile || fileExists(fileName)
  host.readFile = (fileName) => (fileName === virtualFile ? source : readFile(fileName))
  const program = ts.createProgram([virtualFile], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

/** The store every probe reads. */
const STORE = `
import type { Store } from '@molecule/app-state'
import { useStore } from '../hooks/useStore.js'

interface Counter { count: number; name: string }
declare const store: Store<Counter>
`

describe('useStore types', () => {
  it('returns the store state type without a selector', () => {
    const diagnostics = diagnosticsFor(`${STORE}
export function Plain() {
  const state: Counter = useStore(store)
  const same: Counter = useStore(store, { equalityFn: (a, b) => a.count === b.count })
  return [state, same]
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('returns the selected type with a selector', () => {
    const diagnostics = diagnosticsFor(`${STORE}
export function Selected() {
  const count: number = useStore(store, { selector: (s) => s.count })
  const explicit: string = useStore<Counter, string>(store, { selector: (s) => s.name })
  return [count, explicit]
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('refuses a selected type without a selector', () => {
    const diagnostics = diagnosticsFor(`${STORE}
export function Unsound() {
  return useStore<Counter, number>(store)
}
`)

    expect(diagnostics.length).toBeGreaterThan(0)
  })
})

describe('usePromise types', () => {
  it('infers the resolved value and the parameters from the wrapped function', () => {
    const diagnostics = diagnosticsFor(`
import { usePromise } from '../hooks/usePromise.js'

declare function getUser(id: string, fresh: boolean): Promise<{ name: string }>

export function Profile() {
  const [state, fetchUser] = usePromise(getUser)
  const name: string | undefined = state.value?.name
  const pending: Promise<{ name: string }> = fetchUser('123', true)
  return [name, pending]
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('refuses arguments the wrapped function does not take', () => {
    const diagnostics = diagnosticsFor(`
import { usePromise } from '../hooks/usePromise.js'

declare function getUser(id: string): Promise<{ name: string }>

export function Profile() {
  const [, fetchUser] = usePromise(getUser)
  return fetchUser(123)
}
`)

    expect(diagnostics.length).toBeGreaterThan(0)
  })
})
