/**
 * Type re-exports for `@molecule/app-ui-react`.
 *
 * @module
 */

import type { ReactNode } from 'react'

import type {
  BoxProps,
  DataAttributes,
  ForwardedElementProps,
  HTMLElementProps,
  ToastProps as CoreToastProps,
  TooltipProps as CoreTooltipProps,
} from '@molecule/app-ui'

type BoxRoot = ForwardedElementProps<BoxProps<ReactNode>, 'children' | 'style'>
type OverlayRootProps = Pick<
  HTMLElementProps,
  Extract<keyof BoxRoot, keyof HTMLElementProps> | 'style' | 'testId' | 'automationId'
> &
  DataAttributes

/** Toast's root box attributes and notification content. */
export interface ToastProps
  extends
    Omit<OverlayRootProps, 'title'>,
    Omit<CoreToastProps, keyof HTMLElementProps | 'children'> {
  /** The displayed notification heading. */
  title?: CoreToastProps['title']
  /** Message shown when no description was supplied. */
  children?: ReactNode
}

/** Tooltip's root box attributes and the trigger that shows its content. */
export interface TooltipProps
  extends
    OverlayRootProps,
    Omit<CoreTooltipProps, keyof HTMLElementProps | 'children' | 'content'> {
  /** The tooltip's content. */
  content: ReactNode
  /** The trigger whose focus or hover reveals the tooltip. */
  children: ReactNode
}

// Re-export all UI types
export type {
  // Accordion
  AccordionItem,
  AccordionProps,
  // Alert
  AlertProps,
  // Avatar
  AvatarProps,
  // Badge
  BadgeProps,
  BaseProps,
  ButtonElementProps,
  ButtonProps,
  // Button
  ButtonVariant,
  // Card
  CardProps,
  ChangeEventHandler,
  // Checkbox
  CheckboxProps,
  Children,
  ColorVariant,
  // Layout
  ContainerProps,
  // Base types
  CSSProperties,
  EventHandler,
  FlexProps,
  FocusEventHandler,
  FormElementProps,
  FormEventHandler,
  FormFieldProps,
  // Form
  FormProps,
  GridProps,
  HTMLElementProps,
  InputElementProps,
  InputProps,
  // Input
  InputType,
  KeyboardEventHandler,
  KitEvent,
  KitFocusEvent,
  KitKeyboardEvent,
  KitModifierKeys,
  KitMouseEvent,
  ModalProps,
  // Modal
  ModalSize,
  MouseEventHandler,
  // Pagination
  PaginationProps,
  RadioGroupProps,
  // Radio
  RadioOption,
  SelectElementProps,
  // Select
  SelectOption,
  SelectProps,
  Size,
  // Skeleton
  SkeletonProps,
  SpacerProps,
  // Spinner
  SpinnerProps,
  // Switch
  SwitchProps,
  // Tabs
  TabItem,
  // Table
  TableColumn,
  TableProps,
  TabsProps,
  TextareaElementProps,
  // Textarea
  TextareaProps,
  // Tooltip
  TooltipPlacement,
} from '@molecule/app-ui'
