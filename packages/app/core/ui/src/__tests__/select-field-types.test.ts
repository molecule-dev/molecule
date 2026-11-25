import { describe, expectTypeOf, it } from 'vitest'

import type { SelectFieldOption, SelectFieldProps, SelectOption } from '../index.js'

type Single = Extract<SelectFieldProps, { multiple?: false }>
type Multiple = Extract<SelectFieldProps, { multiple: true }>
type Options = { as: 'select'; options: readonly { value: string; label: string }[] }

describe('SelectField types', () => {
  it('pairs each mode with its value, default and callback type', () => {
    expectTypeOf<Omit<SelectFieldOption, 'webDefaultSelected'>>().toEqualTypeOf<
      Pick<SelectOption<string>, 'value' | 'label' | 'disabled'>
    >()
    expectTypeOf<SelectFieldOption['webDefaultSelected']>().toEqualTypeOf<true | undefined>()
    expectTypeOf<Single['value']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Single['defaultValue']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<Single['onValueChange']>().toEqualTypeOf<((value: string) => void) | undefined>()
    expectTypeOf<Multiple['value']>().toEqualTypeOf<readonly string[] | undefined>()
    expectTypeOf<Multiple['defaultValue']>().toEqualTypeOf<readonly string[] | undefined>()
    expectTypeOf<Multiple['onValueChange']>().toEqualTypeOf<
      ((values: readonly string[]) => void) | undefined
    >()
    expectTypeOf<Options>().toExtend<SelectFieldProps>()
    expectTypeOf<Options & { multiple: true }>().toExtend<SelectFieldProps>()
    expectTypeOf<Options & { value: readonly string[] }>().not.toExtend<SelectFieldProps>()
    expectTypeOf<
      Options & { multiple: true; defaultValue: string }
    >().not.toExtend<SelectFieldProps>()
  })

  it('excludes simultaneous controlled and default values in both modes', () => {
    expectTypeOf<
      Options & { value: string; defaultValue: string }
    >().not.toExtend<SelectFieldProps>()
    expectTypeOf<
      Options & { multiple: true; value: readonly string[]; defaultValue: readonly string[] }
    >().not.toExtend<SelectFieldProps>()
  })
})
