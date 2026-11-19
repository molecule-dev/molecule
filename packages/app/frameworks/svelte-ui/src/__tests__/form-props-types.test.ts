/**
 * Compile-time contract of `ReactFormProps`, the Svelte counterpart of
 * `@molecule/app-ui-react`'s `ReactFormProps`.
 *
 * A consumer typed against React's kit imports `ReactFormProps`; swapping that
 * import for `@molecule/app-ui-svelte` must keep compiling, so the name has to
 * exist here with React's members in Svelte's form. The kit's own `FormProps`
 * stays the base `ReactFormProps` extends, and the `Form` component declares
 * its props as `ReactFormProps`, so a member added to one side and not the
 * other stops compiling here.
 *
 * Checked by `scripts/typecheck-tests.mjs` (svelte-check, with the component's
 * real props); `vitest run` runs the file to prove the component still imports.
 *
 * @module
 */
import type { ComponentProps } from 'svelte'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { ReactFormProps } from '../components/form.js'
import type Form from '../components/Form.svelte'
import type { FormProps } from '../types.js'

/** The props the Svelte `Form` component actually declares and accepts. */
type FormComponentProps = ComponentProps<typeof Form>

describe('ReactFormProps', () => {
  it("carries React's form members", () => {
    expectTypeOf<ReactFormProps>().toMatchTypeOf<{
      onFormSubmit?: (data: Record<string, unknown>) => void | Promise<void>
      submitting?: boolean
      onSubmit?: (event: Event) => void | Promise<void>
      action?: string
      method?: 'get' | 'post'
      noValidate?: boolean
      submitError?: unknown
    }>()
  })

  it("agrees with the kit's own FormProps, so neither can drift", () => {
    expectTypeOf<ReactFormProps>().toMatchTypeOf<FormProps>()
    expectTypeOf<FormProps>().toMatchTypeOf<ReactFormProps>()
  })

  it('is the props type the Svelte Form declares', () => {
    expectTypeOf<FormComponentProps>().toMatchTypeOf<ReactFormProps>()
    expectTypeOf<ReactFormProps>().toMatchTypeOf<FormComponentProps>()
  })

  it('accepts a rejected submission as the declared submitError prop', () => {
    const props: FormComponentProps = { submitError: new Error('rejected') }
    expect(props.submitError).toBeInstanceOf(Error)
  })
})
