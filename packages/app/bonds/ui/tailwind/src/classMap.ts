/**
 * UIClassMap implementation for Tailwind CSS.
 *
 * Wraps existing CVA generators with centralized variant mapping,
 * translating generic `@molecule/app-ui` types (ButtonVariant, ColorVariant, Size)
 * to Tailwind-specific variant names.
 *
 * @module
 */

import type {
  AccordionClassOptions,
  AlertClassOptions,
  AvatarClassOptions,
  BadgeClassOptions,
  ButtonClassOptions,
  ButtonVariant,
  CardClassOptions,
  CheckboxClassOptions,
  ClassMapValue,
  ColorVariant,
  ContainerClassOptions,
  FlexClassOptions,
  FontWeightScale,
  GridClassOptions,
  HeightValue,
  InputClassOptions,
  LabelClassOptions,
  MaxWidthScale,
  ModalClassOptions,
  ModalSize,
  PaginationClassOptions,
  RadioClassOptions,
  SelectClassOptions,
  SeparatorClassOptions,
  Size,
  SpacingProperty,
  SpacingScale,
  SpinnerClassOptions,
  SwitchClassOptions,
  TextareaClassOptions,
  TextScale,
  ToastClassOptions,
  ToastPosition,
  UIClassMap,
  WidthValue,
} from '@molecule/app-ui'

import {
  accordion as accordionRoot,
  accordionChevron,
  accordionContent,
  accordionContentInner,
  accordionItem,
  accordionTrigger,
  accordionTriggerBase,
  actionSheet,
  actionSheetHeader,
  alert,
  alertContent,
  alertDescription,
  alertDismiss,
  alertIconWrapper,
  alertTitle,
  appLayout,
  authAfterSubmit,
  authArrowIcon,
  authBackButton,
  authButtonRow,
  authField,
  authFormError,
  authFormWrapper,
  authHeaderInner,
  authHidden,
  authLoginSignup,
  authLoginSubmit,
  authLoginSubmitFull,
  authPageBody,
  authSubmitButton,
  avatar,
  avatarFallback,
  avatarFallbackIcon,
  avatarImage,
  avatarInitials,
  avatarSquare,
  badge,
  badgeSquare,
  bgBorder,
  bgErrorSubtle,
  borderAll,
  borderB,
  borderBPrimary,
  borderR,
  borderT,
  button,
  buttonIconLeft,
  buttonIconRight,
  buttonSpinner,
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardInteractive,
  cardTitle,
  checkbox,
  controlContainer,
  controlDisabled,
  controlLabel,
  controlText,
  cursorPointer,
  dialogBody,
  dialogClose,
  dialogContent,
  dialogDescription,
  dialogFooter,
  dialogHeader,
  dialogOverlay,
  dialogTitle,
  dialogWrapper,
  displayBlock,
  displayContents,
  displayInlineBlock,
  dropdownContent,
  dropdownItem,
  dropdownItemDisabled,
  dropdownItemIcon,
  dropdownItemLabel,
  dropdownItemShortcut,
  dropdownLabel,
  dropdownSeparator,
  dropdownTrigger,
  flex1,
  floatingInput,
  floatingInputWrapper,
  floatingLabel,
  footerBar,
  footerButton,
  footerLink,
  forgotPasswordLink,
  formError,
  formField,
  formFieldset,
  formFieldsetContents,
  formFieldWrapper,
  formHint,
  headerFixed,
  headerInner,
  iconMd,
  iconSm,
  iconXs,
  input,
  inputClearButton,
  inputInner,
  inputLeftElement,
  inputPadLeft,
  inputPadRight,
  inputRightElement,
  inputWrapper,
  label as labelCva,
  labelBlock,
  languageActive,
  languageGrid,
  languageOption,
  logoIcon,
  logoText,
  mxAuto,
  oauthButton,
  oauthButtonGroup,
  oauthButtonIcon,
  oauthDivider,
  oauthDividerLine,
  oauthDividerText,
  oauthProviderLabel,
  pagination as paginationRoot,
  paginationContent,
  paginationEllipsis,
  paginationInteractive,
  paginationItem,
  paginationLink,
  paginationNext,
  paginationPrevious,
  progress as progressClass,
  progressIndeterminate,
  progressIndicator,
  progressLabelContainer,
  progressLabelText,
  progressWrapper,
  radio,
  radioGroupLabel,
  roundedFull,
  select,
  selectNative,
  separator,
  skeleton as skeletonClass,
  skeletonCircle,
  skeletonNone,
  skeletonTextContainer,
  skeletonWave,
  spinner,
  surfaceSecondary,
  switchBase as switchBaseCva,
  switchThumb as switchThumbCva,
  table,
  tableBody,
  tableBordered,
  tableCaption,
  tableCell,
  tableEmptyCell,
  tableFooter,
  tableHead,
  tableHeader,
  tableHeadSortable,
  tableLoadingOverlay,
  tableRow,
  tableRowClickable,
  tableRowHoverable,
  tableRowStriped,
  tableSortIcon,
  tableSortWrapper,
  tableWrapper,
  tabsContent,
  tabsFitted,
  tabsList,
  tabsTrigger,
  tabTriggerFitted,
  tabTriggerIcon,
  textarea,
  textPrimary,
  textRight,
  textSuccess,
  textWarning,
  themeToggleButton,
  toast,
  toastAction,
  toastClose,
  toastContentWrapper,
  toastDescription,
  toastIconWrapper,
  toastTitle,
  toastViewport,
  tooltipContent,
  tooltipTrigger,
} from './components.js'
import { center, container, flex, grid, notSrOnly, srOnly } from './layout.js'
import { cn } from './utilities.js'

