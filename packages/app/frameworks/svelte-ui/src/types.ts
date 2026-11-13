/**
 * Types for `@molecule/app-ui-svelte`.
 *
 * Each component's props interface lives here, in TypeScript, and is the single
 * source of truth for that component: the component annotates its `$props()`
 * with the interface and `svelte-package` generates the published
 * `.svelte.d.ts` from it, so the declaration a consumer type-checks against
 * can never drift from what the component reads.
 *
 * The framework-neutral prop types shared with `@molecule/app-ui` are
 * re-exported below; the Svelte components' own props replace the React-shaped
 * declarations of the same name (a Svelte component's `children` is a snippet,
 * not a React node).
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { IconName } from '@molecule/app-icons'
import type { ColorVariant, ToastPosition, TooltipPlacement } from '@molecule/app-ui'

import type { ShellSidebarWidth } from './shell-context.js'
import type { CSSStyle } from './style.js'

// Re-export the framework-neutral UI types the components build on.
export type {
  AccordionItem,
  BaseProps,
  ButtonElementProps,
  ButtonVariant,
  ChangeEventHandler,
  Children,
  ColorVariant,
  CSSProperties,
  EventHandler,
  FocusEventHandler,
  FormElementProps,
  FormEventHandler,
  HTMLElementProps,
  InputElementProps,
  InputType,
  KeyboardEventHandler,
  ModalSize,
  MouseEventHandler,
  RadioOption,
  SelectElementProps,
  SelectOption,
  Size,
  TableColumn,
  TextareaElementProps,
  TooltipPlacement,
} from '@molecule/app-ui'

/** One accordion entry. */
export interface AccordionEntry {
  /** Item value (expansion key). */
  value: string
  /** Trigger label. */
  header?: Snippet | string
  /** Panel content. */
  content?: Snippet | string
  /** Disables the item's trigger. */
  disabled?: boolean
  /** Any extra fields. */
  [key: string]: unknown
}

/** Props for {@link Accordion}. */
export interface AccordionProps {
  /** The accordion entries. */
  items: AccordionEntry[]
  /** Controlled expanded value(s). */
  value?: string | string[]
  /** Initially expanded value(s). */
  defaultValue?: string | string[]
  /** Called with the new expanded value(s). */
  onChange?: (value: string & string[]) => void
  /** Whether several items can be expanded at once. */
  multiple?: boolean
  /** Whether the last expanded item can collapse. */
  collapsible?: boolean
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link Alert}. */
export interface AlertProps {
  /** Alert content. */
  children?: Snippet
  /** Alert title. */
  title?: string
  /** Status color. */
  status?: 'info' | 'success' | 'warning' | 'error' | 'primary' | 'secondary'
  /** Legacy variant prop; left-accent renders a leading bar. */
  variant?: string
  /** Assertive (role alert) or polite (role status) announcement. */
  live?: boolean
  /** Whether the dismiss button renders. */
  dismissible?: boolean
  /** Called when the dismiss button is clicked. */
  onDismiss?: () => void
  /** Custom leading icon. */
  icon?: Snippet
  /** Accessible label of the dismiss button. */
  dismissLabel?: string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link AuthGuard}. */
export interface AuthGuardProps {
  /** Element rendered while the auth status is loading. */
  loadingFallback?: Snippet | string
  /** i18n key for the default loading-tag text. */
  loadingKey?: string
  /** Fallback text if the i18n key is missing. */
  loadingDefault?: string
  /** Path to redirect to when unauthenticated. */
  loginPath?: string
  /** Callback invoked when isAuthenticated transitions to true. */
  onAuthenticated?: () => void
  /** Children to render when authenticated. */
  children?: Snippet
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link Avatar}. */
export interface AvatarProps {
  /** Image source; the fallback shows when absent or failed. */
  src?: string
  /** Image alt text. */
  alt?: string
  /** Name used for initials fallback. */
  name?: string
  /** Avatar size. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  /** Whether the avatar is fully rounded. */
  rounded?: boolean
  /** Custom fallback content. */
  fallback?: Snippet
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link Badge}. */
export interface BadgeProps {
  /** Badge content. */
  children?: Snippet
  /** Color variant. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  /** Legacy variant prop (ignored). */
  variant?: string
  /** Badge size. */
  size?: 'sm' | 'md' | 'lg'
  /** Whether the badge is fully rounded. */
  rounded?: boolean
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link Button}. */
export interface ButtonProps {
  /** Button content. */
  children?: Snippet
  /** Visual variant. */
  variant?: 'solid' | 'outline' | 'ghost' | 'link'
  /** Color variant. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  /** Control size. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Disables the button and marks it busy while true. */
  loading?: boolean
  /** Text shown instead of children while loading. */
  loadingText?: string
  /** Stretches the button to the full width. */
  fullWidth?: boolean
  /** Icon before the label. */
  leftIcon?: Snippet
  /** Icon after the label. */
  rightIcon?: Snippet
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** Disables the button. */
  disabled?: boolean
  /** Native button type. */
  type?: 'button' | 'submit' | 'reset'
  /** Click handler. */
  onClick?: (event: MouseEvent) => void
  /** Any extra attributes forwarded to the button. */
  [key: string]: unknown
}

