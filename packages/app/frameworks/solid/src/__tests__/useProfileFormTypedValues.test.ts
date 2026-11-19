// @vitest-environment jsdom

/**
 * The profile and generic form primitives accept a page's values declared as an
 * ordinary interface.
 *
 * `useProfileForm` and `useForm` constrained `TValues` to
 * `Record<string, unknown>`. A TypeScript interface has no implicit index
 * signature, so the documented page — `interface Fields { name: string; … }`
 * passed as `useProfileForm<Account, Fields>` — failed to compile with TS2344
 * even though the identical type alias compiled and the page behaved correctly
 * at runtime. The probes below compile the REAL primitive source with the
 * TypeScript API: the interface cases fail on the old constraint (recorded
 * against the published build in the task report), and the negative cases keep
 * an unknown field name and a wrong field value type rejected.
 *
 * Mirrors the React package's `useProfileFormTypedValues.test.ts`.
 */

import { join } from 'node:path'

import { createComponent, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { useForm, type UseFormResult } from '../primitives/react-forms.js'
import { createTypeCheck } from './typeCheck.js'

/** Compiles a probe as a file of this package and returns its diagnostics. */
const diagnosticsFor = createTypeCheck(join(__dirname, '__typed-probe__.ts'))

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

describe('profile form values accept an ordinary interface', () => {
  it('types useProfileForm and its field bindings from an interface', () => {
    const diagnostics = diagnosticsFor(`
import { useProfileForm } from '../primitives/react-forms.js'

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
  }, 240_000)

  it('types useForm, useWatch and useFieldState from an interface', () => {
    const diagnostics = diagnosticsFor(`
import { createForm } from '@molecule/app-forms'
import { useFieldState, useForm, useWatch } from '../primitives/react-forms.js'

interface Fields {
  email: string
  age: number
}

export function Contact() {
  const form = useForm<Fields>({ defaultValues: { email: '', age: 0 } })
  const controller = createForm<Fields>({ defaultValues: { email: '', age: 0 } })
  const email: string = form.getValue('email')
  const field = form.register('email')
  const watched: () => number = useWatch(controller, 'age')
  const state = useFieldState(controller, 'email')
  return { email, field, watched, state }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 240_000)

  it('rejects an unknown field name and a wrong field value type', () => {
    const unknownField = diagnosticsFor(`
import { useProfileForm } from '../primitives/react-forms.js'

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
import { useForm } from '../primitives/react-forms.js'

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
  }, 240_000)

  it('rejects a primitive values type and a wrong default value', () => {
    const primitive = diagnosticsFor(`
import { useForm } from '../primitives/react-forms.js'

export function Broken() {
  return useForm<string>({})
}
`)
    expect(primitive.join('\n')).toContain('does not satisfy the constraint')

    const wrongDefault = diagnosticsFor(`
import { useForm } from '../primitives/react-forms.js'

interface Fields {
  name: string
  age: number
}

export function Contact() {
  return useForm<Fields>({ defaultValues: { name: '', age: 'forty' } })
}
`)
    expect(wrongDefault.join('\n')).toContain('number')
  }, 240_000)
})

describe('interface-typed useForm values at runtime', () => {
  it('reads and writes an interface-typed field through the bonded provider', () => {
    interface Fields {
      email: string
      age: number
    }

    let form!: UseFormResult<Fields>
    function Probe(): null {
      form = useForm<Fields>({ defaultValues: { email: 'reader@example.test', age: 40 } })
      return null
    }
    const container = document.createElement('div')
    document.body.appendChild(container)
    const dispose = render((): JSX.Element => createComponent(Probe, {}), container)
    disposers.push(() => {
      dispose()
      container.remove()
    })

    expect(form.getValue('email')).toBe('reader@example.test')

    form.setValue('age', 41)

    expect(form.getValue('age')).toBe(41)
    expect(form.formState().values).toEqual({ email: 'reader@example.test', age: 41 })
  })
})
