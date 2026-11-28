/**
 * The device bindings for the shared React UI kit.
 *
 * @module
 */

import { type ComponentRef, type ReactNode, type Ref, useContext, useEffect, useState } from 'react'
import { Animated, FlatList, Switch } from 'react-native'

import { useTranslation } from '@molecule/app-react'
import type {
  KitHosts,
  RenderIcon,
  SwitchButtonProps,
  TableRowsProps,
  ToastSurfaceProps,
} from '@molecule/app-react-ui-kit-components'
import type { ElementHandle } from '@molecule/app-ui'

import { Spinner } from './components/Spinner.js'
import { nativeAccessibility } from './elements/accessibility.js'
import { Box } from './elements/Box.js'
import { CheckField } from './elements/CheckField.js'
import { mouseEvent } from './elements/events.js'
import { DisabledScope } from './elements/form.js'
import { Image } from './elements/Image.js'
import { Pressable } from './elements/Pressable.js'
import { useNativeRef } from './elements/ref.js'
import { ScrollArea } from './elements/ScrollArea.js'
import { SelectField } from './elements/SelectField.js'
import { nativeStyle } from './elements/style.js'
import { TableRowPosition } from './elements/table.js'
import { TableBox } from './elements/TableBox.js'
import { TableCell } from './elements/TableCell.js'
import { Text } from './elements/Text.js'
import { TextField } from './elements/TextField.js'
import { focusStaysWithin, ToastMessage } from './platform/index.js'

/**
 * Uses the device switch to toggle the shared field.
 */
function SwitchButton(props: SwitchButtonProps & { ref?: Ref<ElementHandle> }): ReactNode {
  const disabled = useContext(DisabledScope) || props.disabled
  const nativeRef = useNativeRef<ComponentRef<typeof Switch>>(props.ref)
  return (
    <Switch
      {...nativeAccessibility(props)}
      ref={nativeRef}
      value={props['aria-checked'] === true}
      onValueChange={() => {
        if (props.onClick) props.onClick(mouseEvent(undefined))
        else props.toggle()
      }}
      disabled={disabled}
      style={nativeStyle(props.style, props.webStyle)}
    />
  )
}

/**
 * Passes row keys and render callbacks to the native list.
 */
function TableRows({ data, rowKey, renderRow, empty }: TableRowsProps): ReactNode {
  if (data.length === 0) return empty
  return (
    <FlatList
      data={data}
      keyExtractor={(row, index) => String(rowKey(row, index))}
      renderItem={({ item, index }) => (
        <TableRowPosition.Provider value={{ first: index === 0, last: index === data.length - 1 }}>
          {renderRow(item, index)}
        </TableRowPosition.Provider>
      )}
    />
  )
}

/**
 * Animates the notification out before completing timed dismissal.
 */
function ToastSurface({ closing, onExited, ...props }: ToastSurfaceProps): ReactNode {
  const [opacity] = useState(() => new Animated.Value(1))
  useEffect(() => {
    if (!closing) return
    const animation = Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true })
    animation.start(({ finished }) => {
      if (finished) onExited()
    })
    return () => animation.stop()
  }, [closing, onExited, opacity])
  return (
    <Animated.View style={{ opacity }}>
      <ToastMessage {...props} />
    </Animated.View>
  )
}

const nativeGlyphs: Partial<Record<Parameters<RenderIcon>[0], [string, string]>> = {
  'chevron-up': ['ui.icon.sortAsc', '↑'],
  'chevron-down': ['ui.icon.chevronDown', '▼'],
  'chevron-left': ['ui.icon.chevronLeft', '‹'],
  'chevron-right': ['ui.icon.chevronRight', '›'],
  'chevrons-left': ['ui.icon.chevronsLeft', '«'],
  'chevrons-right': ['ui.icon.chevronsRight', '»'],
  'ellipsis-horizontal': ['ui.icon.ellipsis', '…'],
  'x-mark': ['ui.icon.close', '✕'],
  user: ['ui.avatar.fallback', '?'],
}

/** A device can draw the kit with its existing text glyphs and no icon bond. */
const renderIcon: RenderIcon = (name, className, usage) => {
  if (usage === 'expanded') {
    return <NativeGlyph message="ui.icon.chevronUp" fallback="▲" className={className} />
  }
  if (usage === 'sort' && name === 'chevron-down') {
    return <NativeGlyph message="ui.icon.sortDesc" fallback="↓" className={className} />
  }
  const glyph = nativeGlyphs[name]
  return glyph ? <NativeGlyph message={glyph[0]} fallback={glyph[1]} className={className} /> : null
}

/**
 * Draws a translated glyph through the native text host.
 */
function NativeGlyph({
  message,
  fallback,
  className,
}: {
  message: string
  fallback: string
  className?: string
}): ReactNode {
  const { t } = useTranslation()
  return (
    <Text as="span" className={className} aria-hidden>
      {t(message, undefined, { defaultValue: fallback })}
    </Text>
  )
}

/** Native hosts for both React UI kit entry points that run on a device. */
export const nativeKitHosts: KitHosts = {
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
  TableRows,
  LoadingSpinner: Spinner,
  SwitchButton,
  ToastSurface,
  animateToastExit: true,
  hideCollapsedPanels: true,
  focusStaysWithin,
  renderIcon,
}
