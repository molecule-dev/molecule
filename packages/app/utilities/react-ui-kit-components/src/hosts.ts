/**
 * The React implementations of the element and overlay contracts used by the kit.
 *
 * @module
 */

import type { ComponentType, ForwardRefExoticComponent, ReactNode, Ref, RefAttributes } from 'react'

import type { IconName } from '@molecule/app-icons'
import type { OverlayPlatform, ToastMessageProps } from '@molecule/app-react/overlay'
import type {
  BoxProps,
  CheckFieldHandle,
  CheckFieldProps,
  ElementHandle,
  ImageProps,
  PressableProps,
  ScrollAreaProps,
  SelectFieldProps,
  SpinnerProps,
  TableBoxProps,
  TableCellProps,
  TextFieldProps,
  TextProps,
} from '@molecule/app-ui'

type Element<Props, Handle = ElementHandle> = ComponentType<Props & { ref?: Ref<Handle> }>

/** A shared kit component and the handle its renderer exposes. */
export type KitComponent<Props, Handle = ElementHandle> = ForwardRefExoticComponent<
  Props & RefAttributes<Handle>
>

/** A check field may delegate validation focus to a separate visible control, such as a switch. */
export type KitCheckFieldProps = CheckFieldProps & { formFocus?: () => void }

/** The visible part of a Switch. The separate CheckField holds its form value. */
export interface SwitchButtonProps extends PressableProps<ReactNode> {
  /** Activates the shared input after a device toggle. */
  toggle(): void
}

/** The rows and their stable keys, passed to the host before any row is rendered. */
export interface TableRowsProps {
  data: Record<string, unknown>[]
  rowKey(row: Record<string, unknown>, index: number): string | number
  renderRow(row: Record<string, unknown>, index: number): ReactNode
  empty: ReactNode
}

/** The Toast surface can finish dismissal after a renderer-specific exit animation. */
export interface ToastSurfaceProps extends ToastMessageProps {
  closing: boolean
  onExited(): void
}

/** Renders a decorative icon using the selected renderer. */
export type RenderIcon = (
  name: IconName,
  className?: string,
  usage?: 'sort' | 'expanded',
) => ReactNode

/** The hosts a platform supplies when binding the shared component trees. */
export interface KitHosts extends Pick<OverlayPlatform, 'focusStaysWithin'> {
  Box: Element<BoxProps<ReactNode>>
  Text: Element<TextProps<ReactNode>>
  Pressable: Element<PressableProps<ReactNode>>
  CheckField: Element<KitCheckFieldProps, CheckFieldHandle>
  Image: Element<ImageProps>
  SelectField: Element<SelectFieldProps>
  TextField: Element<TextFieldProps>
  ScrollArea: Element<ScrollAreaProps<ReactNode>>
  TableBox: Element<TableBoxProps<ReactNode>>
  TableCell: Element<TableCellProps<ReactNode>>
  SwitchButton: Element<SwitchButtonProps>
  TableRows: ComponentType<TableRowsProps>
  /** The device can use its animated spinner when a table loads. */
  LoadingSpinner?: ComponentType<SpinnerProps>
  ToastSurface: ComponentType<ToastSurfaceProps>
  /** Whether collapsed panels should be unmounted on this renderer. */
  hideCollapsedPanels: boolean
  animateToastExit: boolean
  renderIcon: RenderIcon
}
