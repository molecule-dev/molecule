/**
 * The DOM binding of the shared React kit components.
 *
 * @module
 */

import { Fragment, type ReactNode, type Ref } from 'react'

import type { ElementHandle } from '@molecule/app-ui'

import { Box } from './elements/Box.js'
import { CheckField } from './elements/CheckField.js'
import { Image } from './elements/Image.js'
import { Pressable } from './elements/Pressable.js'
import { ScrollArea } from './elements/ScrollArea.js'
import { SelectField } from './elements/SelectField.js'
import { Path, Svg, SvgMarkup } from './elements/Svg.js'
import { TableBox } from './elements/TableBox.js'
import { TableCell } from './elements/TableCell.js'
import { Text } from './elements/Text.js'
import { TextField } from './elements/TextField.js'
import type { KitHosts, SwitchButtonProps, TableRowsProps, ToastSurfaceProps } from './hosts.js'
import { createKit, type ReactKit } from './kit.js'
import { focusStaysWithin, ToastMessage } from './platform/index.js'
import { createIconRenderer } from './utilities/renderIcon.js'

/** The DOM icon rendering used by the public kits. */
export const renderIcon = createIconRenderer({ Path, Svg, SvgMarkup })

/**
 * The visible control is a button in the browser.
 * @param props - The button props and ref.
 * @returns The button.
 */
export function SwitchButton({
  toggle: _toggle,
  ...props
}: SwitchButtonProps & { ref?: Ref<ElementHandle> }): ReactNode {
  return <Pressable {...props} />
}

/** Renders body rows in order or shows the empty row. */
function TableRows({ data, rowKey, renderRow, empty }: TableRowsProps): ReactNode {
  return data.length
    ? data.map((row, index) => (
        <Fragment key={rowKey(row, index)}>{renderRow(row, index)}</Fragment>
      ))
    : empty
}

/** Displays a notification through the DOM overlay platform. */
function ToastSurface({
  closing: _closing,
  onExited: _onExited,
  ...props
}: ToastSurfaceProps): ReactNode {
  return <ToastMessage {...props} />
}

/**
 * Binds the trees to the DOM, with optional form-field hosts for a renderer's form context.
 * @param fields - The controls whose form registration the caller supplies.
 * @returns The DOM kit components.
 */
export function createDomKit(
  fields?: Partial<Pick<KitHosts, 'CheckField' | 'SelectField' | 'SwitchButton' | 'TextField'>>,
): ReactKit {
  return createKit({
    Box,
    Text,
    Pressable,
    CheckField,
    Image,
    SelectField,
    TextField,
    ScrollArea,
    TableBox,
    TableCell,
    SwitchButton,
    TableRows,
    ToastSurface,
    focusStaysWithin,
    animateToastExit: false,
    hideCollapsedPanels: false,
    renderIcon,
    ...fields,
  })
}
