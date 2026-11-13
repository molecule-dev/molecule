/**
 * A server-backed boolean button that changes its label immediately and saves in order.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createSignal,
  type JSX,
  on,
  onCleanup,
  splitProps,
} from 'solid-js'

import type { ButtonProps } from '@molecule/app-ui'

import { createOptimisticValue } from '../utilities/optimistic.js'
import { Button } from './Button.jsx'

/** Props for {@link OptimisticToggleButton}. Labels come from the application's translations. */
export interface OptimisticToggleButtonProps extends Omit<
  ButtonProps,
  'children' | 'onClick' | 'loading' | 'loadingText' | 'type' | 'value'
> {
  /** The loaded server value. Mount the button only after its initial record exists. */
  value: boolean
  /** Saves the desired boolean and returns the server-confirmed boolean; reject on failure. */
  commit: (desired: boolean) => Promise<boolean>
  /** Label when the displayed value is true. */
  activeLabel: JSX.Element
  /** Label when the displayed value is false. */
  inactiveLabel: JSX.Element
  /** Receives a failed save after the controller has restored the last confirmed value. */
  onError?: (error: unknown) => void
}

/**
 * An optimistic server-backed toggle: the first tap changes its label and
 * pressed state, including while a previous save is pending. Saves run in
 * order, using the latest desired boolean. The newest failure rolls back;
 * `onError` lets the app show its own error message.
 *
 * @param props - Component props (see {@link OptimisticToggleButtonProps}).
 * @returns The rendered toggle button.
 */
export const OptimisticToggleButton: Component<OptimisticToggleButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'value',
    'commit',
    'activeLabel',
    'inactiveLabel',
    'onError',
  ])

  const controller = createOptimisticValue<boolean>({
    value: local.value,
    commit: (desired: boolean) => local.commit(desired),
    onError: (error: unknown) => local.onError?.(error),
  })
  const [state, setState] = createSignal(controller.getState())
  onCleanup(controller.subscribe((next) => setState(next)))

  // A new server value is taken when it differs from the one last received
  // (the controller's `sync` keeps the shown value while a save runs).
  let received = local.value
  createEffect(
    on(
      () => local.value,
      (value) => {
        if (value === received) return
        received = value
        controller.sync(value)
      },
      { defer: true },
    ),
  )

  return (
    <Button
      data-mol-id="optimistic-toggle"
      {...rest}
      type="button"
      aria-pressed={state().value}
      aria-busy={state().pending}
      onClick={() => controller.update((current) => !current)}
    >
      {state().value ? local.activeLabel : local.inactiveLabel}
    </Button>
  )
}
