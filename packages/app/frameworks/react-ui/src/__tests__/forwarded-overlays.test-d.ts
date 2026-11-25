import { type ComponentProps, createRef, type Ref } from 'react'
import { expectTypeOf } from 'vitest'

import type { ElementHandle } from '@molecule/app-ui'

import type { Toast, ToastContainer, Tooltip } from '../index.js'
import type { ToastProps, TooltipProps } from '../types.js'

expectTypeOf<ComponentProps<typeof Toast>['ref']>().toEqualTypeOf<Ref<ElementHandle> | undefined>()
expectTypeOf<ComponentProps<typeof ToastContainer>['ref']>().toEqualTypeOf<
  Ref<ElementHandle> | undefined
>()
expectTypeOf<ComponentProps<typeof Tooltip>['ref']>().toEqualTypeOf<
  Ref<ElementHandle> | undefined
>()
expectTypeOf(createRef<ElementHandle>()).toExtend<Ref<ElementHandle>>()
expectTypeOf<'disabled'>().not.toExtend<keyof ToastProps>()
expectTypeOf<'as'>().not.toExtend<keyof TooltipProps>()
expectTypeOf<{
  content: string
  children: string
  style: { width: number }
  testId: string
}>().toExtend<TooltipProps>()
