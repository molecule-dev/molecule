import { expectTypeOf, it } from 'vitest'

import type { BoxProps, DisclosureProps, RuleProps, TextFieldProps } from '../index.js'

it('requires a disclosure summary, admits address containers, and keeps rules void', () => {
  expectTypeOf<{ as: 'details'; summary: string }>().toExtend<DisclosureProps<string>>()
  expectTypeOf<{ as: 'details' }>().not.toExtend<DisclosureProps<string>>()
  expectTypeOf<{ as: 'address' }>().toExtend<BoxProps>()
  expectTypeOf<{ as: 'hr' }>().toExtend<RuleProps>()
  expectTypeOf<{ as: 'hr'; children: string }>().not.toExtend<RuleProps>()
})

it('accepts numeric bounds for number inputs and calendar strings for date inputs', () => {
  expectTypeOf<{
    as: 'input'
    type: 'number'
    min: 0
    max: 255
    step: 0.5
  }>().toExtend<TextFieldProps>()
  expectTypeOf<{
    as: 'input'
    type: 'date'
    min: '2024-02-29'
    step: 'any'
  }>().toExtend<TextFieldProps>()
  expectTypeOf<{ as: 'input'; type: 'date'; min: number }>().not.toExtend<TextFieldProps>()
  expectTypeOf<{ as: 'input'; type: 'number'; max: string }>().not.toExtend<TextFieldProps>()
  expectTypeOf<{ as: 'input'; type: 'text'; step: number }>().not.toExtend<TextFieldProps>()
  expectTypeOf<{ as: 'textarea'; type: 'number'; min: number }>().not.toExtend<TextFieldProps>()
  expectTypeOf<{
    as: 'input' | 'textarea'
    type?: 'number' | 'text'
  }>().toExtend<TextFieldProps>()
})
