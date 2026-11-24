/**
 * Compile-time contract of the form props the Solid kit exports for React's
 * name-for-name parity.
 *
 * `@molecule/app-ui-react` exports `ReactFormProps` — `FormProps` plus the
 * opaque `submitError` its `Form` renders as an accessible server-error list —
 * and an app swaps the React kit for this one by changing the import, so that
 * name has to exist here with the same members in Solid's form (`children`
 * typed as Solid nodes, as this package's `FormProps` types it). The
 * Solid-named `SolidFormProps` the component is typed with is the same shape,
 * so a member added to one and not the other stops compiling here.
 *
 * Checked by `scripts/typecheck-tests.mjs`; `vitest run` runs the file to
 * prove the components still import and the accepted props hold at runtime.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { describe, expect, expectTypeOf, it } from 'vitest'

import type { FormProps as CoreFormProps } from '@molecule/app-ui'

import type { ReactFormProps, SolidFormProps } from '../components/Form.jsx'
import { Form } from '../components/Form.jsx'
import type { FormProps } from '../types.js'
import type { WithRef } from '../utilities/dom.js'

describe('form props types', () => {
  it('makes ReactFormProps and SolidFormProps one shape, so neither can drift', () => {
    expectTypeOf<ReactFormProps>().toEqualTypeOf<SolidFormProps>()
    expectTypeOf<SolidFormProps>().toEqualTypeOf<ReactFormProps>()
  })

  it('carries React members: every FormProps member, with Solid children, plus the opaque submitError', () => {
    expectTypeOf<ReactFormProps>().toExtend<CoreFormProps>()
    expectTypeOf<FormProps>().toExtend<ReactFormProps>()
    expectTypeOf<ReactFormProps['children']>().toEqualTypeOf<JSX.Element>()
    expectTypeOf<ReactFormProps['submitError']>().toEqualTypeOf<unknown>()
  })

  it('types the Form component with ReactFormProps and Solid’s own ref prop', () => {
    expectTypeOf<Parameters<typeof Form>[0]>().toEqualTypeOf<
      WithRef<ReactFormProps, HTMLFormElement>
    >()
  })

  it('exports the Form component the props type describes', () => {
    // React's opaque failure value is accepted unchanged.
    const props: ReactFormProps = { submitError: { status: 400 } }
    expect(Form).toBeDefined()
    expect(Form.displayName).toBe('Form')
    expect(props.submitError).toEqual({ status: 400 })
  })
})
