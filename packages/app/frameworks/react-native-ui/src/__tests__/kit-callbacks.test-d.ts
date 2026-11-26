/** Type-checks portable callbacks and rejects DOM handlers, including spread props. */
import type { ComponentProps } from 'react'
import { expectTypeOf, it } from 'vitest'

import type { ChangeEventHandler, FocusEventHandler, MouseEventHandler } from '@molecule/app-ui'

import type {
  Button,
  Card,
  Checkbox,
  Flex,
  Input,
  InputProps,
  Select,
  Switch,
  Textarea,
} from '../index.js'

it('types the native value callbacks', () => {
  type TextChange = (value: string) => void
  type CheckedChange = (checked: boolean) => void
  expectTypeOf<ComponentProps<typeof Input>['onValueChange']>().toEqualTypeOf<
    TextChange | undefined
  >()
  expectTypeOf<ComponentProps<typeof Textarea>['onValueChange']>().toEqualTypeOf<
    TextChange | undefined
  >()
  expectTypeOf<ComponentProps<typeof Select>['onValueChange']>().toEqualTypeOf<
    TextChange | undefined
  >()
  expectTypeOf<ComponentProps<typeof Checkbox>['onCheckedChange']>().toEqualTypeOf<
    CheckedChange | undefined
  >()
  expectTypeOf<ComponentProps<typeof Switch>['onCheckedChange']>().toEqualTypeOf<
    CheckedChange | undefined
  >()
  expectTypeOf<ComponentProps<typeof Input>>().toExtend<InputProps>()
  expectTypeOf<InputProps>().toExtend<Omit<ComponentProps<typeof Input>, 'ref' | 'key'>>()
})

it('rejects web event callbacks', () => {
  type TextField = ComponentProps<typeof Input> | ComponentProps<typeof Textarea>
  type CheckField = ComponentProps<typeof Checkbox> | ComponentProps<typeof Switch>
  type Pressable =
    ComponentProps<typeof Button> | ComponentProps<typeof Card> | ComponentProps<typeof Flex>
  expectTypeOf<{ value: string; onChange: ChangeEventHandler }>().not.toExtend<TextField>()
  expectTypeOf<{ checked: boolean; onChange: ChangeEventHandler }>().not.toExtend<CheckField>()
  expectTypeOf<{ options: []; onChange: ChangeEventHandler }>().not.toExtend<
    ComponentProps<typeof Select>
  >()
  expectTypeOf<{ testId: string; onClick: MouseEventHandler }>().not.toExtend<Pressable>()
  expectTypeOf<{ value: string; onFocus: FocusEventHandler }>().not.toExtend<TextField>()
  expectTypeOf<{ value: string; onBlur: FocusEventHandler }>().not.toExtend<TextField>()
  expectTypeOf<{ value: string; onChange: ChangeEventHandler }>().not.toExtend<InputProps>()
})
