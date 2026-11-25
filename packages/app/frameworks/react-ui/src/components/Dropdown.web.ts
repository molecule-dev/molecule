/** React DOM signatures for the dropdown family. */

import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react'

import type { DropdownProps } from '@molecule/app-ui'

import * as shared from './Dropdown.js'

/** Opens a list of options and forwards the menu div. */
export const Dropdown: ForwardRefExoticComponent<
  DropdownProps<string> & RefAttributes<HTMLDivElement>
> = shared.Dropdown

/** Labels a group of menu items and forwards its div. */
export const DropdownLabel: ForwardRefExoticComponent<
  { children: ReactNode; className?: string } & RefAttributes<HTMLDivElement>
> = shared.DropdownLabel

/** Separates groups of menu items and forwards its div. */
export const DropdownSeparator: ForwardRefExoticComponent<
  { className?: string } & RefAttributes<HTMLDivElement>
> = shared.DropdownSeparator
