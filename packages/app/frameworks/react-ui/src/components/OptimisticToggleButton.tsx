/**
 * A server-backed boolean button that changes its label immediately and saves in order.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { useOptimisticValue } from '@molecule/app-react'
import type { ButtonProps } from '@molecule/app-ui'

import { Button } from './Button.js'

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
  activeLabel: React.ReactNode
  /** Label when the displayed value is false. */
  inactiveLabel: React.ReactNode
  /** Receives a failed save after the controller has restored the last confirmed value. */
  onError?: (error: unknown) => void
}

/**
 * An optimistic server-backed toggle: the first tap changes its label and pressed state,
 * including while a previous save is pending. Saves run in order, using the latest desired
 * boolean. The newest failure rolls back; `onError` lets the app show its own error message.
 *
 * Render this button after the record loads, give it a key per record, and keep it mounted
 * during same-record refetches. Keep authorization and self-record checks in the app.
 * `disabled` is for those permissions, never for a pending save. Local UI switches use Button
 * or Switch without a server commit.
 *
 * @example
 * ```tsx
 * {repository && canStar && (
 *   <OptimisticToggleButton
 *     key={repository.id}
 *     value={repository.starred}
 *     commit={async (desired) => (await saveStar(repository.id, desired)).starred}
 *     activeLabel={t('repository.unstar', undefined, { defaultValue: 'Unstar' })}
 *     inactiveLabel={t('repository.star', undefined, { defaultValue: 'Star' })}
 *   />
 * )}
 * ```
 */
export const OptimisticToggleButton = forwardRef<HTMLButtonElement, OptimisticToggleButtonProps>(
  ({ value, commit, activeLabel, inactiveLabel, onError, ...props }, ref) => {
    const toggle = useOptimisticValue({
      value,
      commit: (desired) => commit(desired),
      onError: (error) => onError?.(error),
    })
    return (
      <Button
        data-mol-id="optimistic-toggle"
        {...props}
        ref={ref}
        type="button"
        aria-pressed={toggle.value}
        aria-busy={toggle.pending}
        onClick={() => toggle.update((current) => !current)}
      >
        {toggle.value ? activeLabel : inactiveLabel}
      </Button>
    )
  },
)

OptimisticToggleButton.displayName = 'OptimisticToggleButton'
