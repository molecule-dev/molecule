/**
 * NativeWind UIClassMap implementation.
 *
 * Extends the Tailwind CSS classmap with overrides for classes that are
 * unsupported or behave differently in NativeWind / React Native.
 *
 * NativeWind v4 supports ~90% of Tailwind CSS. Key differences:
 * - No CSS grid layout: the grid classes stay the web's, and the native elements lay a grid out
 *   from what `splitForNative` reads of them (columns, gaps, spans)
 * - No `hover:` pseudo-class — touch devices use `active:` instead
 * - No `backdrop-blur` — not supported in RN
 * - Transitions and animations run on Reanimated; the Tailwind preset
 *   (`@molecule/app-ui-nativewind/preset`) defines the keyframes this ClassMap names
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
  ModalClassOptions,
  ResponsiveBreakpoint,
  Size,
  ToastPosition,
  UIClassMap,
} from '@molecule/app-ui'
import { classMap as tailwindClassMap } from '@molecule/app-ui-tailwind'

import { forDevice } from './device.js'
import { splitForNative } from './split.js'

/**
 * The web ClassMap with every entry passed through {@link forDevice}: static
 * strings once, functions on each call. `cn` merges strings that are already
 * device classes, so it is kept as is.
 */
const deviceClassMap: UIClassMap = { ...tailwindClassMap }
for (const [key, value] of Object.entries(tailwindClassMap)) {
  if (typeof value === 'string') {
    Object.assign(deviceClassMap, { [key]: forDevice(value) })
  } else if (typeof value === 'function' && key !== 'cn') {
    const web: (...args: unknown[]) => unknown = value
    Object.assign(deviceClassMap, {
      [key]: function (this: unknown, ...args: unknown[]): unknown {
        const result = web.apply(this, args)
        return typeof result === 'string' ? forDevice(result) : result
      },
    })
  }
}

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
  ...deviceClassMap,

  splitForNative,
  // What base.css gives the web's html and body (font, 16px on a 24px line, the foreground colour).
  nativeRootText: 'font-document text-base text-foreground',
  nativeButtonText: 'text-center',
  // Tailwind's preflight makes replaced elements blocks (`img, svg, video, … { display: block }`).
  nativeBlockTags: ['img', 'svg', 'video', 'canvas', 'audio', 'iframe', 'embed', 'object'],
  // Tailwind's breakpoints (`--breakpoint-sm: 40rem` …), in pixels.
  nativeBreakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 },

  // ---- Overrides for RN-incompatible classes ----

  // NativeWind maps min-width breakpoints; the max-* variants the web bond
  // uses are not relied on here. Literal strings so the class scan sees them.
  hiddenBelow(breakpoint: ResponsiveBreakpoint): string {
    return {
      sm: 'hidden sm:flex',
      md: 'hidden md:flex',
      lg: 'hidden lg:flex',
      xl: 'hidden xl:flex',
    }[breakpoint]
  },
  hiddenFrom(breakpoint: ResponsiveBreakpoint): string {
    return { sm: 'sm:hidden', md: 'md:hidden', lg: 'lg:hidden', xl: 'xl:hidden' }[breakpoint]
  },

  cn(...classes: ClassMapValue[]): string {
    // NativeWind handles class merging via its own runtime; we still use
    // the same cn() from @molecule/app-styling (tailwind-merge) since
    // NativeWind class strings are valid Tailwind class strings.
    return tailwindClassMap.cn(...classes)
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
  tableRowHoverable: 'active:bg-surface-secondary',

  // Touch target (WCAG 2.5.5 / Apple HIG / Material): React Native is touch-first,
  // so the `pointer-coarse` variant the web bond uses is not meaningful here —
  // apply the >=44x44px minimum unconditionally to every control that opts in.
  touchTarget: 'min-h-[44px] min-w-[44px]',
  // Compact 36px floor for inline CTAs (banner/chat-card actions) — 44px
  // overwhelms the dense strips/cards that host them; 36 stays tappable.
  // Unconditional, like touchTarget (RN is touch-first).
  touchTargetCompact: 'min-h-[36px] min-w-[36px]',

  // A device view has no display: contents. Block and inline-block keep the web's classes: the
  // native elements read them (splitForNative) to lay out inline flow, and leave them off the view.
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

  // ---- Device equivalents the class rewrite (`forDevice`) cannot derive ----

  // A close button that appears on hover is never seen on a touch screen.
  toastClose: 'absolute right-2 top-2 rounded-md p-1 text-foreground/50 active:text-foreground',
  // Pseudo-elements (`before:`) do not exist on a device: the active row's
  // accent is its left border.
  resultItemActive: 'bg-surface-secondary border-l-2 border-primary',
  // A gradient background does not paint on a device; the wave pulses instead.
  skeletonWave: 'animate-shimmer',
  // Web-only: a ScrollView hides its indicator with a prop.
  facetedSearchBar: 'absolute z-40 border-b border-outline-variant/20 overflow-x-auto',
  // The family comes from the icon font (`getFont('icon')`), which the GlyphIcon element sets.
  iconGlyphFont: 'font-normal not-italic leading-none tracking-normal normal-case',
}
