/**
 * Liquid glass ClassMap overrides for Tailwind CSS.
 *
 * Adds backdrop-filter blur and saturation effects to surface components,
 * creating a frosted glass appearance when paired with translucent theme colors.
 *
 * @module
 */

import type { ClassMapOverrides } from '@molecule/app-ui'
import type { UIClassMap } from '@molecule/app-ui'
import { extendClassMap } from '@molecule/app-ui'
import { classMap as baseClassMap } from '@molecule/app-ui-tailwind'

/**
 * Glass effect ClassMap overrides.
 *
 * Layers backdrop-filter blur and saturation boost onto surface components.
 * Designed to pair with translucent theme colors (rgba surfaces with alpha).
 * @param base - The base UIClassMap to extend with glass effects.
 * @returns An object of class overrides applying frosted glass backdrop filters.
 */
export const glassOverrides: ClassMapOverrides = (base: UIClassMap) => ({
  // Surface-level components get frosted glass treatment
  card: (opts) => base.cn(base.card(opts), 'backdrop-blur-xl backdrop-saturate-150'),
  modal: (opts) => base.cn(base.modal(opts), 'backdrop-blur-2xl backdrop-saturate-150'),
  toast: (opts) => base.cn(base.toast(opts), 'backdrop-blur-xl backdrop-saturate-150'),
  tooltip: () => base.cn(base.tooltip(), 'backdrop-blur-lg backdrop-saturate-150'),

  // Static surface tokens
  headerBar: base.cn(base.headerBar, 'backdrop-blur-xl backdrop-saturate-[1.8]'),
  drawer: base.cn(base.drawer, 'backdrop-blur-2xl backdrop-saturate-150'),
  dropdownContent: base.cn(base.dropdownContent, 'backdrop-blur-xl backdrop-saturate-150'),
  tabsList: base.cn(base.tabsList, 'backdrop-blur-lg backdrop-saturate-150'),
  actionSheet: base.cn(base.actionSheet, 'backdrop-blur-2xl backdrop-saturate-150'),

  // Heavier blur on overlay for depth
  dialogOverlay: base.cn(base.dialogOverlay, 'backdrop-blur-md'),
})

/**
 * Complete glass ClassMap — base Tailwind classMap extended with glass overrides.
 *
 * Wire at app startup:
 * ```typescript
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind-glass'
 * setClassMap(classMap)
 * ```
 */
export const classMap: UIClassMap = extendClassMap(baseClassMap, glassOverrides)
