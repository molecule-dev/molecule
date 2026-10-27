/**
 * `useForm` must accept the same options as `createForm` — without a
 * `createForm` factory.
 *
 * The hook used to require a per-call factory even though the forms core
 * exposes a bonded `createForm` accessor, so the documented
 * `useForm({ defaultValues })` call did not compile and the runtime threw.
 * These probes are compiled with the TypeScript API against the REAL hook
 * source, so this test fails when the factory becomes mandatory again or the
 * optional override stops type-checking.
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
  const virtualFile = join(__dirname, '__typed-probe__.tsx')
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

describe('useForm accepts the core form options', () => {
  it('takes defaultValues without a createForm factory', () => {
    const diagnostics = diagnosticsFor(`
import { useForm } from '../hooks/useForm.js'

export function Login() {
  const form = useForm({ defaultValues: { email: '' }, mode: 'onBlur' })
  const email: string = form.getValue('email')
  const field = form.register('email', { required: 'Email required' })
  return { email, field, state: form.formState, submit: form.handleSubmit(() => {}) }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('is callable with no options at all', () => {
    const diagnostics = diagnosticsFor(`
import { useForm } from '../hooks/useForm.js'

export function Dynamic() {
  const form = useForm()
  const values: Record<string, unknown> = form.formState.values
  return values
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('still takes an explicit createForm override', () => {
    const diagnostics = diagnosticsFor(`
import type { FormController, FormOptions, FormValuesConstraint } from '@molecule/app-forms'
import { createNativeFormProvider } from '@molecule/app-forms'
import { useForm } from '../hooks/useForm.js'

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
  })
})