/** Props for {@link Card}. */
export interface CardProps {
  /** Card content. */
  children?: Snippet
  /** Card variant. */
  variant?: string
  /** Whether the card is an interactive button target. */
  interactive?: boolean
  /** Padding size. */
  padding?: string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** Click handler. */
  onClick?: (event: MouseEvent) => void
  /** Any extra data-* or aria-* attributes forwarded to the card. */
  [key: string]: unknown
}

/** Props for {@link CardContent}. */
export interface CardContentProps {
  /** Content. */
  children?: Snippet
  /** Extra class names. */
  className?: string
  style?: CSSStyle
  /** Any extra attributes forwarded to the div. */
  [key: string]: unknown
}

/** Props for {@link CardDescription}. */
export interface CardDescriptionProps {
  /** Description content. */
  children?: Snippet
  /** Extra class names. */
  className?: string
  style?: CSSStyle
  /** Any extra attributes forwarded to the paragraph. */
  [key: string]: unknown
}

/** Props for {@link CardFooter}. */
export interface CardFooterProps {
  /** Footer content. */
  children?: Snippet
  /** Extra class names. */
  className?: string
  style?: CSSStyle
  /** Any extra attributes forwarded to the div. */
  [key: string]: unknown
}

/** Props for {@link CardHeader}. */
export interface CardHeaderProps {
  /** Header content. */
  children?: Snippet
  /** Extra class names. */
  className?: string
  style?: CSSStyle
  /** Any extra attributes forwarded to the div. */
  [key: string]: unknown
}

/** Props for {@link CardTitle}. */
export interface CardTitleProps {
  /** Title content. */
  children?: Snippet
  /** Extra class names. */
  className?: string
  style?: CSSStyle
  /** Any extra attributes forwarded to the heading. */
  [key: string]: unknown
}

/** Props for {@link Checkbox}. */
export interface CheckboxProps {
  /** Label content. */
  label?: string | Snippet
  /** Controlled checked state. */
  checked?: boolean
  /** Initial checked state for uncontrolled usage. */
  defaultChecked?: boolean
  /** Whether the indeterminate flag is set on the input. */
  indeterminate?: boolean
  /** Legacy size prop (ignored). */
  size?: string
  /** Error message. */
  error?: string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Disables the checkbox. */
  disabled?: boolean
  /** Form field name. */
  name?: string
  /** Explicit id. */
  id?: string
  /** Change handler (fires on the click-driven change, like React onChange). */
  onChange?: (event: Event) => void
  /** Any extra attributes forwarded to the input. */
  [key: string]: unknown
}

/** Props for {@link ConfirmButton}. */
export interface ConfirmButtonProps {
  /** Fired ONLY on the confirming (second) click. */
  onConfirm: () => void | Promise<void>
  /** Visible label in the idle state. */
  label?: Snippet | string
  /** Visible label in the armed state. */
  confirmLabel?: Snippet | string
  /** Visible label while onConfirm is pending. */
  pendingLabel?: Snippet | string
  /** Seconds before the armed state auto-disarms; 0 disables. */
  disarmSeconds?: number
  /** Disable the control entirely. */
  disabled?: boolean
  /** data-testid. */
  testId?: string
  /** Extra class names. */
  className?: string
  /** Button color. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  /** Control size. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Visual variant. */
  variant?: 'solid' | 'outline' | 'ghost' | 'link'
  /** Inline styles. */
  style?: CSSStyle
  /** Any extra button attributes. */
  [key: string]: unknown
}

/** Props for {@link ConfirmDialog}. */
export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel). */
  onClose: () => void
  /** Title. */
  title?: Snippet | string
  /** Body / warning text. */
  description?: Snippet | string
  /** Confirm-button label (e.g. "Delete"). */
  confirmLabel?: Snippet | string
  /** Cancel-button label. */
  cancelLabel?: Snippet | string
  /** Called when the user confirms. */
  onConfirm: () => void | Promise<void>
  /** Is the confirm action destructive? Defaults to true. */
  destructive?: boolean
  /** Extra body content between description and footer. */
  children?: Snippet
  /** Disables both buttons while the confirm action is pending. */
  loading?: boolean
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link Container}. */
export interface ContainerProps {
  /** Content. */
  children?: Snippet
  /** Max width preset. */
  maxWidth?: string
  /** Whether the container centers. */
  centered?: boolean
  /** Legacy horizontal padding prop (ignored). */
  paddingX?: string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Any extra attributes forwarded to the div. */
  [key: string]: unknown
}

/** One dropdown menu entry. */
export interface DropdownItem {
  value: string
  label?: Snippet | string
  icon?: Snippet | string
  shortcut?: string
  separator?: boolean
  disabled?: boolean
  [key: string]: unknown
}

