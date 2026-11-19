// @vitest-environment jsdom

/**
 * The profile and generic form composables accept a page's values declared as
 * an ordinary interface.
 *
 * `useProfileForm` and `useForm` constrained `TValues` to
 * `Record<string, unknown>`. A TypeScript interface has no implicit index
 * signature, so the documented page — `interface Fields { name: string; … }`
 * passed as `useProfileForm<Account, Fields>` — failed to compile with TS2344
 * even though the identical type alias compiled and the page behaved correctly
 * at runtime. The probes below compile the REAL composable source with the
 * TypeScript API: the interface cases fail on the old constraint, and the
 * negative cases keep an unknown field name and a wrong field value type
 * rejected.
 *
 * @module
 */

import { join } from 'node:path'

import { mount, type VueWrapper } from '@vue/test-utils'
import ts from 'typescript'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import type { FormValuesConstraint } from '@molecule/app-forms'

import { useForm, type UseFormOptions, type UseFormReturn } from '../composables/useForms.js'

/**
 * Compiles `source` as if it were a file in this package and returns the
 * flattened diagnostics.
 *
 * @param source - The TypeScript source to check.
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

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Mounts one component that creates a form in setup and returns it.
 *
 * @param options - A getter so setup builds the options.
 * @returns The composable result.
 */
function openForm<T extends FormValuesConstraint<T>>(
  options: () => UseFormOptions<T>,
): UseFormReturn<T> {
  let form!: UseFormReturn<T>
  const Page = defineComponent({
    setup() {
      form = useForm<T>(options())
      return () => h('div')
    },
  })
  wrappers.push(mount(Page))
  return form
}

describe('profile form values accept an ordinary interface', () => {
  it('types useProfileForm and its field bindings from an interface', () => {
    const diagnostics = diagnosticsFor(`
import { useProfileForm } from '../composables/useProfileForm.js'

interface Account {
  handle: string
  displayName?: string
  bio?: string
}

interface Fields {
  name: string
  bio: string
  age: number
}

export function Settings() {
  const profile = useProfileForm<Account, Fields>({
    defaultValues: { name: '', bio: '', age: 0 },
    getIdentity: (user) => user.handle,
    toValues: (user) => ({ name: user.displayName ?? '', bio: user.bio ?? '', age: 0 }),
    toPatch: (changes) => ({ displayName: changes.name }),
  })

  const name: string = profile.getValue('name')
  const age: number = profile.getValue('age')
  const field = profile.register('name')
  const value: string = field.value
  const all: Fields = profile.formState.value.values

  return { name, age, value, all, profile }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 60_000)

  it('types useForm, useWatch and useFieldState from an interface', () => {
    const diagnostics = diagnosticsFor(`
import { createForm } from '@molecule/app-forms'
import { useFieldState, useForm, useWatch } from '../composables/useForms.js'

interface Fields {
  email: string
  age: number
}

export function Contact() {
  const form = useForm<Fields>({ defaultValues: { email: '', age: 0 } })
  const controller = createForm<Fields>({ defaultValues: { email: '', age: 0 } })
  const email: string = form.getValue('email')
  const field = form.register('email')
  const watched: number = useWatch(controller, 'age').value
  const state = useFieldState(controller, 'email')
  return { email, field, watched, state }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 60_000)

  it('rejects an unknown field name and a wrong field value type', () => {
    const unknownField = diagnosticsFor(`
import { useProfileForm } from '../composables/useProfileForm.js'

interface Account {
  handle: string
}

interface Fields {
  name: string
  age: number
}

export function Settings() {
  const profile = useProfileForm<Account, Fields>({
    defaultValues: { name: '', age: 0 },
    onSaved: () => {},
    toValues: () => ({ name: '', age: 0 }),
    toPatch: () => ({}),
  })
  return profile.register('nickname')
}
`)
    expect(unknownField.join('\n')).toContain('nickname')
    expect(unknownField.join('\n')).toContain('keyof Fields')

    const wrongValue = diagnosticsFor(`
import { useForm } from '../composables/useForms.js'

interface Fields {
  name: string
  age: number
}

export function Contact() {
  const form = useForm<Fields>({ defaultValues: { name: '', age: 0 } })
  form.setValue('age', 'forty')
  return form
}
`)
    expect(wrongValue.join('\n')).toContain('not assignable')
    expect(wrongValue.join('\n')).toContain('number')
  }, 60_000)

  it('rejects a primitive values type and a wrong default value', () => {
    const primitive = diagnosticsFor(`
import { useForm } from '../composables/useForms.js'

export function Broken() {
  return useForm<string>({})
}
`)
    expect(primitive.join('\n')).toContain('does not satisfy the constraint')

    const wrongDefault = diagnosticsFor(`
import { useForm } from '../composables/useForms.js'

interface Fields {
  name: string
  age: number
}

export function Contact() {
  return useForm<Fields>({ defaultValues: { name: '', age: 'forty' } })
}
`)
    expect(wrongDefault.join('\n')).toContain('number')
  }, 60_000)
})

describe('interface-typed useForm values at runtime', () => {
  it('reads and writes an interface-typed field through the bonded provider', () => {
    interface Fields {
      email: string
      age: number
    }

    const form = openForm<Fields>(() => ({
      defaultValues: { email: 'reader@example.test', age: 40 },
    }))

    expect(form.getValue('email')).toBe('reader@example.test')

    form.setValue('age', 41)

    expect(form.getValue('age')).toBe(41)
    expect(form.formState.value.values).toEqual({ email: 'reader@example.test', age: 41 })
  })
})
