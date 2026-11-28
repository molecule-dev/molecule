/**
 * React Native's binding of the shared component trees.
 *
 * @module
 */

import { createKit } from '@molecule/app-react-ui-kit-components'
import { nativeKitHosts } from '@molecule/app-ui-react-native/kit-hosts'

import { renderIcon } from './utilities/renderIcon.js'

/** Kit components bound to React Native's elements and the React kit's icon bond. */
export const {
  Accordion,
  Alert,
  Avatar,
  Checkbox,
  Pagination,
  RadioGroup,
  Select,
  Spinner,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toast,
} = createKit({ ...nativeKitHosts, renderIcon })
