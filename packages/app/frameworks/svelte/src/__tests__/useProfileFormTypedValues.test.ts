// @vitest-environment jsdom

/**
 * The profile and generic form hooks accept a page's values declared as an
 * ordinary interface, React's `useProfileFormTypedValues` cases against the
 * Svelte binding: `TValues` is constrained to a form-values object, not to
 * `Record<string, unknown>`, so an interface (no implicit index signature)
 * works while an unknown field name and a wrong value type stay rejected.
 *
 * The probes compile the REAL hook source with the TypeScript API; the field
 * stores are `Readable`s, so a read goes through `get`.
 */

import { join } from 'node:path'

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../context.js'
import { useForm, type UseFormResult } from '../hooks/useForm.js'

/**
 * Compiles `source` as if it were a file in this package and returns the
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
  const virtualFile = join(__dirname, '__typed-probe__.ts')
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

const hosts: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * Mounts a host that calls the hook once during a child's init.
 *
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the host's unmount.
 */
function mountHook<T>(run: () => T): { result: T; stop: () => Promise<void> } {
  const captured: { result?: T } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = run()
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { result, stop }
}

describe('profile form values accept an ordinary interface', () => {
  it('types useProfileForm and its field bindings from an interface', { timeout: 120_000 }, () => {
    const diagnostics = diagnosticsFor(`
import { get } from 'svelte/store'
import { useProfileForm } from '../hooks/useProfileForm.js'

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
  const all: Fields = get(profile.formState).values

  return { name, age, value, all, profile }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('types useForm, useWatch and useFieldState from an interface', { timeout: 120_000 }, () => {
    const diagnostics = diagnosticsFor(`
import { get, type Readable } from 'svelte/store'
import type { FieldState } from '@molecule/app-forms'
import { createForm } from '@molecule/app-forms'
import { useFieldState, useForm, useWatch } from '../hooks/useForm.js'

interface Fields {
  email: string
  age: number
}

export function Contact() {
  const form = useForm<Fields>({ defaultValues: { email: '', age: 0 } })
  const controller = createForm<Fields>({ defaultValues: { email: '', age: 0 } })
  const email: string = form.getValue('email')
  const field = form.register('email')
  const watched: Readable<number> = useWatch(controller, 'age')
  const state = useFieldState(controller, 'email')
  const fieldState: FieldState<Fields[keyof Fields]> = get(state)
  return { email, field, watched, fieldState }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  })

  it('rejects an unknown field name and a wrong field value type', { timeout: 120_000 }, () => {
    const unknownField = diagnosticsFor(`
import { useProfileForm } from '../hooks/useProfileForm.js'

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
import { useForm } from '../hooks/useForm.js'

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
  })

  it('rejects a primitive values type and a wrong default value', { timeout: 120_000 }, () => {
    const primitive = diagnosticsFor(`
import { useForm } from '../hooks/useForm.js'

export function Broken() {
  return useForm<string>({})
}
`)
    expect(primitive.join('\n')).toContain('does not satisfy the constraint')

    const wrongDefault = diagnosticsFor(`
import { useForm } from '../hooks/useForm.js'

interface Fields {
  name: string
  age: number
}

export function Contact() {
  return useForm<Fields>({ defaultValues: { name: '', age: 'forty' } })
}
`)
    expect(wrongDefault.join('\n')).toContain('number')
  })
})

describe('interface-typed useForm values at runtime', () => {
  it('reads and writes an interface-typed field through the bonded provider', () => {
    interface Fields {
      email: string
      age: number
    }

    const { result: form } = mountHook(() =>
      useForm<Fields>({ defaultValues: { email: 'reader@example.test', age: 40 } }),
    )

    expect(form.getValue('email')).toBe('reader@example.test')

    form.setValue('age', 41)

    expect(form.getValue('age')).toBe(41)
    expect(get(form.formState).values).toEqual({ email: 'reader@example.test', age: 41 })
    const asserted: UseFormResult<Fields> = form
    expect(asserted.getValue('age')).toBe(41)
  })
})