/** Props for {@link Dropdown}. */
export interface DropdownProps {
  /** Trigger content; a single element becomes the menu button itself, anything else is wrapped in one. */
  trigger?: Snippet | string
  /** Menu entries. */
  items: DropdownItem[]
  /** Called with the chosen item's value. */
  onSelect?: (value: string) => void
  /** Preferred menu placement relative to the trigger. */
  placement?:
    'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right'
  /** Controlled open state. */
  open?: boolean
  /** Called with every open-state change (including the mount announcement). */
  onOpenChange?: (open: boolean) => void
  /** Alignment within the placement axis. */
  align?: 'start' | 'center' | 'end'
  /** Menu width in pixels, `'trigger'` to match the trigger, or `'auto'`. */
  width?: number | 'trigger' | 'auto'
  /** Extra class names on the menu. */
  className?: string
  /** Inline styles on the menu. */
  style?: CSSStyle
  /** data-testid on the trigger (the menu gets `<testId>-menu`). */
  testId?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link DropdownLabel}. */
export interface DropdownLabelProps {
  /** Label content. */
  children?: Snippet | string
  /** Extra class names. */
  className?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link DropdownSeparator}. */
export interface DropdownSeparatorProps {
  /** Extra class names. */
  className?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link EmptyState}. */
export interface EmptyStateProps {
  /** Leading icon. */
  icon?: Snippet
  /** Title. */
  title?: string
  /** Description. */
  description?: string
  /** Action area. */
  action?: Snippet
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** data-mol-id. */
  automationId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link Flex}. */
export interface FlexProps {
  /** Content. */
  children?: Snippet
  /** Flex direction. */
  direction?: string
  /** Main-axis alignment. */
  justify?: string
  /** Cross-axis alignment. */
  align?: string
  /** Wrapping. */
  wrap?: string
  /** Gap token or raw value. */
  gap?: number | string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Click handler. */
  onClick?: (event: MouseEvent) => void
  /** Any extra attributes forwarded to the div. */
  [key: string]: unknown
}

/** Props for {@link FloatingInput}. */
export interface FloatingInputProps {
  /** Placeholder; also rendered as the floating label. */
  placeholder?: string
  /** Extra class names. */
  className?: string
  /** Controlled value. */
  value?: string
  /** Change handler (fires on input events, like React onChange). */
  onChange?: (event: Event) => void
  /** Initial value for uncontrolled usage. */
  defaultValue?: string
  /** Explicit id. */
  id?: string
  /** Any extra attributes forwarded to the input. */
  [key: string]: unknown
}

/** Props for {@link Form}. */
export interface FormProps {
  /** Form content. */
  children?: Snippet
  /** Async submit handler receiving the collected form data. */
  onFormSubmit?: (data: Record<string, unknown>) => void | Promise<void>
  /** Disables the fieldset while true. */
  submitting?: boolean
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Native submit handler. */
  onSubmit?: (event: Event) => void | Promise<void>
  /** Native form action. */
  action?: string
  /** Native form method. */
  method?: 'get' | 'post'
  /** Native novalidate flag. */
  noValidate?: boolean
  /** Any extra attributes forwarded to the form. */
  [key: string]: unknown
}

/** Props for {@link FormField}. */
export interface FormFieldProps {
  /** The field control. */
  children?: Snippet
  /** Visible label. */
  label?: string
  /** Field name driving ids. */
  name?: string
  /** Error message. */
  error?: string
  /** Hint message. */
  hint?: string
  /** Whether the label shows the required marker. */
  required?: boolean
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link Grid}. */
export interface GridProps {
  /** Content. */
  children?: Snippet
  /** Column count or a raw grid-template-columns value. */
  columns?: number | string
  /** Raw grid-template-rows value. */
  rows?: string
  /** Gap token or raw value. */
  gap?: number | string
  /** Column gap. */
  columnGap?: number | string
  /** Row gap. */
  rowGap?: number | string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Any extra attributes forwarded to the div. */
  [key: string]: unknown
}

/** Props for {@link Icon}. */
export interface IconProps {
  /** Icon name from the bonded icon set. */
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 20. */
  size?: number
  /** Class name forwarded to the root svg. */
  className?: string
  /** Any extra HTML/SVG attributes forwarded to the root svg. */
  [key: string]: unknown
}

/** Props for {@link IconGlyph}. */
export interface IconGlyphProps {
  /** Icon name from the bonded icon set. */
  name: IconName
  /** Class name forwarded to the root svg. */
  className?: string
}

