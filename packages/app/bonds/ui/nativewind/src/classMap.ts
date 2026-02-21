/**
 * NativeWind UIClassMap implementation.
 *
 * Extends the Tailwind CSS classmap with overrides for classes that are
 * unsupported or behave differently in NativeWind / React Native.
 *
 * NativeWind v4 supports ~90% of Tailwind CSS. Key differences:
 * - No CSS grid (`display: grid`) — use flexbox wrap instead
 * - No `hover:` pseudo-class — touch devices use `active:` instead
 * - No `backdrop-blur` — not supported in RN
 * - No CSS transitions/animations — use RN Animated / Reanimated
 * - No `position: fixed` — RN uses absolute positioning within the viewport
 * - No `portal` rendering — RN Modal handles overlays natively
 * - No `cursor-pointer` — not meaningful on touch devices
 * - No `prose` — typography plugin not supported
 *
 * @module
 */

import type {
  ClassMapValue,
  ContainerClassOptions,
  FlexClassOptions,
  GridClassOptions,
  ModalClassOptions,
  Size,
  ToastPosition,
  UIClassMap,
} from '@molecule/app-ui'
import { classMap as tailwindClassMap } from '@molecule/app-ui-tailwind'

/**
 * NativeWind UIClassMap — Tailwind classmap with RN-compatible overrides.
 *
 * Wire at app startup:
 * ```typescript
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-nativewind'
 * setClassMap(classMap)
 * ```
 */
export const classMap: UIClassMap = {
  ...tailwindClassMap,

  // ---- Overrides for RN-incompatible classes ----

  cn(...classes: ClassMapValue[]): string {
    // NativeWind handles class merging via its own runtime; we still use
    // the same cn() from @molecule/app-styling (tailwind-merge) since
    // NativeWind class strings are valid Tailwind class strings.
    return tailwindClassMap.cn(...classes)
  },

  // Grid: NativeWind does not support CSS grid. Use flexbox wrap instead.
  grid(opts?: GridClassOptions): string {
    const gapMap: Record<string, string> = {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    }
    const gap = opts?.gap ? gapMap[opts.gap] || 'gap-4' : 'gap-4'
    // Approximate grid columns using flex-wrap + percentage widths
    return `flex flex-row flex-wrap ${gap}`
  },

  // Container: Replace responsive max-width with simple padding
  container(opts?: ContainerClassOptions): string {
    const size = opts?.size || 'xl'
    // On mobile, containers just need horizontal padding
    const sizeMap: Record<string, string> = {
      sm: 'w-full px-4',
      md: 'w-full px-4',
      lg: 'w-full px-4',
      xl: 'w-full px-4',
      '2xl': 'w-full px-4',
      full: 'w-full',
    }
    return sizeMap[size] || 'w-full px-4'
  },

  // Modal: Replace fixed positioning + backdrop-blur with RN-compatible classes
  modal(opts?: ModalClassOptions): string {
    const sizeMap: Record<string, string> = {
      sm: 'w-full max-w-sm bg-surface rounded-2xl p-6',
      md: 'w-full max-w-md bg-surface rounded-2xl p-6',
      lg: 'w-full max-w-lg bg-surface rounded-2xl p-6',
      xl: 'w-full max-w-xl bg-surface rounded-2xl p-6',
      full: 'w-full h-full bg-surface',
    }
    const size = opts?.size || 'md'
    return sizeMap[size] || sizeMap.md
  },

  // Toast container: Replace fixed positioning with absolute (within RN viewport)
  toastContainer(opts?: { position?: ToastPosition }): string {
    const base = 'absolute z-50 w-full flex-col-reverse p-4'
    const posMap: Record<ToastPosition, string> = {
      top: 'top-0 items-center',
      'top-right': 'top-0 right-0',
      'top-left': 'top-0 left-0',
      bottom: 'bottom-0 items-center',
      'bottom-right': 'bottom-0 right-0',
      'bottom-left': 'bottom-0 left-0',
    }
    return tailwindClassMap.cn(base, posMap[opts?.position || 'bottom-right'])
  },

  // Spacer: Replace inline-block (no concept in RN) with width/height
  spacer(opts?: { size?: Size; horizontal?: boolean }): string {
    const map: Record<Size, string> = { xs: '1', sm: '2', md: '4', lg: '6', xl: '8' }
    const val = map[opts?.size || 'md']
    return opts?.horizontal ? `w-${val}` : `h-${val}`
  },

  // Flex: Same but ensure default direction (RN defaults to column, Tailwind defaults to row)
  flex(opts?: FlexClassOptions): string {
    return tailwindClassMap.flex({
      ...opts,
      direction: opts?.direction || 'col',
    })
  },

  // ---- Static token overrides ----

  // Replace fixed with absolute (RN has no "fixed")
  page: 'flex-1 bg-background',
  headerBar: 'bg-surface shadow-sm',
  headerFixed: 'absolute top-0 left-0 right-0 z-50',
  overlay: 'absolute inset-0 bg-black/50',
  drawer: 'absolute top-0 right-0 bottom-0 w-full max-w-sm bg-surface',

  // Replace hover pseudo-class with active: for touch
  link: 'active:opacity-70',
  cursorPointer: '',
  tableRowHoverable: 'active:bg-muted/50',

  // Display utilities: RN doesn't have inline-block or block/inline distinction
  displayBlock: '',
  displayInlineBlock: '',
  displayContents: '',

  // Prose: @tailwindcss/typography not supported in NativeWind
  prose: '',

  // Fixed footer: use absolute positioning
  footerBar: 'absolute bottom-0 left-0 right-0 bg-surface border-t border-border',

  // Dialog: absolute instead of fixed
  dialogOverlay: 'absolute inset-0 bg-black/50',
  dialogWrapper: 'absolute inset-0 items-center justify-center',

  // Action sheet: bottom-anchored panel for pickers
  actionSheet: 'absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl max-h-[50%]',
  actionSheetHeader: 'p-4 border-b border-border',

  // Grid rows: not supported, return empty
  gridRows(_rows: number): string {
    return ''
  },

  // Position: RN only supports relative and absolute
  position(value: 'relative' | 'absolute' | 'fixed' | 'sticky'): string {
    if (value === 'fixed' || value === 'sticky') return 'absolute'
    return value
  },

  inset0: 'absolute top-0 right-0 bottom-0 left-0',
}
