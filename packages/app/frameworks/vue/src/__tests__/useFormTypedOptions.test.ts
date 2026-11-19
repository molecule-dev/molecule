/**
 * `useForm` must accept the same options as `createForm` — without a
 * `createForm` factory.
 *
 * The composable used to require a per-call factory even though the forms core
 * exposes a bonded `createForm` accessor, so the documented
 * `useForm({ defaultValues })` call did not compile and the runtime threw.
 * These probes are compiled with the TypeScript API against the REAL composable
 * source, so this test fails when the factory becomes mandatory again or the
 * optional override stops type-checking.
 *
 * @module
 */

import { join } from 'node:path'

import ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Compiles `source` as if it were a file in this package and returns the
 * flattened diagnostics.
 *
 * @param source - The TS source to check.
 * @returns The diagnostic messages TypeScript reports.
 */
function diagnosticsFor(source: string): string[] {
  const virtualFile = join(import.meta.dirname, '__typed-probe__.ts')
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (fileName === virtualFile)
      return ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
    const key = `${fileName}\u0000${JSON.stringify(languageVersion)}`
    if (!parsedFiles.has(key))
      parsedFiles.set(
        key,
        getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile),
      )
    return parsedFiles.get(key)
  }
  host.fileExists = (fileName) => fileName === virtualFile || fileExists(fileName)
  host.readFile = (fileName) => (fileName === virtualFile ? source : readFile(fileName))
  const program = ts.createProgram([virtualFile], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

/**
 * Parsed lib and package files, shared by every probe. Each probe is its own
 * program, and re-parsing the libs and the package sources for every one brings
 * single tests to the 10 s limit on a loaded runner. The probe file itself is
 * never shared.
 */
const parsedFiles = new Map<string, ts.SourceFile | undefined>()

// The one-time parse of the libs and the package is setup, not any one probe's work.
beforeAll(() => {
  diagnosticsFor(`import '../index.js'\n`)
}, 120_000)

describe('useForm accepts the core form options', () => {
  it('takes defaultValues without a createForm factory', () => {
    const diagnostics = diagnosticsFor(`
import { useForm } from '../composables/useForms.js'

export function Login() {
  const form = useForm({ defaultValues: { email: '' }, mode: 'onBlur' })
  const email: string = form.getValue('email')
  const field = form.register('email', { required: 'Email required' })
  return { email, field, state: form.formState.value, submit: form.handleSubmit(() => {}) }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 60_000)

  it('is callable with no options at all', () => {
    const diagnostics = diagnosticsFor(`
import { useForm } from '../composables/useForms.js'

export function Dynamic() {
  const form = useForm()
  const values: Record<string, unknown> = form.formState.value.values
  return values
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 60_000)

  it('still takes an explicit createForm override', () => {
    const diagnostics = diagnosticsFor(`
import type { FormController, FormOptions, FormValuesConstraint } from '@molecule/app-forms'
import { createNativeFormProvider } from '@molecule/app-forms'
import { useForm } from '../composables/useForms.js'

const native = createNativeFormProvider()
const factory = <T extends FormValuesConstraint<T>>(options: FormOptions<T>): FormController<T> =>
  native.createForm(options)

export function Pinned() {
  const form = useForm({ createForm: factory, defaultValues: { email: '' } })
  const email: string = form.getValue('email')
  return email
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 60_000)
})
