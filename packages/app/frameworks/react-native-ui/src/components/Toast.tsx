/**
 * Device toast entry for the React Native UI kit.
 *
 * @module
 */

import { nativeKitHosts } from '../kit-hosts.js'
import { kit } from './kit.js'
import { bindNativeToasts } from './ToastProvider.js'

/** A toast on the device renderer. */
export const Toast = kit.Toast
/** The inline toast container and its numeric-handle provider. */
export const { ToastContainer, ToastProvider } = bindNativeToasts({
  Toast,
  Box: nativeKitHosts.Box,
})
export { useToast } from './toastState.js'
