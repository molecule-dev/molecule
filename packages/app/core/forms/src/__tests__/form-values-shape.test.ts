/**
 * A form's values type may be an ordinary interface.
 *
 * `FormState`, `FormOptions`, `FormController`, `FormProvider.createForm` and
 * `createForm` were constrained to `Record<string, unknown>`, which a
 * TypeScript interface never satisfies — interfaces have no implicit index
 * signature. An app that named its fields once as an interface (`interface
 * Fields { name: string; bio: string }`) could not pass that type to the shared
 * form contract at all; it had to rewrite the declaration as a type alias.
 *
 * The interface probes below are compiled with the TypeScript API against the
 * REAL source, so they fail on that old constraint. The negative probes keep a
 * primitive, an array, a function and a `Date` rejected, keep an unknown field
 * name and a wrong value type rejected at the option boundary, and prove a
 * forwarder must copy `FormValuesConstraint` rather than widen to `object`.
 */

import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { createForm } from '../index.js'

/**
 * Compiles `source` as if it were a file in this package and returns the
 * flattened diagnostics.
 *
 * @param source - The TypeScript source to check.
 * @returns The diagnostic messages TypeScript reports.
 */
function diagnosticsFor(source: string): string[] {
  const virtualFile = join(__dirname, '__typed-probe__.ts')
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

describe('form values accept an ordinary interface', () => {
  it('types FormOptions, FormState, FormController and createForm from an interface', () => {
    const diagnostics = diagnosticsFor(`
import { createForm, createNativeFormProvider } from '../index.js'
import type { FormController, FormOptions, FormState } from '../index.js'

interface Fields {
  displayName: string
  age: number
  notify: boolean
}

const options: FormOptions<Fields> = {
  defaultValues: { displayName: '', age: 0, notify: true },
  mode: 'onBlur',
}

const state: FormState<Fields> = {
  values: { displayName: 'Reader', age: 40, notify: false },
  errors: {},
  touched: { displayName: true },
  isValid: true,
  isDirty: false,
  isSubmitting: false,
  submitCount: 0,
}

const form: FormController<Fields> = createForm<Fields>(options)
const provider = createNativeFormProvider()
const other = provider.createForm<Fields>(options)

const typed: { age: number; flag: boolean; shown: string } = {
  age: form.getFieldState('age').value,
  flag: other.getState().values.notify,
  shown: state.values.displayName,
}
export { typed }
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('accepts a type alias, an intersection and the empty object type', () => {
    const diagnostics = diagnosticsFor(`
import { createForm } from '../index.js'
import type { FormOptions } from '../index.js'

type Alias = { email: string }
type Mixed = Alias & { age: number }

const alias: FormOptions<Alias> = { defaultValues: { email: '' } }
const mixed: FormOptions<Mixed> = { defaultValues: { email: '', age: 0 } }
const empty: FormOptions<{}> = { defaultValues: {} }

createForm<Alias>(alias)
createForm<Mixed>(mixed)
createForm<{}>(empty)
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('keeps any as the explicit opt-out at the constraint', () => {
    const diagnostics = diagnosticsFor(`
import { createForm } from '../index.js'

const form = createForm<any>({ defaultValues: { anything: 1 } })
export const value: unknown = form.getValue('anything')
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('rejects a primitive, an array, a function and a Date', () => {
    const probes: Array<[string, string]> = [
      ['string', 'createForm<string>({})'],
      ['number', 'createForm<number>({})'],
      ['boolean', 'createForm<boolean>({})'],
      ['null', 'createForm<null>({})'],
      ['unknown', 'createForm<unknown>({})'],
      ['string[]', 'createForm<string[]>({})'],
      ['() => void', 'createForm<() => void>({})'],
      ['Date', 'createForm<Date>({})'],
    ]

    for (const [name, call] of probes) {
      const diagnostics = diagnosticsFor(`
import { createForm } from '../index.js'

${call}
`)
      expect(diagnostics.join('\n'), name).toContain('does not satisfy the constraint')
    }
  })

  it('rejects a union that contains a non-object member', () => {
    const diagnostics = diagnosticsFor(`
import { createForm } from '../index.js'

interface Fields {
  name: string
}

createForm<Fields | string[]>({})
`)

    expect(diagnostics.join('\n')).toContain('does not satisfy the constraint')
  })

  it('rejects an unknown field name and a wrong value type', () => {
    const unknownField = diagnosticsFor(`
import type { FormOptions } from '../index.js'

interface Fields {
  name: string
  age: number
}

const options: FormOptions<Fields> = {
  defaultValues: { name: '', age: 0, nickname: '' },
}
export { options }
`)
    expect(unknownField.join('\n')).toContain('nickname')

    const wrongValue = diagnosticsFor(`
import type { FormOptions } from '../index.js'

interface Fields {
  name: string
  age: number
}

const options: FormOptions<Fields> = {
  defaultValues: { name: '', age: 'forty' },
}
export { options }
`)
    expect(wrongValue.join('\n')).toContain('number')

    const wrongFieldType = diagnosticsFor(`
import { createForm } from '../index.js'

interface Fields {
  name: string
  age: number
}

const form = createForm<Fields>({ defaultValues: { name: '', age: 0 } })
export const age: string = form.getFieldState('age').value
`)
    expect(wrongFieldType.join('\n')).toContain('number')

    const unknownCall = diagnosticsFor(`
import { createForm } from '../index.js'

interface Fields {
  name: string
}

const form = createForm<Fields>({ defaultValues: { name: '' } })
export const missing = form.getFieldState('nickname')
`)
    expect(unknownCall.join('\n')).toContain('nickname')
  })

  it('accepts forwarding that copies FormValuesConstraint and rejects T extends object', () => {
    const copied = diagnosticsFor(`
import type { FormOptions, FormValuesConstraint } from '../index.js'
import { createForm } from '../index.js'

interface Fields {
  name: string
}

export function makeForm<T extends FormValuesConstraint<T>>(options: FormOptions<T>) {
  return createForm<T>(options)
}

export const form = makeForm<Fields>({ defaultValues: { name: '' } })
`)
    expect(copied.join('\n')).toEqual('')

    const widened = diagnosticsFor(`
import type { FormOptions } from '../index.js'
import { createForm } from '../index.js'

interface Fields {
  name: string
}

export function makeForm<T extends object>(options: FormOptions<T>) {
  return createForm<T>(options)
}

export const form = makeForm<Fields>({ defaultValues: { name: '' } })
`)
    expect(widened.join('\n')).toContain('does not satisfy the constraint')
  })
})

describe('interface-typed form values at runtime', () => {
  it('keeps defaults, registration, field writes and submitted values', async () => {
    interface Fields {
      name: string
      age: number
    }

    const form = createForm<Fields>({ defaultValues: { name: '', age: 0 } })
    form.register({ name: 'age' })
    form.setValue('age', 41)

    const name = form.register({ name: 'name' })

    expect(name.value).toBe('')
    expect(form.getValue('age')).toBe(41)
    expect(form.getValues()).toEqual({ name: '', age: 41 })
    expect(form.getState().values).toEqual({ name: '', age: 41 })

    let submitted: Fields | undefined
    await form.handleSubmit((values) => {
      submitted = values
    })()

    expect(submitted).toEqual({ name: '', age: 41 })
  })
})
