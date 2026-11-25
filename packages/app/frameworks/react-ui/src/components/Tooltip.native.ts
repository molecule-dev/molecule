/**
 * React Native's public Tooltip signature.
 *
 * @module
 */

import type { ForwardRefExoticComponent, RefAttributes } from 'react'

import type { ElementHandle } from '@molecule/app-ui'

import type { TooltipProps } from '../types.js'
import { Tooltip as SharedTooltip } from './Tooltip.js'

/** Displays supplemental content and forwards the tooltip's host handle while visible. */
export const Tooltip: ForwardRefExoticComponent<TooltipProps & RefAttributes<ElementHandle>> =
  SharedTooltip
