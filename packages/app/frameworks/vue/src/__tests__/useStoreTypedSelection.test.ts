/**
 * The types `useStore` and `usePromise` give their callers, compiled with the TypeScript API
 * against the real composable sources: without a selector `useStore` reads the store's own state
 * type and refuses a different one, with a selector it reads what the selector returns, and
 * `usePromise` infers the resolved value and the parameters from the function it wraps. The
 * React binding carries the same tests.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Compiles `source` as a file of this package, under its own tsconfig, and returns the
 * flattened diagnostics.
 *
 * @param source - The TypeScript source to check.
 * @returns The diagnostic messages TypeScript reports.
 */
function diagnosticsFor(source: string): string[] {
  const configPath = join(__dirname, '..', '..', 'tsconfig.json')
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    { noEmit: true },
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  )
  const options: ts.CompilerOptions = { ...(parsed?.options ?? {}), noEmit: true }
  const virtualFile = join(__dirname, '__typed-store-probe__.ts')
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
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
import { useStore } from '../composables/useStore.js'

interface Counter { count: number; name: string }
declare const store: Store<Counter>
`

describe('useStore types', () => {
  it('returns the store state type without a selector', () => {
    const diagnostics = diagnosticsFor(`${STORE}
export function Plain() {
  const state: Counter = useStore(store).value
  const same: Counter = useStore(store, { equalityFn: (a, b) => a.count === b.count }).value
  const accessed: Counter = useStore(() => store).value
  return [state, same, accessed]
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 60_000)

  it('returns the selected type with a selector', () => {
    const diagnostics = diagnosticsFor(`${STORE}
export function Selected() {
  const count: number = useStore(store, { selector: (s) => s.count }).value
  const explicit: string = useStore<Counter, string>(store, { selector: (s) => s.name }).value
  const accessed: number = useStore(store, () => ({ selector: (s: Counter) => s.count })).value
  return [count, explicit, accessed]
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 60_000)

  it('refuses a selected type without a selector', () => {
    const diagnostics = diagnosticsFor(`${STORE}
export function Unsound() {
  return useStore<Counter, number>(store)
}
`)

    expect(diagnostics.length).toBeGreaterThan(0)
  }, 60_000)
})

describe('usePromise types', () => {
  it('infers the resolved value and the parameters from the wrapped function', () => {
    const diagnostics = diagnosticsFor(`
import { usePromise } from '../composables/usePromise.js'

declare function getUser(id: string, fresh: boolean): Promise<{ name: string }>

export function Profile() {
  const [state, fetchUser] = usePromise(getUser)
  const name: string | undefined = state.value?.name
  const pending: Promise<{ name: string }> = fetchUser('123', true)
  return [name, pending]
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 60_000)

  it('accepts the resolved value and the parameters as explicit type arguments', () => {
    const diagnostics = diagnosticsFor(`
import { usePromise } from '../composables/usePromise.js'

export function Profile() {
  const [state, fetchUser] = usePromise<{ name: string }, [id: string]>(async (id) => ({ name: id }))
  const name: string | undefined = state.value?.name
  const pending: Promise<{ name: string }> = fetchUser('123')
  return [name, pending]
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 60_000)

  it('refuses arguments the wrapped function does not take', () => {
    const diagnostics = diagnosticsFor(`
import { usePromise } from '../composables/usePromise.js'

declare function getUser(id: string): Promise<{ name: string }>

export function Profile() {
  const [, fetchUser] = usePromise(getUser)
  return fetchUser(123)
}
`)

    expect(diagnostics.length).toBeGreaterThan(0)
  }, 60_000)
})
