/** Renderer-neutral signatures for the dropdown family. */

import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from 'react'

import type { DropdownProps, ElementHandle } from '@molecule/app-ui'

import * as shared from './Dropdown.js'

/** Opens a list of options and forwards the menu's mounted host. */
export const Dropdown: ForwardRefExoticComponent<
  DropdownProps<string> & RefAttributes<ElementHandle>
> = shared.Dropdown

/** Labels a group of menu items. */
export const DropdownLabel: ForwardRefExoticComponent<
  { children: ReactNode; className?: string } & RefAttributes<ElementHandle>
> = shared.DropdownLabel

/** Separates groups of menu items. */
export const DropdownSeparator: ForwardRefExoticComponent<
  { className?: string } & RefAttributes<ElementHandle>
> = shared.DropdownSeparator