/** Props for {@link Input}. */
export interface InputProps {
  /** Input type. */
  type?: string
  /** Control size. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Text alignment. */
  align?: 'left' | 'center'
  /** Visible label. */
  label?: string
  /** Error message. */
  error?: string
  /** Hint message. */
  hint?: string
  /** Element before the input. */
  leftElement?: Snippet
  /** Element after the input. */
  rightElement?: Snippet
  /** Whether a clear button renders when a value exists. */
  clearable?: boolean
  /** Called when the clear button is clicked. */
  onClear?: () => void
  /** Accessible label of the clear button. */
  clearLabel?: string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Disables the input. */
  disabled?: boolean
  /** Marks the input required. */
  required?: boolean
  /** Controlled value. */
  value?: string
  /** Initial value for uncontrolled usage. */
  defaultValue?: string
  /** Placeholder. */
  placeholder?: string
  /** Form field name. */
  name?: string
  /** Explicit id. */
  id?: string
  /** Change handler (fires on input events, like React onChange). */
  onChange?: (event: Event) => void
  /** Focus handler. */
  onFocus?: (event: FocusEvent) => void
  /** Blur handler. */
  onBlur?: (event: FocusEvent) => void
  /** Focuses the input once on mount. */
  autoFocus?: boolean
  /** Any extra attributes forwarded to the input. */
  [key: string]: unknown
}

/** Props for {@link Label}. */
export interface LabelProps {
  /** Label content. */
  children?: Snippet
  /** Whether the required marker renders. */
  required?: boolean
  /** Extra class names. */
  className?: string
  /** Any extra attributes forwarded to the label. */
  [key: string]: unknown
}

/** Props for {@link LanguagePicker}. */
export interface LanguagePickerProps {
  /** i18n key for the trigger button label / aria-label. */
  labelKey?: string
  /** Fallback label if the i18n key is missing. */
  labelDefault?: string
  /** i18n key for the modal title. */
  modalTitleKey?: string
  /** Fallback modal title if the i18n key is missing. */
  modalTitleDefault?: string
  /** Icon glyph to render before the current locale name. */
  icon?: IconName
  /** Pixel size for the rendered icon. */
  iconSize?: number
  /** What to render inside the trigger button. */
  display?: 'name' | 'code' | 'icon'
  /** Optional className appended to the trigger button. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** Optional render override: receives `{ open }` and replaces the default trigger. */
  renderTrigger?: Snippet<[() => void]>
  /** Any extra button attributes forwarded to the trigger. */
  [key: string]: unknown
}

/** Props for {@link LoadErrorBanner}. */
export interface LoadErrorBannerProps {
  /** The primary error line. */
  message?: Snippet | string
  /** Secondary line under the message (status code, hint). */
  detail?: Snippet | string
  /** Called when Retry is clicked; while pending the button is disabled. */
  onRetry?: () => void | Promise<void>
  /** Retry-button label. */
  retryLabel?: Snippet | string
  /** data-mol-id for the retry button. */
  retryMolId?: string
  /** Extra content between message and retry row. */
  children?: Snippet
  /** Extra class names on the root. */
  className?: string
  /** Inline styles on the root. */
  style?: CSSStyle
  /** Any extra props forwarded to the root div. */
  [key: string]: unknown
}

/** Props for {@link Modal}. */
export interface ModalProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, overlay, close button). */
  onClose: () => void
  /** Title; also names the dialog via aria-labelledby. */
  title?: Snippet | string
  /** Dialog body. */
  children?: Snippet
  /** Dialog size. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Whether the fixed close button is rendered. */
  showCloseButton?: boolean
  /** Whether an overlay click closes the dialog. */
  closeOnOverlayClick?: boolean
  /** Whether Escape closes the dialog. */
  closeOnEscape?: boolean
  /** Footer content. */
  footer?: Snippet | string
  /** Whether the dialog is vertically centered. */
  centered?: boolean
  /** aria-label for the close button. */
  closeLabel?: string
  /** Whether opening locks body scroll. */
  preventScroll?: boolean
  /** Extra class names on the dialog panel. */
  className?: string
  /** Inline styles on the dialog panel. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** data-* and aria-* attributes forwarded to the dialog panel. */
  [key: string]: unknown
}

/** Props for {@link OptimisticToggleButton}; labels come from the app's translations. */
export interface OptimisticToggleButtonProps {
  /** The loaded server value. Mount the button only after its initial record exists. */
  value: boolean
  /** Saves the desired boolean and returns the server-confirmed boolean; reject on failure. */
  commit: (desired: boolean) => Promise<boolean>
  /** Label when the displayed value is true. */
  activeLabel?: Snippet | string
  /** Label when the displayed value is false. */
  inactiveLabel?: Snippet | string
  /** Receives a failed save after the controller has restored the last confirmed value. */
  onError?: (error: unknown) => void
  /** Any other ButtonProps passthrough. */
  [key: string]: unknown
}

/** Props for {@link PageHeader}. */
export interface PageHeaderProps {
  /** Page title. */
  title?: string
  /** Description under the title. */
  description?: string
  /** Action buttons area. */
  actions?: Snippet
  /** Breadcrumb trail. */
  breadcrumbs?: { label: string; href?: string }[]
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** data-mol-id. */
  automationId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link PageShell}. */