// ============================================================================
// VARIANT MAPPING TABLES
// ============================================================================

/** Map generic Size (5-tier) to 3-tier Tailwind sizes. */
const size3Map: Record<Size, 'sm' | 'md' | 'lg'> = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'lg',
}

/** Map generic Size (5-tier) to 4-tier Tailwind sizes. */
const size4Map: Record<Size, 'sm' | 'md' | 'lg' | 'xl'> = {
  xs: 'sm',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
}

/** Map generic ModalSize to modal Tailwind sizes. */
const sizeModalMap: Record<ModalSize, 'sm' | 'md' | 'lg' | 'xl' | 'full'> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  full: 'full',
}

/** Map generic ButtonVariant to Tailwind button CVA variant. */
const buttonVariantMap: Record<
  ButtonVariant,
  'default' | 'secondary' | 'success' | 'outline' | 'ghost' | 'link' | 'danger'
> = {
  solid: 'default',
  outline: 'outline',
  ghost: 'ghost',
  link: 'link',
}

/** Map generic ColorVariant to Tailwind button CVA variant (color override). */
const buttonColorMap: Record<
  ColorVariant,
  'default' | 'secondary' | 'success' | 'outline' | 'ghost' | 'link' | 'danger'
> = {
  primary: 'default',
  secondary: 'secondary',
  success: 'success',
  warning: 'default',
  error: 'danger',
  info: 'default',
}

/** Map generic ColorVariant to Tailwind badge CVA variant. */
const badgeColorMap: Record<
  ColorVariant,
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error'
> = {
  primary: 'default',
  secondary: 'secondary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'default',
}

// ============================================================================
// CLASS MAP IMPLEMENTATION
// ============================================================================

/**
 * Tailwind CSS UIClassMap implementation.
 *
 * Wire at app startup:
 * ```typescript
 * import { setClassMap } from '`@molecule/app-ui`'
 * import { classMap } from '`@molecule/app-ui-tailwind`'
 * setClassMap(classMap)
 * ```
 */
