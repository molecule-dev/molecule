/** React DOM signature for the confirmation button. */
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

import { ConfirmButton as SharedConfirmButton, type ConfirmButtonProps } from './ConfirmButton.js'

/** Confirms a destructive action and forwards the button. */
export const ConfirmButton: ForwardRefExoticComponent<
  ConfirmButtonProps & RefAttributes<HTMLButtonElement>
> = SharedConfirmButton
