/**
 * Public React Native Web entry for the React Native UI kit.
 *
 * @module
 */

import { createDomKit } from '@molecule/app-react-ui-kit-components/dom'
import { Box } from '@molecule/app-react-ui-kit-components/elements/Box.js'

import { bindNativeCallbacks } from './components/kitCallbacks.js'
import { bindNativeToasts } from './components/ToastProvider.js'
import { CheckField, SelectField, TextField, WebSwitchButton } from './web-fields.js'

const kit: ReturnType<typeof createDomKit> = createDomKit({
  CheckField,
  SelectField,
  TextField,
  SwitchButton: WebSwitchButton,
})

/** Kit components drawn with the shared DOM hosts. */
export const { Accordion, Avatar, Pagination, RadioGroup, Table, Tabs, Toast } = kit
/** Components retaining the native kit's eventless callbacks. */
export const { Alert, Checkbox, Select, Switch, Textarea } = bindNativeCallbacks(kit)
/** The inline toast container and its numeric-handle provider. */
export const { ToastContainer, ToastProvider } = bindNativeToasts({ Toast, Box })

export * from './common.js'
