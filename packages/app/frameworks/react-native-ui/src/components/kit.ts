/**
 * Shared kit components bound to the device renderer and its public callbacks.
 *
 * @module
 */

import { createKit } from '@molecule/app-react-ui-kit-components'

import { nativeKitHosts } from '../kit-hosts.js'
import { bindNativeCallbacks } from './kitCallbacks.js'

/** The shared components using the device hosts. */
export const kit: ReturnType<typeof createKit> = createKit(nativeKitHosts)
/** Native signatures for the controls with eventless callbacks. */
export const controls = bindNativeCallbacks(kit, true)
