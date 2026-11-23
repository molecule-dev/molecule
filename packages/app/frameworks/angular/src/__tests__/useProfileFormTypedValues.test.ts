// @vitest-environment jsdom

/**
 * The profile and generic form functions accept a page's values declared as an
 * ordinary interface.
 *
 * `useProfileForm` and `useForm` constrained `TValues` to
 * `Record<string, unknown>`. A TypeScript interface has no implicit index
 * signature, so the documented page — `interface Fields { name: string; … }`
 * passed as `useProfileForm<Account, Fields>` — failed to compile with TS2344
 * even though the identical type alias compiled and the page behaved correctly
 * at runtime. The probes below compile the REAL function source with the
 * TypeScript API: the interface cases fail on the old constraint, and the
 * negative cases keep an unknown field name and a wrong field value type
 * rejected.
 *
 * @module
 */

import { join } from 'node:path'

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import ts from 'typescript'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { useForm } from '../hooks/use-forms.js'

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
 * single tests to the timeout on a loaded runner. The probe file itself is
 * never shared.
 */
const parsedFiles = new Map<string, ts.SourceFile | undefined>()

// The one-time parse of the libs and the package is setup, not any one probe's work.
beforeAll(() => {
  diagnosticsFor(`import '../index.js'\n`)
}, 300_000)

/** The values the runtime probe creates its form with. */
interface RuntimeFields {
  email: string
  age: number
}

/** A probe that creates a form in an injection context and exposes it. */
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-test-typed-form-probe',
  template: '',
})
class TypedFormProbeComponent {
  readonly form = useForm<RuntimeFields>({
    defaultValues: { email: 'reader@example.test', age: 40 },
  })
}

/**
 * Mounts one component and renders it once.
 *
 * @param component - The component class.
 * @returns The mounted fixture.
 */
function mount<P>(component: Type<P>): ComponentFixture<P> {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [provideZonelessChangeDetection()],
  })
  const fixture = TestBed.createComponent(component)
  fixture.detectChanges()
  return fixture
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
})

describe('profile form values accept an ordinary interface', () => {
  it('types useProfileForm and its field bindings from an interface', () => {
    const diagnostics = diagnosticsFor(`
import { useProfileForm } from '../hooks/use-profile-form.js'

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
  const all: Fields = profile.formState().values

  return { name, age, value, all, profile }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 120_000)

  it('types useForm, useWatch and useFieldState from an interface', () => {
    const diagnostics = diagnosticsFor(`
import { createForm } from '@molecule/app-forms'
import { useFieldState, useForm, useWatch } from '../hooks/use-forms.js'

interface Fields {
  email: string
  age: number
}

export function Contact() {
  const form = useForm<Fields>({ defaultValues: { email: '', age: 0 } })
  const controller = createForm<Fields>({ defaultValues: { email: '', age: 0 } })
  const email: string = form.getValue('email')
  const field = form.register('email')
  const watched: number = useWatch(controller, 'age')()
  const state = useFieldState(controller, 'email')
  return { email, field, watched, state }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 120_000)

  it('rejects an unknown field name and a wrong field value type', () => {
    const unknownField = diagnosticsFor(`
import { useProfileForm } from '../hooks/use-profile-form.js'

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
import { useForm } from '../hooks/use-forms.js'

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
  }, 120_000)

  it('rejects a primitive values type and a wrong default value', () => {
    const primitive = diagnosticsFor(`
import { useForm } from '../hooks/use-forms.js'

export function Broken() {
  return useForm<string>({})
}
`)
    expect(primitive.join('\n')).toContain('does not satisfy the constraint')

    const wrongDefault = diagnosticsFor(`
import { useForm } from '../hooks/use-forms.js'

interface Fields {
  name: string
  age: number
}

export function Contact() {
  return useForm<Fields>({ defaultValues: { name: '', age: 'forty' } })
}
`)
    expect(wrongDefault.join('\n')).toContain('number')
  }, 120_000)
})

describe('interface-typed useForm values at runtime', () => {
  it('reads and writes an interface-typed field through the bonded provider', () => {
    const fixture = mount(TypedFormProbeComponent)
    const form = fixture.componentInstance.form

    expect(form.getValue('email')).toBe('reader@example.test')

    form.setValue('age', 41)

    expect(form.getValue('age')).toBe(41)
    expect(form.formState().values).toEqual({ email: 'reader@example.test', age: 41 })
  }, 120_000)
})
