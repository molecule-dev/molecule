/** React Native signature for the confirmation button. */
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

import type { ElementHandle } from '@molecule/app-ui'

import { ConfirmButton as SharedConfirmButton, type ConfirmButtonProps } from './ConfirmButton.js'

export type { ConfirmButtonProps } from './ConfirmButton.js'

/** Confirms a destructive action and forwards its host handle. */
export const ConfirmButton: ForwardRefExoticComponent<
  ConfirmButtonProps & RefAttributes<ElementHandle>
> = SharedConfirmButton
