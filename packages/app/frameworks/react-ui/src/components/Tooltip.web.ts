/**
 * React DOM's public Tooltip signature.
 *
 * @module
 */

import type { ForwardRefExoticComponent, RefAttributes } from 'react'

import type { TooltipProps } from '@molecule/app-ui'

import { Tooltip as SharedTooltip } from './Tooltip.js'

/** Displays supplemental content and forwards the tooltip's div while visible. */
export const Tooltip: ForwardRefExoticComponent<TooltipProps & RefAttributes<HTMLDivElement>> =
  SharedTooltip