export interface PageShellProps {
  /** Main content. */
  children?: Snippet
  /** Sidebar content. */
  sidebar?: Snippet
  /** Top bar content. */
  topbar?: Snippet
  /** Whether the sidebar is collapsed. */
  sidebarCollapsed?: boolean
  /** Sidebar collapse toggle handler. */
  onSidebarToggle?: () => void
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** data-mol-id. */
  automationId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Optional label overrides; goToPage receives the page number. */
export interface PaginationLabels {
  /** The nav's aria-label. */
  nav?: string
  /** First-page button label. */
  first?: string
  /** Previous-page button label. */
  previous?: string
  /** Next-page button label. */
  next?: string
  /** Last-page button label. */
  last?: string
  /** Page button label builder. */
  goToPage?: (page: number) => string
  /** Any extra fields. */
  [key: string]: unknown
}

/** Props for {@link Pagination}. */
export interface PaginationProps {
  /** The currently active page number. */
  page: number
  /** The total number of pages. */
  totalPages: number
  /** Called with the newly selected page. */
  onChange: (page: number) => void
  /** Sibling pages shown around the current page. */
  siblings?: number
  /** Boundary pages always shown at start and end. */
  boundaries?: number
  /** Control size. */
  size?: 'sm' | 'md' | 'lg'
  /** Whether first/last buttons render. */
  showFirstLast?: boolean
  /** Whether previous/next buttons render. */
  showPrevNext?: boolean
  /** Label overrides. */
  labels?: PaginationLabels
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Disables every control. */
  disabled?: boolean
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link PanelCloseProvider}. */
export interface PanelCloseProviderProps {
  /** Callback that dismisses the enclosing drawer/modal. */
  close: () => void
  /** Panel content that may call `usePanelClose`. */
  children?: Snippet
}

/** Props for {@link Progress}. */
export interface ProgressProps {
  /** Progress value. */
  value: number
  /** Maximum value. */
  max?: number
  /** Progress size. */
  size?: 'sm' | 'md' | 'lg'
  /** Progress color. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  /** Whether to show the percentage label. */
  showValue?: boolean
  /** Accessible and visible label. */
  label?: string
  /** Whether the progress is indeterminate. */
  indeterminate?: boolean
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link PromptDialog}. */
export interface PromptDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel, or a fulfilled submit). */
  onClose: () => void
  /** Dialog heading. */
  title?: Snippet | string
  /** Explanatory line under the title. */
  description?: Snippet | string
  /** Input placeholder. */
  placeholder?: string
  /** Value the input starts from every time the dialog opens. */
  initialValue?: string
  /** Called with the entered value on confirm; resolve to close. */
  onSubmit: (value: string) => void | Promise<void>
  /** Confirm-button label. */
  confirmLabel?: Snippet | string
  /** Cancel-button label. */
  cancelLabel?: Snippet | string
  /** Render the confirm button in the error color. */
  destructive?: boolean
  /** data-mol-id for the text input. */
  inputMolId?: string
  /** data-mol-id for the confirm button. */
  confirmMolId?: string
  /** data-mol-id for the cancel button. */
  cancelMolId?: string
  /** Extra body content under the input. */
  children?: Snippet
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link RadioGroup}. */
export interface RadioGroupProps {
  /** Radio options. */
  options: { value: string; label?: unknown; disabled?: boolean }[]
  /** Controlled selected value. */
  value?: string
  /** Selection handler. */
  onChange?: (value: string) => void
  /** Legacy size prop (ignored). */
  size?: string
  /** Group label. */
  label?: string
  /** Submitted field name; generated when omitted. */
  name?: string
  /** Layout direction. */
  direction?: 'vertical' | 'horizontal'
  /** Error message. */
  error?: string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Disables every option. */
  disabled?: boolean
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link ReactNode}. */
export interface ReactNodeProps {
  node?: Snippet | string | number
}

/** Props for {@link ResponsiveAppShell}. */
export interface ResponsiveAppShellProps {
  /**
   * The shell sub-components — `ResponsiveAppShellTopBar`,
   * `ResponsiveAppShellSidebar`, `ResponsiveAppShellDrawer` and
   * `ResponsiveAppShellContent`.
   */
  children?: Snippet
  /**
   * Sidebar (and drawer) width: `'sm'` (208px), `'md'` (240px, default),
   * `'lg'` (256px) or an exact pixel number.
   */
  sidebarWidth?: ShellSidebarWidth
  /** Extra classes on the root flex-row container. */
  className?: string
  /** `data-mol-id` for the root container. Defaults to `'shell-root'`. */
  dataMolId?: string
}

/** Props for {@link ResponsiveAppShellContent}. */
export interface ResponsiveAppShellContentProps {
  /** The routed page content — typically the current route's outlet. */
  children?: Snippet
  /** Extra classes on the `<main>`. */
  className?: string
  /** Inline styles on the `<main>` (rarely needed — layout is owned). */
  style?: CSSStyle
  /** `data-mol-id` override. Default: `'shell-content'`. */
  dataMolId?: string
  /** `data-testid` override. */
  testId?: string
}