export const classMap: UIClassMap = {
  cn(...classes: ClassMapValue[]): string {
    return cn(...(classes as Parameters<typeof cn>))
  },

  // ---- Component resolvers ----

  button(opts?: ButtonClassOptions): string {
    const v = opts?.variant
    const c = opts?.color
    const s = opts?.size
    let variant: 'default' | 'secondary' | 'success' | 'outline' | 'ghost' | 'link' | 'danger' =
      'default'
    if (c) variant = buttonColorMap[c]
    else if (v) variant = buttonVariantMap[v]
    const size = s === 'icon' ? ('icon' as const) : s ? size3Map[s] : 'md'
    const base = button({ variant, size })
    return opts?.fullWidth ? cn(base, 'w-full') : base
  },

  input(opts?: InputClassOptions): string {
    const variant = opts?.error ? 'error' : 'default'
    const size = opts?.size ? size3Map[opts.size] : 'md'
    return input({ variant, size })
  },

  textarea(opts?: TextareaClassOptions): string {
    return textarea({ variant: opts?.error ? 'error' : 'default' })
  },

  select(opts?: SelectClassOptions): string {
    const variant = opts?.error ? 'error' : 'default'
    const size = opts?.size ? size3Map[opts.size] : 'md'
    return select({ variant, size })
  },

  checkbox(opts?: CheckboxClassOptions): string {
    return checkbox({ variant: opts?.error ? 'error' : 'default' })
  },

  radio(opts?: RadioClassOptions): string {
    return radio({ variant: opts?.error ? 'error' : 'default' })
  },

  switchBase(opts?: SwitchClassOptions): string {
    const size = opts?.size ? size3Map[opts.size] : 'md'
    return switchBaseCva({ size })
  },

  switchThumb(opts?: SwitchClassOptions): string {
    const size = opts?.size ? size3Map[opts.size] : 'md'
    return switchThumbCva({ size })
  },

  label(opts?: LabelClassOptions): string {
    return labelCva({ required: opts?.required ? 'true' : 'false' })
  },

  card(opts?: CardClassOptions): string {
    return card({ variant: opts?.variant || 'default' })
  },

  badge(opts?: BadgeClassOptions): string {
    const variant = opts?.variant ? badgeColorMap[opts.variant] : 'default'
    return badge({ variant })
  },

  alert(opts?: AlertClassOptions): string {
    return alert({ variant: opts?.variant || 'default' })
  },

  avatar(opts?: AvatarClassOptions): string {
    const size = opts?.size ? size4Map[opts.size] : 'md'
    return avatar({ size })
  },

  modal(opts?: ModalClassOptions): string {
    const size = opts?.size ? sizeModalMap[opts.size] : 'md'
    return dialogContent({ size })
  },

  spinner(opts?: SpinnerClassOptions): string {
    const size = opts?.size ? size4Map[opts.size] : 'md'
    return spinner({ size })
  },

  toast(opts?: ToastClassOptions): string {
    return toast({ variant: opts?.variant || 'default' })
  },

  separator(opts?: SeparatorClassOptions): string {
    return separator({ orientation: opts?.orientation || 'horizontal' })
  },

  accordion(opts?: AccordionClassOptions): string {
    return accordionTrigger({
      variant: (opts?.variant as 'default' | 'bordered') || 'default',
    })
  },

  pagination(opts?: PaginationClassOptions): string {
    const variant = opts?.active ? 'active' : 'default'
    const size = opts?.size ? size3Map[opts.size] : 'md'
    return paginationItem({ variant, size })
  },

  tooltip(): string {
    return tooltipContent
  },

  progress(): string {
    return progressClass
  },

  progressBar(): string {
    return progressIndicator
  },

  skeleton(): string {
    return skeletonClass
  },

  container(opts?: ContainerClassOptions): string {
    const size = opts?.size || 'xl'
    return container({ size: size as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' })
  },

  flex(opts?: FlexClassOptions): string {
    return flex({
      direction: opts?.direction,
      align: opts?.align,
      justify: opts?.justify,
      wrap: opts?.wrap,
      gap: opts?.gap,
    })
  },

  grid(opts?: GridClassOptions): string {
    // Grid CVA uses numeric keys but cva requires string lookups — stringify cols
    const cols = opts?.cols !== undefined ? (String(opts.cols) as unknown as 1) : undefined
    return grid({
      cols,
      gap: opts?.gap,
    })
  },

  cardPadding(size?: Size | 'none'): string {
    if (!size || size === 'none') return ''
    const map: Record<Size, string> = { xs: 'p-2', sm: 'p-3', md: 'p-4', lg: 'p-6', xl: 'p-8' }
    return map[size as Size] || 'p-4'
  },

  progressHeight(size?: Size): string {
    const map: Record<Size, string> = { xs: 'h-1', sm: 'h-1.5', md: 'h-2', lg: 'h-3', xl: 'h-4' }
    return map[size || 'md']
  },

  progressColor(color?: ColorVariant): string {
    const map: Record<ColorVariant, string> = {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
      info: 'bg-info',
    }
    return map[color || 'primary']
  },

  toastContainer(opts?: { position?: ToastPosition }): string {
    const base = 'fixed z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-[420px]'
    const posMap: Record<ToastPosition, string> = {
      top: 'top-0 left-1/2 -translate-x-1/2',
      'top-right': 'top-0 right-0',
      'top-left': 'top-0 left-0',
      bottom: 'bottom-0 left-1/2 -translate-x-1/2',
      'bottom-right': 'bottom-0 right-0',
      'bottom-left': 'bottom-0 left-0',
    }
    return cn(base, posMap[opts?.position || 'bottom-right'])
  },

  radioGroupLayout(direction?: 'horizontal' | 'vertical'): string {
    return direction === 'horizontal' ? 'flex flex-row flex-wrap gap-4' : 'flex flex-col gap-2'
  },

  spacer(opts?: { size?: Size; horizontal?: boolean }): string {
    const map: Record<Size, string> = { xs: '1', sm: '2', md: '4', lg: '6', xl: '8' }
    const val = map[opts?.size || 'md']
    return opts?.horizontal ? `inline-block w-${val}` : `block h-${val}`
  },

  // ---- Static class strings ----

  formError,
  formHint,
  cardHeader,
  cardTitle,
  cardDescription,
  cardContent,
  cardFooter,
  alertTitle,
  alertDescription,
  avatarImage,
  avatarFallback,
  dialogOverlay,
  dialogHeader,
  dialogFooter,
  dialogTitle,
  dialogDescription,
  dialogClose,
  dialogWrapper,
  dialogBody,
  actionSheet,
  actionSheetHeader,
  dropdownContent,
  dropdownItem,
  dropdownSeparator,
  dropdownLabel,
  table,
  tableHeader,
  tableBody,
  tableFooter,
  tableRow,
  tableHead,
  tableCell,
  tableCaption,
  tabsList,
  tabsTrigger,
  tabsContent,
  tooltipContent,
  toastViewport,
  toastTitle,
  toastDescription,
  toastClose,
  toastAction,
  accordionRoot,
  accordionItem,
  accordionContent,
  accordionContentInner,
  paginationRoot,
  paginationContent,
  paginationLink,
  paginationPrevious,
  paginationNext,
  paginationEllipsis,
  center,
  srOnly,
  notSrOnly,

  // ---- Component sub-element tokens ----

  iconXs,
  iconSm,
  iconMd,
  buttonIconLeft,
  buttonIconRight,
  buttonSpinner,
  cardInteractive,
  alertIconWrapper,
  alertContent,
  alertDismiss,
  themeToggleButton,
  oauthDivider,
  oauthDividerLine,
  oauthDividerText,
  oauthButtonGroup,
  oauthButton,
  oauthButtonIcon,
  authFormError,
  forgotPasswordLink,
  floatingInputWrapper,
  floatingInput,
  floatingLabel,
  logoText,
  logoIcon,
  headerFixed,
  headerInner,
  authHeaderInner,
  authPageBody,
  authFormWrapper,
  authField,
  authAfterSubmit,
  authButtonRow,
  authBackButton,
  authSubmitButton,
  authLoginSignup,
  authLoginSubmit,
  authLoginSubmitFull,
  authHidden,
  authArrowIcon,
  appLayout,
  flex1,
  oauthProviderLabel,
  inputWrapper,
  inputInner,
  inputLeftElement,
  inputRightElement,
  inputClearButton,
  inputPadLeft,
  inputPadRight,
  selectNative,
  labelBlock,
  formFieldset,
  formFieldsetContents,
  formField,
  formFieldWrapper,
  controlLabel,
  controlContainer,
  controlText,
  controlDisabled,
  radioGroupLabel,
  accordionChevron,
  accordionTriggerBase,
  tabsFitted,
  tabTriggerFitted,
  tabTriggerIcon,
  paginationInteractive,
  progressWrapper,
  progressLabelContainer,
  progressLabelText,
  progressIndeterminate,
  tableWrapper,
  tableLoadingOverlay,
  tableEmptyCell,
  tableSortWrapper,
  tableSortIcon,
  tableRowStriped,
  tableRowHoverable,
  tableRowClickable,
  tableHeadSortable,
  tableBordered,
  toastIconWrapper,
  toastContentWrapper,
  dropdownTrigger,
  dropdownItemIcon,
  dropdownItemLabel,
  dropdownItemShortcut,
  dropdownItemDisabled,
  tooltipTrigger,
  avatarInitials,
  avatarFallbackIcon,
  avatarSquare,
  badgeSquare,
  skeletonTextContainer,
  skeletonCircle,
  skeletonWave,
  skeletonNone,
  textRight,

  // ---- Display utilities ----

  displayBlock,
  displayInlineBlock,
  displayContents,

  // ---- Layout utilities ----

  mxAuto,
  cursorPointer,
  roundedFull,

  // ---- Grid utilities ----

  gridRows(rows: number): string {
    return `grid-rows-${rows}`
  },

  // ---- Theme surface tokens ----

  page: 'min-h-screen bg-background text-foreground',
  surface: 'bg-surface',
  surfaceSecondary,
  headerBar: 'bg-surface shadow-[0_0_3px_3px_rgba(0,0,0,0.05)]',
  drawer:
    '!fixed !inset-y-0 !right-0 !left-auto !w-full !max-w-sm !h-full !rounded-none !translate-x-0 !translate-y-0 overflow-y-auto bg-surface z-50 shadow-xl',

  // ---- Text color tokens ----

  textMuted: 'text-foreground-secondary',
  textSubtle: 'text-foreground-tertiary',
  textPrimary,
  textSuccess,
  textWarning,
  textError: 'text-error',

  // ---- Border tokens ----

  borderB,
  borderT,
  borderR,
  borderAll,
  borderBPrimary,

  // ---- Background utility tokens ----

  bgErrorSubtle,
  bgBorder,

  // ---- Composite style tokens ----

  sectionHeading: 'text-sm font-semibold uppercase tracking-wider text-foreground-secondary',
  formLabel: 'block text-[11px] uppercase leading-none text-foreground mb-0',
  formLabelSmall: 'block text-xs text-foreground-secondary mb-1',
  link: 'hover:underline',
  prose:
    'prose max-w-none [--tw-prose-body:var(--color-foreground)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-links:var(--color-primary)] [--tw-prose-bullets:var(--color-foreground-secondary)] [--tw-prose-counters:var(--color-foreground-secondary)] [--tw-prose-hr:var(--color-border)]',
  dividerLine: 'w-full border-t border-border',
  overlay: 'fixed inset-0 bg-black/50 z-40',
  footerBar,
  footerLink,
  footerButton,
  languageGrid,
  languageOption,
  languageActive,

  // ---- Spacing utilities ----

  sp(property: SpacingProperty, scale: SpacingScale): string {
    if (scale === 0) return `${property}-0`
    return `${property}-${scale}`
  },

  stack(scale: SpacingScale): string {
    if (scale === 0) return 'space-y-0'
    return `space-y-${scale}`
  },

  // ---- Typography utilities ----

  textSize(size: TextScale): string {
    return `text-${size}`
  },

  fontWeight(weight: FontWeightScale): string {
    return `font-${weight}`
  },

  textCenter: 'text-center',

  // ---- Sizing utilities ----

  w(value: WidthValue | number): string {
    if (typeof value === 'number') return `w-${value}`
    if (value === '1/2') return 'w-1/2'
    if (value === '1/3') return 'w-1/3'
    if (value === '2/3') return 'w-2/3'
    if (value === '1/4') return 'w-1/4'
    if (value === '3/4') return 'w-3/4'
    return `w-${value}`
  },

  h(value: HeightValue | number): string {
    if (typeof value === 'number') return `h-${value}`
    return `h-${value}`
  },

  minH(value: HeightValue): string {
    return `min-h-${value}`
  },

  maxW(value: MaxWidthScale): string {
    return `max-w-${value}`
  },

  shrink0: 'shrink-0',

  // ---- Position utilities ----

  position(value: 'relative' | 'absolute' | 'fixed' | 'sticky'): string {
    return value
  },

  inset0: 'inset-0',
}
