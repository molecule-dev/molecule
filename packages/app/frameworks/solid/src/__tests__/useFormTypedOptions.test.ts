/**
 * `useForm` must accept the same options as `createForm` — without a
 * `createForm` factory.
 *
 * The hook used to require a per-call factory even though the forms core
 * exposes a bonded `createForm` accessor, so the documented
 * `useForm({ defaultValues })` call did not compile and the runtime threw.
 * These probes are compiled with the TypeScript API against the REAL primitive
 * source, so this test fails when the factory becomes mandatory again or the
 * optional override stops type-checking.
 *
 * Mirrors the React package's `useFormTypedOptions.test.ts`.
 */

import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createTypeCheck } from './typeCheck.js'

/** Compiles a probe as a file of this package and returns its diagnostics. */
const diagnosticsFor = createTypeCheck(join(__dirname, '__typed-probe__.ts'))

describe('useForm accepts the core form options', () => {
  it('takes defaultValues without a createForm factory', () => {
    const diagnostics = diagnosticsFor(`
import { useForm } from '../primitives/react-forms.js'

export function Login() {
  const form = useForm({ defaultValues: { email: '' }, mode: 'onBlur' })
  const email: string = form.getValue('email')
  const field = form.register('email', { required: 'Email required' })
  return { email, field, state: form.formState, submit: form.handleSubmit(() => {}) }
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 240_000)

  it('is callable with no options at all', () => {
    const diagnostics = diagnosticsFor(`
import { useForm } from '../primitives/react-forms.js'

export function Dynamic() {
  const form = useForm()
  const values: Record<string, unknown> = form.formState().values
  return values
}
`)

    expect(diagnostics.join('\n')).toEqual('')
  }, 240_000)

  it('still takes an explicit createForm override', () => {
    const diagnostics = diagnosticsFor(`
import type { FormController, FormOptions, FormValuesConstraint } from '@molecule/app-forms'
import { createNativeFormProvider } from '@molecule/app-forms'
import { useForm } from '../primitives/react-forms.js'

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
  }, 240_000)
})