/** Props for {@link ResponsiveAppShellDrawer}. */
export interface ResponsiveAppShellDrawerProps {
  /**
   * Nav content — the links, same as (or adapted from) the Sidebar's. Only
   * mounted while the drawer is open on a below-breakpoint viewport.
   */
  children?: Snippet
  /**
   * Header row content (typically the brand), rendered next to the close
   * button.
   */
  header?: Snippet | string
  /**
   * Accessible name for the dialog and its `<nav>` landmark. Defaults to the
   * `appShell.primaryNav` translation (English fallback `"Primary
   * navigation"`).
   */
  navLabel?: string
  /** Below-nav content (user card, sign-out), after the `<nav>`. */
  footer?: Snippet | string
  /** Whether the panel shows a close (X) button. Default: `true`. */
  showCloseButton?: boolean
  /** Extra classes on the dialog panel. */
  className?: string
  /** `data-mol-id` override for the panel. Default: `'shell-drawer'`. */
  dataMolId?: string
  /** `data-mol-id` override for the close button. Default: `'shell-drawer-close'`. */
  closeDataMolId?: string
  /** `data-testid` override for the panel. */
  testId?: string
}

/** Props for {@link ResponsiveAppShellSidebar}. */
export interface ResponsiveAppShellSidebarProps {
  /**
   * Nav content — the links (they land inside the sidebar's `<nav>`
   * landmark; pass `aria-current="page"` from the active one yourself).
   */
  children?: Snippet
  /**
   * Accessible name for the sidebar's `<nav>` landmark. Defaults to the
   * `appShell.primaryNav` translation (English fallback `"Primary
   * navigation"`).
   */
  navLabel?: string
  /**
   * Below-nav content (user card, quick action) — rendered after the `<nav>`
   * in a bordered footer row, so it does not sit inside the nav landmark.
   */
  footer?: Snippet | string
  /** Extra classes on the `<aside>`. */
  className?: string
  /** `data-mol-id` override. Default: `'shell-sidebar'`. */
  dataMolId?: string
  /** `data-testid` override. */
  testId?: string
}

/** Props for {@link ResponsiveAppShellTopBar}. */
export interface ResponsiveAppShellTopBarProps {
  /**
   * Brand/title node, rendered after the menu trigger — typically a link with
   * the app name or logo.
   */
  brand?: Snippet | string
  /** Trailing actions — user menu, theme toggle, search, etc. */
  actions?: Snippet | string
  /**
   * Render the top bar only below the breakpoint (mount-conditioned, not
   * CSS-hidden — no dead DOM on desktop). Default: `false`.
   */
  mobileOnly?: boolean
  /** Extra classes on the `<header>`. */
  className?: string
  /** `data-mol-id` override. Default: `'shell-topbar'`. */
  dataMolId?: string
  /** `data-testid` override. */
  testId?: string
}

/** Props for {@link Select}. */
export interface SelectProps {
  /** Select options, optionally grouped. */
  options: { value: string; label?: unknown; disabled?: boolean; group?: string }[]
  /** Controlled selected value. */
  value?: string
  /** Receives the selected value on change. */
  onValueChange?: (value: string) => void
  /** Control size. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Visible label. */
  label?: string
  /** Placeholder option. */
  placeholder?: string
  /** Error message. */
  error?: string
  /** Hint message. */
  hint?: string
  /** Whether a clear ("--") option renders. */
  clearable?: boolean
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Disables the select. */
  disabled?: boolean
  /** Marks the select required. */
  required?: boolean
  /** Form field name. */
  name?: string
  /** Explicit id. */
  id?: string
  /** Change handler (native change event). */
  onChange?: (event: Event) => void
  /** Any extra attributes forwarded to the select. */
  [key: string]: unknown
}

/** Props for {@link Separator}. */
export interface SeparatorProps {
  /** Orientation of the separator. */
  orientation?: 'horizontal' | 'vertical'
  /** Decorative separators are purely visual. */
  decorative?: boolean
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link SidebarUserCard}. */
export interface SidebarUserCardProps {
  /** Panel content shown inside the drawer; dismisses via usePanelClose(). */
  children?: Snippet
  /** Display name override. */
  name?: string
  /** Secondary line under the name. */
  secondaryLine?: string
  /** Avatar image URL override. */
  avatarUrl?: string
  /** i18n key for the trigger button's aria-label. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. */
  ariaLabelDefault?: string
  /** data-mol-id for the trigger button. */
  dataMolId?: string
  /** Extra className composed onto the trigger button. */
  className?: string
  /** Inline styles on the trigger button. */
  style?: CSSStyle
  /** Any extra button attributes forwarded to the trigger. */
  [key: string]: unknown
}

