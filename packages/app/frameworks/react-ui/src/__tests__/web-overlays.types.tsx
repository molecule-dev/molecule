import { type ComponentRef, type RefCallback, useRef } from 'react'

import {
  Toast,
  ToastContainer,
  type ToastProps,
  ToastProvider,
  Tooltip,
  type TooltipProps,
  useToast,
} from '@molecule/app-ui-react'
import { Tooltip as DirectTooltip } from '@molecule/app-ui-react/components/Tooltip.js'

const typedCallback: RefCallback<HTMLDivElement> = (node) => {
  node?.getBoundingClientRect()
}

export function WebRefs() {
  const div = useRef<HTMLDivElement>(null)
  return (
    <>
      <Toast ref={div} />
      <ToastContainer ref={div} />
      <Tooltip ref={div} content="Tip">
        Help
      </Tooltip>
      <Toast ref={typedCallback} />
      <ToastContainer ref={typedCallback} />
      <Tooltip ref={typedCallback} content="Tip">
        Help
      </Tooltip>
    </>
  )
}

export const toast = (
  <Toast
    disabled
    ref={(node) => {
      node?.getBoundingClientRect()
    }}
  />
)
export const container = (
  <ToastContainer
    ref={(node) => {
      node?.querySelector('a')
    }}
  />
)
export const tooltip = (
  <Tooltip
    ref={(node) => {
      node?.dataset.open?.trim()
    }}
    content="Tip"
  >
    Help
  </Tooltip>
)
export const direct = (
  <DirectTooltip
    ref={(node) => {
      node?.getBoundingClientRect()
    }}
    content="Tip"
  >
    Help
  </DirectTooltip>
)

export function width(node: ComponentRef<typeof Toast>) {
  return node.offsetWidth
}

declare const slot: unknown
export const toastProps: ToastProps = { disabled: true, children: slot }
export const tooltipProps: TooltipProps = { disabled: true, children: slot, content: slot }
export const provider = (
  <ToastProvider>
    <Tooltip {...tooltipProps} />
    <Toast {...toastProps} />
  </ToastProvider>
)

export function usePublishedToastPayload() {
  const { addToast, removeToast, toasts } = useToast()
  const id: string = addToast({ disabled: true, children: slot })
  const payloads: (ToastProps & { id: string })[] = toasts
  payloads.push({ id, disabled: true, children: slot })
  removeToast(id)
}
