import { type ComponentRef, type ReactNode, useRef } from 'react'
import { expectTypeOf } from 'vitest'

import type { ElementHandle } from '@molecule/app-ui'
import {
  Toast,
  ToastContainer,
  type ToastProps,
  ToastProvider,
  Tooltip,
  type TooltipProps,
  type useToast,
} from '@molecule/app-ui-react'
import { Tooltip as DirectTooltip } from '@molecule/app-ui-react/components/Tooltip.js'

expectTypeOf<ComponentRef<typeof Toast>>().toEqualTypeOf<ElementHandle>()
expectTypeOf<ComponentRef<typeof ToastContainer>>().toEqualTypeOf<ElementHandle>()
expectTypeOf<ComponentRef<typeof Tooltip>>().toEqualTypeOf<ElementHandle>()
expectTypeOf<typeof DirectTooltip>().toEqualTypeOf<typeof Tooltip>()
expectTypeOf<ToastProps['children']>().toEqualTypeOf<ReactNode>()
expectTypeOf<TooltipProps['children']>().toEqualTypeOf<ReactNode>()
expectTypeOf<TooltipProps['content']>().toEqualTypeOf<ReactNode>()
expectTypeOf<'disabled'>().not.toExtend<keyof ToastProps>()
expectTypeOf<'disabled'>().not.toExtend<keyof TooltipProps>()
expectTypeOf<ReturnType<typeof useToast>['toasts'][number]['children']>().toEqualTypeOf<ReactNode>()
expectTypeOf<
  Parameters<ReturnType<typeof useToast>['addToast']>[0]['children']
>().toEqualTypeOf<ReactNode>()

export function NativeRefs() {
  const handle = useRef<ElementHandle>(null)
  return (
    <ToastProvider>
      <Toast ref={handle} />
      <ToastContainer ref={handle} />
      <Tooltip ref={handle} content="Help">
        Trigger
      </Tooltip>
      <DirectTooltip ref={(node) => node?.focus()} content="Help">
        Trigger
      </DirectTooltip>
    </ToastProvider>
  )
}
