/**
 * Type exports for `@molecule/app-ui-solid`: the `@molecule/app-ui` types, with every prop that
 * holds a node typed as a Solid node (`JSX.Element`).
 *
 * `@molecule/app-ui` types a node prop `Children` (`unknown`), so that every framework can read it.
 * The Solid components take the props below instead, under the same names: a node prop takes
 * plain JSX, never an accessor (`() => <Row />`) or other data. Import these from this package,
 * not from `@molecule/app-ui`, to type a value passed to a component here.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import type { WithNodes } from '@molecule/app-solid'
import type {
  AccordionItem as CoreAccordionItem,
  AccordionProps as CoreAccordionProps,
  AlertProps as CoreAlertProps,
  AvatarProps as CoreAvatarProps,
  BadgeProps as CoreBadgeProps,
  ButtonProps as CoreButtonProps,
  CardProps as CoreCardProps,
  CheckboxProps as CoreCheckboxProps,
  ContainerProps as CoreContainerProps,
  DropdownItem as CoreDropdownItem,
  DropdownProps as CoreDropdownProps,
  FlexProps as CoreFlexProps,
  FormFieldProps as CoreFormFieldProps,
  FormProps as CoreFormProps,
  GridProps as CoreGridProps,
  InputProps as CoreInputProps,
  ModalProps as CoreModalProps,
  RadioGroupProps as CoreRadioGroupProps,
  RadioOption as CoreRadioOption,
  SwitchProps as CoreSwitchProps,
  TabItem as CoreTabItem,
  TableColumn as CoreTableColumn,
  TableProps as CoreTableProps,
  TabsProps as CoreTabsProps,
  ToastProps as CoreToastProps,
  TooltipProps as CoreTooltipProps,
} from '@molecule/app-ui'

// The UI types that hold no node, as `@molecule/app-ui` defines them.
export type {
  BaseProps,
  ButtonElementProps,
  // Button
  ButtonVariant,
  ChangeEventHandler,
  ColorVariant,
  // Base types
  CSSProperties,
  EventHandler,
  FocusEventHandler,
  FormElementProps,
  FormEventHandler,
  HTMLElementProps,
  InputElementProps,
  // Input
  InputType,
  KeyboardEventHandler,
  KitEvent,
  KitFocusEvent,
  KitKeyboardEvent,
  KitModifierKeys,
  KitMouseEvent,
  // Modal
  ModalSize,
  MouseEventHandler,
  // Pagination
  PaginationProps,
  SelectElementProps,
  // Select
  SelectOption,
  SelectProps,
  // Separator
  SeparatorProps,
  Size,
  // Skeleton
  SkeletonProps,
  SpacerProps,
  // Spinner
  SpinnerProps,
  TextareaElementProps,
  // Textarea
  TextareaProps,
  // Tooltip
  TooltipPlacement,
} from '@molecule/app-ui'

/** A node a Solid component renders: plain JSX (`@molecule/app-ui`'s `Children`, for Solid). */
export type Children = JSX.Element

/** An accordion item, with its header and content typed as Solid nodes. */
export type AccordionItem<T = string> = WithNodes<CoreAccordionItem<T>, 'header' | 'content'>

/** Accordion props, with each item's nodes typed as Solid nodes. */
export type AccordionProps<T = string> = Omit<CoreAccordionProps<T>, 'items'> & {
  /** The accordion's items. */
  items: AccordionItem<T>[]
}

/** Alert props, with its children and icon typed as Solid nodes. */
export type AlertProps = WithNodes<CoreAlertProps, 'children' | 'icon'>

/** Avatar props, with its fallback typed as a Solid node. */
export type AvatarProps = WithNodes<CoreAvatarProps, 'fallback'>

/** Badge props, with its children typed as Solid nodes. */
export type BadgeProps = WithNodes<CoreBadgeProps, 'children'>

/** Button props, with its children and icons typed as Solid nodes. */
export type ButtonProps = WithNodes<CoreButtonProps, 'children' | 'leftIcon' | 'rightIcon'>

/** Card props, with its children typed as Solid nodes. */
export type CardProps = WithNodes<CoreCardProps, 'children'>

/** Checkbox props, with its label typed as a Solid node. */
export type CheckboxProps = WithNodes<CoreCheckboxProps, 'label'>

/** Container props, with its children typed as Solid nodes. */
export type ContainerProps = WithNodes<CoreContainerProps, 'children'>

/** A dropdown item, with its label and icon typed as Solid nodes. */
export type DropdownItem<T = string> = WithNodes<CoreDropdownItem<T>, 'label' | 'icon'>

/** Dropdown props, with its trigger and each item's nodes typed as Solid nodes. */
export type DropdownProps<T = string> = Omit<
  WithNodes<CoreDropdownProps<T>, 'trigger'>,
  'items'
> & {
  /** The menu's items. */
  items: DropdownItem<T>[]
}

/** Flex props, with its children typed as Solid nodes. */
export type FlexProps = WithNodes<CoreFlexProps, 'children'>

/** Form field props, with its children typed as Solid nodes. */
export type FormFieldProps = WithNodes<CoreFormFieldProps, 'children'>

/** Form props, with its children typed as Solid nodes. */
export type FormProps = WithNodes<CoreFormProps, 'children'>

/** Grid props, with its children typed as Solid nodes. */
export type GridProps = WithNodes<CoreGridProps, 'children'>

/** Input props, with its left and right elements typed as Solid nodes. */
export type InputProps = WithNodes<CoreInputProps, 'leftElement' | 'rightElement'>

/** Modal props, with its children and footer typed as Solid nodes. */
export type ModalProps = WithNodes<CoreModalProps, 'children' | 'footer'>

/** A radio option, with its label typed as a Solid node. */
export type RadioOption<T = string> = WithNodes<CoreRadioOption<T>, 'label'>

/** Radio group props, with each option's label typed as a Solid node. */
export type RadioGroupProps<T = string> = Omit<CoreRadioGroupProps<T>, 'options'> & {
  /** The group's options. */
  options: RadioOption<T>[]
}

/** Switch props, with its label typed as a Solid node. */
export type SwitchProps = WithNodes<CoreSwitchProps, 'label'>

/** A tab, with its label, content and icon typed as Solid nodes. */
export type TabItem<T = string> = WithNodes<CoreTabItem<T>, 'label' | 'content' | 'icon'>

/** Tabs props, with each tab's nodes typed as Solid nodes. */
export type TabsProps<T = string> = Omit<CoreTabsProps<T>, 'items'> & {
  /** The tabs. */
  items: TabItem<T>[]
}

/** A table column, with its header and the cells its `render` returns typed as Solid nodes. */
export type TableColumn<T> = Omit<WithNodes<CoreTableColumn<T>, 'header'>, 'render'> & {
  /**
   * Renders a cell of this column.
   *
   * @param value - The row's value for the column's key.
   * @param row - The row.
   * @param index - The row's index.
   * @returns The cell's content.
   */
  render?: (value: unknown, row: T, index: number) => JSX.Element
}

/** Table props, with its empty content and each column's nodes typed as Solid nodes. */
export type TableProps<T> = Omit<WithNodes<CoreTableProps<T>, 'emptyContent'>, 'columns'> & {
  /** The table's columns. */
  columns: TableColumn<T>[]
}

/** Toast props, with its children typed as Solid nodes. */
export type ToastProps = WithNodes<CoreToastProps, 'children'>

/** Tooltip props, with its content and children typed as Solid nodes. */
export type TooltipProps = WithNodes<CoreTooltipProps, 'content' | 'children'>