/** Props for {@link Skeleton}. */
export interface SkeletonProps {
  /** Width in pixels or a raw CSS value. */
  width?: number | string
  /** Height in pixels or a raw CSS value. */
  height?: number | string
  /** Whether the skeleton is a circle. */
  circle?: boolean
  /** Border radius override. */
  borderRadius?: number | string
  /** Animation style. */
  animation?: 'pulse' | 'wave' | 'none'
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** Any extra attributes. */
  [key: string]: unknown
}

/** Props for {@link SkeletonCircle}. */
export interface SkeletonCircleProps {
  /** Pixel size. */
  size?: number
  /** Extra class names. */
  className?: string
}

/** Props for {@link SkeletonText}. */
export interface SkeletonTextProps {
  /** Number of lines. */
  lines?: number
  /** Extra class names. */
  className?: string
}

/** Props for {@link Spacer}. */
export interface SpacerProps {
  /** Named size or raw value. */
  size?: number | string
  /** Whether the spacer is inline. */
  horizontal?: boolean
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Any extra attributes forwarded to the div. */
  [key: string]: unknown
}

/** Props for {@link Spinner}. */
export interface SpinnerProps {
  /** Spinner size. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Named color variant or a raw CSS color. */
  color?: string
  /** Accessible label; also rendered visually for screen readers. */
  label?: string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: Record<string, string | number | undefined>
  /** data-testid. */
  testId?: string
  /** Any extra data-* or aria-* attributes forwarded to the div. */
  [key: string]: unknown
}

/** Props for {@link Switch}. */
export interface SwitchProps {
  /** Label content. */
  label?: string | Snippet
  /** Controlled checked state. */
  checked?: boolean
  /** Control size. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Track color. */
  color?: ColorVariant
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Disables the switch. */
  disabled?: boolean
  /** Receives the native change event from the hidden checkbox. */
  onChange?: (event: Event) => void
  /** Click handler; can veto the toggle with preventDefault(). */
  onClick?: (event: MouseEvent) => void
  /** Any extra attributes forwarded to the button. */
  [key: string]: unknown
}

/** One table column. */
export interface TableColumnSpec {
  /** Row field this column reads. */
  key?: string
  /** Header cell content. */
  header?: Snippet | string
  /** Cell renderer: a snippet or a plain function, called with (value, row, index). */
  render?:
    | Snippet<[unknown, Record<string, unknown>, number]>
    | ((value: unknown, row: Record<string, unknown>, index: number) => unknown)
  /** Cell text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Whether the header sorts. */
  sortable?: boolean
  /** Header cell width. */
  width?: string | number
  /** Any extra fields. */
  [key: string]: unknown
}

