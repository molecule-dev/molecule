/**
 * Focus targets supplied by Vue components that render a Modal.
 *
 * @module
 */

import type { InjectionKey } from 'vue'

import type { OverlayTarget } from '@molecule/app-ui'

/** Lets a composed dialog name the control Modal should focus after teleporting. */
export const modalInitialFocus: InjectionKey<OverlayTarget | undefined> =
  Symbol('Modal initial focus')
