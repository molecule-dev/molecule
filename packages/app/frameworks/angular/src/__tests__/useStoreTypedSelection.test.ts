/**
 * The types `useStore` and `usePromise` give their callers, compiled with the TypeScript API
 * against the real hook sources: without a selector `useStore` reads the store's own state
 * type and refuses a different one, with a selector it reads what the selector returns, and
 * `usePromise` infers the resolved value and the parameters from the function it wraps. The
 * React binding carries the same tests.
 *
 * Angular's declarations make one program take seconds to check, so every probe is a file of
 * ONE program, compiled once; each test reads its own file's diagnostics.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'

/** The store every `useStore` probe reads. */
const STORE = `
import { signal } from '@angular/core'
import type { Store } from '@molecule/app-state'
import { useStore } from '../hooks/use-store.js'

interface Counter { count: number; name: string }
declare const store: Store<Counter>
`

/** The probe names, one virtual file of the program each. */
const PROBE_NAMES = ['plain', 'selected', 'unsound', 'inferred', 'explicit', 'wrongArgs'] as const

/** A probe's name. */
type ProbeName = (typeof PROBE_NAMES)[number]

/** The probes, by name. */
const PROBES: Record<ProbeName, string> = {
  plain: `${STORE}
export function Plain() {
  const state: Counter = useStore(store)()
  const same: Counter = useStore(store, { equalityFn: (a, b) => a.count === b.count })()
  const accessed: Counter = useStore(signal(store))()
  return [state, same, accessed]
}
`,
  selected: `${STORE}
export function Selected() {
  const count: number = useStore(store, { selector: (s) => s.count })()
  const explicit: string = useStore<Counter, string>(store, { selector: (s) => s.name })()
  const accessed: number = useStore(store, signal({ selector: (s: Counter) => s.count }))()
  return [count, explicit, accessed]
}
`,
  unsound: `${STORE}
export function Unsound() {
  return useStore<Counter, number>(store)
}
`,
  inferred: `
import { usePromise } from '../hooks/use-async.js'

declare function getUser(id: string, fresh: boolean): Promise<{ name: string }>

export function Profile() {
  const [state, fetchUser] = usePromise(getUser)
  const name: string | undefined = state.value?.name
  const pending: Promise<{ name: string }> = fetchUser('123', true)
  return [name, pending]
}
`,
  explicit: `
import { usePromise } from '../hooks/use-async.js'

export function Profile() {
  const [state, fetchUser] = usePromise<{ name: string }, [id: string]>(async (id) => ({ name: id }))
  const name: string | undefined = state.value?.name
  const pending: Promise<{ name: string }> = fetchUser('123')
  return [name, pending]
}
`,
  wrongArgs: `
import { usePromise } from '../hooks/use-async.js'

declare function getUser(id: string): Promise<{ name: string }>

export function Profile() {
  const [, fetchUser] = usePromise(getUser)
  return fetchUser(123)
}
`,
}

/**
 * Compiles every probe as a file of this package, under its own tsconfig, in one program.
 *
 * @returns Each probe's flattened diagnostic messages.
 */
function compileProbes(): Record<ProbeName, string[]> {
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
  const fileOf = (name: ProbeName): string => join(__dirname, `__typed-store-probe-${name}__.ts`)
  const sources = new Map(PROBE_NAMES.map((name) => [fileOf(name), PROBES[name]]))
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = sources.get(fileName)
    return source === undefined
      ? getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
      : ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
  }
  host.fileExists = (fileName) => sources.has(fileName) || fileExists(fileName)
  host.readFile = (fileName) => sources.get(fileName) ?? readFile(fileName)
  const program = ts.createProgram([...sources.keys()], options, host)
  const diagnosticsOf = (name: ProbeName): string[] =>
    ts
      .getPreEmitDiagnostics(program, program.getSourceFile(fileOf(name)))
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  return {
    plain: diagnosticsOf('plain'),
    selected: diagnosticsOf('selected'),
    unsound: diagnosticsOf('unsound'),
    inferred: diagnosticsOf('inferred'),
    explicit: diagnosticsOf('explicit'),
    wrongArgs: diagnosticsOf('wrongArgs'),
  }
}

let diagnostics: Record<ProbeName, string[]>

beforeAll(() => {
  diagnostics = compileProbes()
}, 120_000)

describe('useStore types', () => {
  it('returns the store state type without a selector', () => {
    expect(diagnostics.plain.join('\n')).toEqual('')
  })

  it('returns the selected type with a selector', () => {
    expect(diagnostics.selected.join('\n')).toEqual('')
  })

  it('refuses a selected type without a selector', () => {
    expect(diagnostics.unsound.length).toBeGreaterThan(0)
  })
})

describe('usePromise types', () => {
  it('infers the resolved value and the parameters from the wrapped function', () => {
    expect(diagnostics.inferred.join('\n')).toEqual('')
  })

  it('accepts the resolved value and the parameters as explicit type arguments', () => {
    expect(diagnostics.explicit.join('\n')).toEqual('')
  })

  it('refuses arguments the wrapped function does not take', () => {
    expect(diagnostics.wrongArgs.length).toBeGreaterThan(0)
  })
})
