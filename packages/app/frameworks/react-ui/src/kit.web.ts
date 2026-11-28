/**
 * React DOM's binding of the shared component trees.
 *
 * @module
 */

import type { ForwardRefExoticComponent, RefAttributes } from 'react'

import type { ReactSelectProps } from '@molecule/app-react-ui-kit-components'
import { createDomKit } from '@molecule/app-react-ui-kit-components/dom'
import type {
  AccordionProps,
  AlertProps,
  AvatarProps,
  CheckboxProps,
  PaginationProps,
  RadioGroupProps,
  SpinnerProps,
  SwitchProps,
  TableProps,
  TabsProps,
  TextareaProps,
} from '@molecule/app-ui'

const kit = createDomKit()

/** Accordion with its browser root ref. */
export const Accordion: ForwardRefExoticComponent<AccordionProps & RefAttributes<HTMLDivElement>> =
  kit.Accordion
/** Alert with its browser root ref. */
export const Alert: ForwardRefExoticComponent<
  AlertProps & { live?: boolean } & RefAttributes<HTMLDivElement>
> = kit.Alert
/** Avatar with its browser root ref. */
export const Avatar: ForwardRefExoticComponent<AvatarProps & RefAttributes<HTMLDivElement>> =
  kit.Avatar
/** Checkbox with its browser input ref. */
export const Checkbox: ForwardRefExoticComponent<CheckboxProps & RefAttributes<HTMLInputElement>> =
  kit.Checkbox
/** Pagination with its navigation element ref. */
export const Pagination: ForwardRefExoticComponent<PaginationProps & RefAttributes<HTMLElement>> =
  kit.Pagination
/** Radio group with its browser root ref. */
export const RadioGroup: ForwardRefExoticComponent<
  RadioGroupProps & RefAttributes<HTMLDivElement>
> = kit.RadioGroup
/** Select with its browser select element ref. */
export const Select: ForwardRefExoticComponent<
  ReactSelectProps & RefAttributes<HTMLSelectElement>
> = kit.Select
/** Loading indicator with its browser root ref. */
export const Spinner: ForwardRefExoticComponent<
  SpinnerProps & { 'data-mol-id'?: string } & RefAttributes<HTMLDivElement>
> = kit.Spinner
/** Switch with its browser button ref. */
export const Switch: ForwardRefExoticComponent<SwitchProps & RefAttributes<HTMLButtonElement>> =
  kit.Switch
/** Data table with its browser table element ref. */
export const Table: ForwardRefExoticComponent<
  TableProps<Record<string, unknown>> & RefAttributes<HTMLTableElement>
> = kit.Table
/** Tabs with their browser root ref. */
export const Tabs: ForwardRefExoticComponent<TabsProps & RefAttributes<HTMLDivElement>> = kit.Tabs
/** Textarea with its browser textarea element ref. */
export const Textarea: ForwardRefExoticComponent<
  TextareaProps & RefAttributes<HTMLTextAreaElement>
> = kit.Textarea
/** The shared notification tree. */
export const Toast = kit.Toast