/** Props for {@link Table}. */
export interface TableProps {
  /** The rows. */
  data: Record<string, unknown>[]
  /** The columns. */
  columns: TableColumnSpec[]
  /** Row key field name or extractor. */
  rowKey?: string | ((row: Record<string, unknown>) => string | number)
  /** Adds table borders. */
  bordered?: boolean
  /** Stripes alternate rows. */
  striped?: boolean
  /** Highlights rows on hover. */
  hoverable?: boolean
  /** Content for the empty state cell. */
  emptyContent?: Snippet | string
  /** Shows the loading overlay. */
  loading?: boolean
  /** Current sort. */
  sort?: { key?: string; direction?: 'asc' | 'desc' }
  /** Called with the new sort. */
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  /** Called when a row is clicked. */
  onRowClick?: (row: Record<string, unknown>, index: number) => void
  /** Extra class names on the table element. */
  className?: string
  /** Inline styles on the table element. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** One tab entry. */
export interface TabItem {
  /** Tab value. */
  value: string
  /** Trigger label. */
  label?: Snippet | string
  /** Panel content. */
  content?: Snippet | string
  /** Disables the trigger. */
  disabled?: boolean
  /** Trigger icon. */
  icon?: Snippet
  /** Any extra fields. */
  [key: string]: unknown
}

/** Props for {@link Tabs}. */
export interface TabsProps {
  /** The tab entries. */
  items: TabItem[]
  /** Controlled active value. */
  value?: string
  /** Initially active value. */
  defaultValue?: string
  /** Called with the newly active value. */
  onChange?: (value: string) => void
  /** Visual variant. */
  variant?: 'line' | 'enclosed'
  /** Control size. */
  size?: 'sm' | 'md' | 'lg'
  /** Stretches triggers to fill the list. */
  fitted?: boolean
  /** Extra class names on the root. */
  className?: string
  /** Inline styles on the root. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link Textarea}. */
export interface TextareaProps {
  /** Control size. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Visible label. */
  label?: string
  /** Error message. */
  error?: string
  /** Hint message. */
  hint?: string
  /** Grows the box to its content. */
  autoResize?: boolean
  /** Minimum rows (also the default height basis). */
  minRows?: number
  /** Maximum rows before scrolling. */
  maxRows?: number
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Disables the textarea. */
  disabled?: boolean
  /** Marks the textarea required. */
  required?: boolean
  /** Controlled value. */
  value?: string
  /** Initial value for uncontrolled usage. */
  defaultValue?: string
  /** Placeholder. */
  placeholder?: string
  /** Form field name. */
  name?: string
  /** Explicit id. */
  id?: string
  /** Explicit rows. */
  rows?: number
  /** Change handler (fires on input events, like React onChange). */
  onChange?: (event: Event) => void
  /** Focus handler. */
  onFocus?: (event: FocusEvent) => void
  /** Blur handler. */
  onBlur?: (event: FocusEvent) => void
  /** Any extra attributes forwarded to the textarea. */
  [key: string]: unknown
}

/** Props for {@link ThemeToggle}. */
export interface ThemeToggleProps {
  /** i18n key for the aria-label. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. */
  ariaLabelDefault?: string
  /** Icon name to render in dark mode. */
  darkIcon?: IconName
  /** Icon name to render in light mode. */
  lightIcon?: IconName
  /** Pixel size for the rendered icon. */
  iconSize?: number
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** Any extra button attributes forwarded to the button. */
  [key: string]: unknown
}

/** Props for {@link Toast}. */
export interface ToastProps {
  /** Toast body (used when no description is given). */
  children?: Snippet
  /** Title line. */
  title?: Snippet | string
  /** Description line. */
  description?: Snippet | string
  /** Status color. */
  status?: ColorVariant
  /** Auto-dismiss delay in ms. */
  duration?: number
  /** Whether the dismiss button renders. */
  dismissible?: boolean
  /** Called when the toast dismisses (button or timer). */
  onDismiss?: () => void
  /** Intended position within a container. */
  position?: ToastPosition
  /** aria-label for the close button. */
  closeLabel?: string
  /** Extra class names. */
  className?: string
  /** Inline styles. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link ToastContainer}. */
export interface ToastContainerProps {
  /** The toasts to position. */
  children?: Snippet
  /** Where on screen the container sits. */
  position?: ToastPosition
  /** Extra class names. */
  className?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link ToastProvider}. */
export interface ToastProviderProps {
  /** Content that may call useToast(). */
  children?: Snippet
  /** The default position for toasts. */
  position?: ToastPosition
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link Tooltip}. */
export interface TooltipProps {
  /** Tooltip text. */
  content?: Snippet | string
  /** The single element the tooltip describes. */
  children?: Snippet
  /** Preferred placement. */
  placement?: TooltipPlacement
  /** Show delay in ms. */
  delay?: number
  /** Whether the themed arrow renders. */
  hasArrow?: boolean
  /** Extra class names on the tooltip box. */
  className?: string
  /** Inline styles on the tooltip box. */
  style?: CSSStyle
  /** data-testid. */
  testId?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link UserMenu}. */
export interface UserMenuProps {
  /** Panel content shown inside the drawer; dismisses via usePanelClose(). */
  children?: Snippet
  /** i18n key for the trigger button's aria-label. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. */
  ariaLabelDefault?: string
  /** Icon name for the trigger button. */
  triggerIcon?: IconName
  /** Pixel size for the trigger icon. */
  triggerIconSize?: number
  /** data-mol-id for the trigger button. */
  dataMolId?: string
  /** Extra className composed onto the trigger button. */
  className?: string
  /** Whether the trigger button is disabled. */
  disabled?: boolean
  /** Override for the trigger click handler. */
  onClick?: () => void
  /** Which side of the viewport the panel opens from. */
  side?: 'left' | 'right'
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link UserMenuPopover}. */
export interface UserMenuPopoverProps {
  /** The trigger and panel (UserMenuPopoverTrigger, UserMenuPopoverPanel). */
  children?: Snippet
  /** Label shown when there is no authenticated user. */
  guestName?: string
  /** Extra className composed onto the relative-positioned container. */
  className?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link UserMenuPopoverPanel}. */
export interface UserMenuPopoverPanelProps {
  /** Panel body: nav items and a UserMenuPopoverSignOut. */
  children?: Snippet
  /** Extra className composed onto the absolute-positioned panel. */
  className?: string
  /** i18n key for the panel nav's aria-label. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. */
  ariaLabelDefault?: string
  /** data-mol-id for the panel. */
  dataMolId?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link UserMenuPopoverSignOut}. */
export interface UserMenuPopoverSignOutProps {
  /** i18n key for the button label. */
  labelKey?: string
  /** Fallback label if the i18n key is missing. */
  labelDefault?: string
  /** data-mol-id for the button. */
  dataMolId?: string
  /** Extra className composed onto the button. */
  className?: string
  /** Any extra props. */
  [key: string]: unknown
}

/** Props for {@link UserMenuPopoverTrigger}. */
export interface UserMenuPopoverTriggerProps {
  /** i18n key for the trigger's aria-label. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. */
  ariaLabelDefault?: string
  /** data-mol-id for the trigger button. */
  dataMolId?: string
  /** Extra className composed onto the trigger button. */
  className?: string
  /** Any extra props. */
  [key: string]: unknown
}

export type { ShellSidebarWidth } from './shell-context.js'
