# @molecule/app-ui

UI component interfaces for molecule.dev.

Provides standardized prop interfaces for common UI components
that can be implemented by different UI libraries (styled-components,
Tailwind, Ionic, etc.).

## Type
`core`

## Installation
```bash
npm install @molecule/app-ui
```

## API

### Interfaces

#### `AccordionClassOptions`

Options for resolving accordion CSS classes via UIClassMap.

```typescript
interface AccordionClassOptions {
  variant?: string
}
```

#### `AccordionItem`

A single item in an Accordion component.

```typescript
interface AccordionItem<T = string> {
  /**
   * Item value/id.
   */
  value: T

  /**
   * Item header/trigger.
   */
  header: Children

  /**
   * Item content.
   */
  content: Children

  /**
   * Whether the item is disabled.
   */
  disabled?: boolean
}
```

#### `AccordionProps`

Props for the Accordion component.

```typescript
interface AccordionProps<T = string> extends BaseProps {
  /**
   * Accordion items.
   */
  items: AccordionItem<T>[]

  /**
   * Expanded item(s).
   */
  value?: T | T[]

  /**
   * Default expanded item(s).
   */
  defaultValue?: T | T[]

  /**
   * Change handler.
   */
  onChange?: (value: T | T[]) => void

  /**
   * Whether multiple items can be expanded.
   */
  multiple?: boolean

  /**
   * Whether items can be collapsed.
   */
  collapsible?: boolean
}
```

#### `AlertClassOptions`

Options for resolving alert CSS classes via UIClassMap.

```typescript
interface AlertClassOptions {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error'
}
```

#### `AlertProps`

Props for the Alert component.

```typescript
interface AlertProps extends HTMLElementProps {
  /**
   * Alert content.
   */
  children?: Children

  /**
   * Alert title.
   */
  title?: string

  /**
   * Alert status/type.
   */
  status?: ColorVariant

  /**
   * Alert variant.
   */
  variant?: 'solid' | 'subtle' | 'outline' | 'left-accent'

  /**
   * Whether the alert is dismissible.
   */
  dismissible?: boolean

  /**
   * Called when dismissed.
   */
  onDismiss?: () => void

  /**
   * Icon to display.
   */
  icon?: Children

  /**
   * Accessible label for the dismiss button.
   * @default 'Dismiss'
   */
  dismissLabel?: string
}
```

#### `AvatarClassOptions`

Options for resolving avatar CSS classes via UIClassMap.

```typescript
interface AvatarClassOptions {
  size?: Size
}
```

#### `AvatarProps`

Props for the Avatar component.

```typescript
interface AvatarProps extends HTMLElementProps {
  /**
   * Image source URL.
   */
  src?: string

  /**
   * Alt text for the image.
   */
  alt?: string

  /**
   * Name for fallback initials.
   */
  name?: string

  /**
   * Avatar size.
   */
  size?: Size | number

  /**
   * Whether the avatar is rounded.
   */
  rounded?: boolean

  /**
   * Fallback element when no image.
   */
  fallback?: Children
}
```

#### `BadgeClassOptions`

Options for resolving badge CSS classes via UIClassMap.

```typescript
interface BadgeClassOptions {
  variant?: ColorVariant
  size?: Size
}
```

#### `BadgeProps`

Props for the Badge component (status labels, counts, tags).

```typescript
interface BadgeProps extends HTMLElementProps {
  /**
   * Badge content.
   */
  children?: Children

  /**
   * Badge color.
   */
  color?: ColorVariant

  /**
   * Badge variant.
   */
  variant?: 'solid' | 'outline' | 'subtle'

  /**
   * Badge size.
   */
  size?: Size

  /**
   * Whether the badge is rounded.
   */
  rounded?: boolean
}
```

#### `BaseProps`

Base props shared by all components.

```typescript
interface BaseProps {
  /**
   * Additional CSS class name(s).
   */
  className?: string

  /**
   * Inline styles.
   */
  style?: CSSProperties

  /**
   * Test ID for automated testing.
   */
  testId?: string

  /**
   * Whether the component is disabled.
   */
  disabled?: boolean
}
```

#### `ButtonClassOptions`

Options for resolving button CSS classes via UIClassMap.

```typescript
interface ButtonClassOptions {
  variant?: ButtonVariant
  color?: ColorVariant
  size?: ButtonSize
  fullWidth?: boolean
}
```

#### `ButtonElementProps`

Base props for button elements.

```typescript
interface ButtonElementProps extends HTMLElementProps {
  type?: 'button' | 'submit' | 'reset'
  name?: string
  value?: string
  form?: string
}
```

#### `ButtonProps`

Props for the Button component.

```typescript
interface ButtonProps extends ButtonElementProps {
  /**
   * Button content.
   */
  children?: Children

  /**
   * Visual variant.
   */
  variant?: ButtonVariant

  /**
   * Color scheme.
   */
  color?: ColorVariant

  /**
   * Button size.
   */
  size?: ButtonSize

  /**
   * Whether the button is in a loading state.
   */
  loading?: boolean

  /**
   * Loading text to display.
   */
  loadingText?: string

  /**
   * Whether the button takes full width.
   */
  fullWidth?: boolean

  /**
   * Icon to display before the label.
   */
  leftIcon?: Children

  /**
   * Icon to display after the label.
   */
  rightIcon?: Children
}
```

#### `CardClassOptions`

Options for resolving card CSS classes via UIClassMap.

```typescript
interface CardClassOptions {
  variant?: 'default' | 'elevated' | 'outline' | 'ghost'
}
```

#### `CardProps`

Props for the Card container component (elevated, outlined, or filled surface).

```typescript
interface CardProps extends HTMLElementProps {
  /**
   * Card content.
   */
  children?: Children

  /**
   * Card variant.
   */
  variant?: 'elevated' | 'outlined' | 'filled'

  /**
   * Whether the card is interactive (clickable).
   */
  interactive?: boolean

  /**
   * Padding size.
   */
  padding?: Size | 'none'
}
```

#### `CheckboxClassOptions`

Options for resolving checkbox CSS classes via UIClassMap.

```typescript
interface CheckboxClassOptions {
  error?: boolean
}
```

#### `CheckboxProps`

Props for the Checkbox component.

```typescript
interface CheckboxProps extends InputElementProps {
  /**
   * Checkbox label.
   */
  label?: Children

  /**
   * Whether the checkbox is checked.
   */
  checked?: boolean

  /**
   * Whether the checkbox is in an indeterminate state.
   */
  indeterminate?: boolean

  /**
   * Checkbox size.
   */
  size?: Size

  /**
   * Error message.
   */
  error?: string
}
```

#### `ContainerClassOptions`

Options for container class resolution.

```typescript
interface ContainerClassOptions {
  size?: Size | '2xl' | 'full'
}
```

#### `ContainerProps`

Props for the Container layout component.

```typescript
interface ContainerProps extends HTMLElementProps {
  /**
   * Container content.
   */
  children?: Children

  /**
   * Maximum width.
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string

  /**
   * Whether to center the container.
   */
  centered?: boolean

  /**
   * Horizontal padding.
   */
  paddingX?: Size | string
}
```

#### `CSSProperties`

Framework-agnostic CSS properties.
Mirrors React.CSSProperties but without React dependency.

```typescript
interface CSSProperties {
  [key: string]: string | number | undefined
}
```

#### `DropdownItem`

Dropdown menu item.

```typescript
interface DropdownItem<T = string> {
  /**
   * Item value/id.
   */
  value: T

  /**
   * Display label.
   */
  label: Children

  /**
   * Whether the item is disabled.
   */
  disabled?: boolean

  /**
   * Icon to display.
   */
  icon?: Children

  /**
   * Keyboard shortcut display.
   */
  shortcut?: string

  /**
   * Whether this is a separator.
   */
  separator?: boolean

  /**
   * Nested items (for submenus).
   */
  items?: DropdownItem<T>[]
}
```

#### `DropdownProps`

Props for the Dropdown menu component.

```typescript
interface DropdownProps<T = string> extends BaseProps {
  /**
   * Dropdown trigger element.
   */
  trigger: Children

  /**
   * Dropdown items.
   */
  items: DropdownItem<T>[]

  /**
   * Called when an item is selected.
   */
  onSelect?: (value: T) => void

  /**
   * Dropdown placement.
   */
  placement?:
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'left'
    | 'right'

  /**
   * Whether the dropdown is open (controlled).
   */
  open?: boolean

  /**
   * Called when open state changes.
   */
  onOpenChange?: (open: boolean) => void

  /**
   * Menu alignment.
   */
  align?: 'start' | 'center' | 'end'

  /**
   * Menu width.
   */
  width?: 'trigger' | 'auto' | number | string
}
```

#### `FlexClassOptions`

Options for flex class resolution.

```typescript
interface FlexClassOptions {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}
```

#### `FlexProps`

Flex container props.

```typescript
interface FlexProps extends HTMLElementProps {
  /**
   * Flex content.
   */
  children?: Children

  /**
   * Flex direction.
   */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'

  /**
   * Justify content.
   */
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'

  /**
   * Align items.
   */
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'

  /**
   * Flex wrap.
   */
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse'

  /**
   * Gap between items.
   */
  gap?: Size | string | number
}
```

#### `FormElementProps`

Base props for form elements.

```typescript
interface FormElementProps extends HTMLElementProps {
  action?: string
  method?: 'get' | 'post'
  encType?: string
  target?: string
  noValidate?: boolean
  autoComplete?: 'on' | 'off'
  onSubmit?: FormEventHandler
  onReset?: FormEventHandler
}
```

#### `FormFieldProps`

Form field wrapper props.

```typescript
interface FormFieldProps extends HTMLElementProps {
  /**
   * Field content.
   */
  children?: Children

  /**
   * Field label.
   */
  label?: string

  /**
   * Field name.
   */
  name?: string

  /**
   * Error message.
   */
  error?: string

  /**
   * Hint/help text.
   */
  hint?: string

  /**
   * Whether the field is required.
   */
  required?: boolean
}
```

#### `FormProps`

Props for the Form component (wraps inputs with submission handling and validation).

```typescript
interface FormProps extends FormElementProps {
  /**
   * Form content.
   */
  children?: Children

  /**
   * Submit handler with form data.
   */
  onFormSubmit?: (data: Record<string, unknown>) => void | Promise<void>

  /**
   * Whether the form is submitting.
   */
  submitting?: boolean
}
```

#### `GridClassOptions`

Options for grid class resolution.

```typescript
interface GridClassOptions {
  cols?: number
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}
```

#### `GridProps`

Grid container props.

```typescript
interface GridProps extends HTMLElementProps {
  /**
   * Grid content.
   */
  children?: Children

  /**
   * Number of columns.
   */
  columns?: number | string

  /**
   * Number of rows.
   */
  rows?: number | string

  /**
   * Gap between items.
   */
  gap?: Size | string | number

  /**
   * Column gap.
   */
  columnGap?: Size | string | number

  /**
   * Row gap.
   */
  rowGap?: Size | string | number
}
```

#### `HTMLElementProps`

Base props for HTML elements.
Framework bindings should extend this with framework-specific attributes.

```typescript
interface HTMLElementProps extends BaseProps {
  id?: string
  title?: string
  tabIndex?: number
  role?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-hidden'?: boolean
  'aria-disabled'?: boolean
  'aria-expanded'?: boolean
  'aria-selected'?: boolean
  'aria-checked'?: boolean | 'mixed'
  'aria-pressed'?: boolean | 'mixed'
  'aria-invalid'?: boolean
  'aria-required'?: boolean
  'aria-readonly'?: boolean
  'aria-busy'?: boolean
  'aria-live'?: 'off' | 'polite' | 'assertive'
  onClick?: MouseEventHandler
  onDoubleClick?: MouseEventHandler
  onMouseEnter?: MouseEventHandler
  onMouseLeave?: MouseEventHandler
  onFocus?: FocusEventHandler
  onBlur?: FocusEventHandler
  onKeyDown?: KeyboardEventHandler
  onKeyUp?: KeyboardEventHandler
  onKeyPress?: KeyboardEventHandler
}
```

#### `InputClassOptions`

Options for resolving input CSS classes via UIClassMap.

```typescript
interface InputClassOptions {
  error?: boolean
  size?: Size
}
```

#### `InputElementProps`

Base props for input elements.

```typescript
interface InputElementProps extends HTMLElementProps {
  name?: string
  value?: string | number | readonly string[]
  defaultValue?: string | number | readonly string[]
  placeholder?: string
  required?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  autoComplete?: string
  maxLength?: number
  minLength?: number
  pattern?: string
  onChange?: ChangeEventHandler
  onInput?: FormEventHandler
}
```

#### `InputProps`

Props for the Input component (text field, email, password, etc.).

```typescript
interface InputProps extends InputElementProps {
  /**
   * Input type.
   */
  type?: InputType

  /**
   * Input size.
   */
  size?: Size

  /**
   * Label text.
   */
  label?: string

  /**
   * Error message.
   */
  error?: string

  /**
   * Hint/help text.
   */
  hint?: string

  /**
   * Element to display on the left.
   */
  leftElement?: Children

  /**
   * Element to display on the right.
   */
  rightElement?: Children

  /**
   * Whether to show a clear button.
   */
  clearable?: boolean

  /**
   * Called when the clear button is clicked.
   */
  onClear?: () => void

  /**
   * Accessible label for the clear button.
   * @default 'Clear'
   */
  clearLabel?: string
}
```

#### `LabelClassOptions`

Options for label class resolution.

```typescript
interface LabelClassOptions {
  required?: boolean
}
```

#### `ModalClassOptions`

Options for resolving modal/dialog CSS classes via UIClassMap.

```typescript
interface ModalClassOptions {
  size?: ModalSize
}
```

#### `ModalProps`

Props for the Modal/Dialog component.

```typescript
interface ModalProps extends HTMLElementProps {
  /**
   * Whether the modal is open.
   */
  open: boolean

  /**
   * Called when the modal should close.
   */
  onClose: () => void

  /**
   * Modal title.
   */
  title?: string

  /**
   * Modal content.
   */
  children?: Children

  /**
   * Modal size.
   */
  size?: ModalSize

  /**
   * Whether to show a close button.
   */
  showCloseButton?: boolean

  /**
   * Whether clicking the overlay closes the modal.
   */
  closeOnOverlayClick?: boolean

  /**
   * Whether pressing Escape closes the modal.
   */
  closeOnEscape?: boolean

  /**
   * Footer content (typically action buttons).
   */
  footer?: Children

  /**
   * Whether the modal is centered vertically.
   */
  centered?: boolean

  /**
   * Whether to prevent body scroll when open.
   */
  preventScroll?: boolean

  /**
   * Accessible label for the close button.
   * @default 'Close'
   */
  closeLabel?: string
}
```

#### `PaginationClassOptions`

Options for pagination item class resolution.

```typescript
interface PaginationClassOptions {
  active?: boolean
  size?: Size
}
```

#### `PaginationProps`

Props for the Pagination component (page navigation with current page, total, page size, and change callbacks).

```typescript
interface PaginationProps extends BaseProps {
  /**
   * Current page (1-indexed).
   */
  page: number

  /**
   * Total number of pages.
   */
  totalPages: number

  /**
   * Page change handler.
   */
  onChange: (page: number) => void

  /**
   * Number of sibling pages to show.
   */
  siblings?: number

  /**
   * Number of boundary pages to show.
   */
  boundaries?: number

  /**
   * Pagination size.
   */
  size?: Size

  /**
   * Whether to show first/last buttons.
   */
  showFirstLast?: boolean

  /**
   * Whether to show previous/next buttons.
   */
  showPrevNext?: boolean

  /**
   * Accessible labels for pagination controls.
   */
  labels?: {
    nav?: string
    first?: string
    previous?: string
    next?: string
    last?: string
    goToPage?: (page: number) => string
  }
}
```

#### `RadioClassOptions`

Options for resolving radio CSS classes via UIClassMap.

```typescript
interface RadioClassOptions {
  error?: boolean
}
```

#### `RadioGroupProps`

Props for the RadioGroup component.

```typescript
interface RadioGroupProps<T = string> extends BaseProps {
  /**
   * Radio options.
   */
  options: RadioOption<T>[]

  /**
   * Current value.
   */
  value?: T

  /**
   * Change handler.
   */
  onChange?: (value: T) => void

  /**
   * Radio size.
   */
  size?: Size

  /**
   * Group label.
   */
  label?: string

  /**
   * Layout direction.
   */
  direction?: 'horizontal' | 'vertical'

  /**
   * Error message.
   */
  error?: string
}
```

#### `RadioOption`

A single option in a RadioGroup.

```typescript
interface RadioOption<T = string> {
  /**
   * Option value.
   */
  value: T

  /**
   * Display label.
   */
  label: Children

  /**
   * Whether the option is disabled.
   */
  disabled?: boolean
}
```

#### `SelectClassOptions`

Options for resolving select CSS classes via UIClassMap.

```typescript
interface SelectClassOptions {
  error?: boolean
  size?: Size
}
```

#### `SelectElementProps`

Base props for select elements.

```typescript
interface SelectElementProps extends HTMLElementProps {
  name?: string
  required?: boolean
  autoFocus?: boolean
  multiple?: boolean
  onChange?: ChangeEventHandler
}
```

#### `SelectOption`

A single option in a Select dropdown.

```typescript
interface SelectOption<T = string> {
  /**
   * Option value.
   */
  value: T

  /**
   * Display label.
   */
  label: string

  /**
   * Whether the option is disabled.
   */
  disabled?: boolean

  /**
   * Option group (for grouped selects).
   */
  group?: string
}
```

#### `SelectProps`

Props for the Select dropdown component (single or multi-select).

```typescript
interface SelectProps<T = string> extends SelectElementProps {
  /**
   * Select options.
   */
  options: SelectOption<T>[]

  /**
   * Current value.
   */
  value?: T

  /**
   * Change handler (with typed value).
   */
  onValueChange?: (value: T) => void

  /**
   * Select size.
   */
  size?: Size

  /**
   * Label text.
   */
  label?: string

  /**
   * Placeholder text.
   */
  placeholder?: string

  /**
   * Error message.
   */
  error?: string

  /**
   * Hint/help text.
   */
  hint?: string

  /**
   * Whether to allow clearing the selection.
   */
  clearable?: boolean
}
```

#### `SeparatorClassOptions`

Options for resolving separator CSS classes via UIClassMap.

```typescript
interface SeparatorClassOptions {
  orientation?: 'horizontal' | 'vertical'
}
```

#### `SeparatorProps`

Props for the Separator/Divider component.

```typescript
interface SeparatorProps extends BaseProps {
  /**
   * Separator orientation.
   */
  orientation?: 'horizontal' | 'vertical'

  /**
   * Whether the separator is decorative only.
   */
  decorative?: boolean
}
```

#### `SkeletonProps`

Props for the Skeleton loading placeholder component.

```typescript
interface SkeletonProps extends BaseProps {
  /**
   * Skeleton width.
   */
  width?: string | number

  /**
   * Skeleton height.
   */
  height?: string | number

  /**
   * Whether the skeleton is circular.
   */
  circle?: boolean

  /**
   * Border radius.
   */
  borderRadius?: string | number

  /**
   * Animation type.
   */
  animation?: 'pulse' | 'wave' | 'none'
}
```

#### `SpacerProps`

Props for the Spacer layout component (adds whitespace between elements).

```typescript
interface SpacerProps extends BaseProps {
  /**
   * Space size.
   */
  size?: Size | string | number

  /**
   * Whether the spacer is horizontal.
   */
  horizontal?: boolean
}
```

#### `SpinnerClassOptions`

Options for resolving spinner CSS classes via UIClassMap.

```typescript
interface SpinnerClassOptions {
  size?: Size
}
```

#### `SpinnerProps`

Props for the Spinner/loading indicator component.

```typescript
interface SpinnerProps extends BaseProps {
  /**
   * Spinner size.
   */
  size?: Size

  /**
   * Spinner color.
   */
  color?: ColorVariant | string

  /**
   * Loading label (for accessibility).
   */
  label?: string

  /**
   * Spinner thickness.
   */
  thickness?: number
}
```

#### `SwitchClassOptions`

Options for switch class resolution.

```typescript
interface SwitchClassOptions {
  size?: Size
}
```

#### `SwitchProps`

Props for the Switch/Toggle component.

```typescript
interface SwitchProps extends InputElementProps {
  /**
   * Switch label.
   */
  label?: Children

  /**
   * Whether the switch is on.
   */
  checked?: boolean

  /**
   * Switch size.
   */
  size?: Size

  /**
   * Color when on.
   */
  color?: ColorVariant
}
```

#### `TabItem`

A single tab in a Tabs component.

```typescript
interface TabItem<T = string> {
  /**
   * Tab value/id.
   */
  value: T

  /**
   * Tab label.
   */
  label: Children

  /**
   * Tab content.
   */
  content?: Children

  /**
   * Whether the tab is disabled.
   */
  disabled?: boolean

  /**
   * Icon to display.
   */
  icon?: Children
}
```

#### `TableColumn`

Table column definition.

```typescript
interface TableColumn<T> {
  /**
   * Column key (data property).
   */
  key: keyof T | string

  /**
   * Column header.
   */
  header: Children

  /**
   * Custom cell renderer.
   */
  render?: (value: unknown, row: T, index: number) => Children

  /**
   * Column width.
   */
  width?: string | number

  /**
   * Whether the column is sortable.
   */
  sortable?: boolean

  /**
   * Text alignment.
   */
  align?: 'left' | 'center' | 'right'
}
```

#### `TableProps`

Props for the Table component.

```typescript
interface TableProps<T> extends HTMLElementProps {
  /**
   * Table data.
   */
  data: T[]

  /**
   * Column definitions.
   */
  columns: TableColumn<T>[]

  /**
   * Row key extractor.
   */
  rowKey?: keyof T | ((row: T) => string | number)

  /**
   * Whether to show borders.
   */
  bordered?: boolean

  /**
   * Whether rows are striped.
   */
  striped?: boolean

  /**
   * Whether rows are hoverable.
   */
  hoverable?: boolean

  /**
   * Table size.
   */
  size?: Size

  /**
   * Empty state content.
   */
  emptyContent?: Children

  /**
   * Loading state.
   */
  loading?: boolean

  /**
   * Sort configuration.
   */
  sort?: { key: string; direction: 'asc' | 'desc' }

  /**
   * Sort change handler.
   */
  onSort?: (key: string, direction: 'asc' | 'desc') => void

  /**
   * Row click handler.
   */
  onRowClick?: (row: T, index: number) => void
}
```

#### `TabsProps`

Props for the Tabs component (switchable tabbed content panels).

```typescript
interface TabsProps<T = string> extends BaseProps {
  /**
   * Tab items.
   */
  items: TabItem<T>[]

  /**
   * Current active tab.
   */
  value?: T

  /**
   * Default active tab.
   */
  defaultValue?: T

  /**
   * Change handler.
   */
  onChange?: (value: T) => void

  /**
   * Tab variant.
   */
  variant?: 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded'

  /**
   * Tab size.
   */
  size?: Size

  /**
   * Whether tabs are fitted (take full width).
   */
  fitted?: boolean
}
```

#### `TextareaClassOptions`

Options for textarea class resolution.

```typescript
interface TextareaClassOptions {
  error?: boolean
}
```

#### `TextareaElementProps`

Base props for textarea elements.

```typescript
interface TextareaElementProps extends HTMLElementProps {
  name?: string
  value?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  readOnly?: boolean
  autoFocus?: boolean
  rows?: number
  cols?: number
  maxLength?: number
  minLength?: number
  wrap?: 'hard' | 'soft' | 'off'
  onChange?: ChangeEventHandler
  onInput?: FormEventHandler
}
```

#### `TextareaProps`

Props for the Textarea component.

```typescript
interface TextareaProps extends TextareaElementProps {
  /**
   * Label text.
   */
  label?: string

  /**
   * Error message.
   */
  error?: string

  /**
   * Hint/help text.
   */
  hint?: string

  /**
   * Whether the textarea auto-resizes.
   */
  autoResize?: boolean

  /**
   * Minimum number of rows.
   */
  minRows?: number

  /**
   * Maximum number of rows.
   */
  maxRows?: number
}
```

#### `ToastClassOptions`

Options for toast class resolution.

```typescript
interface ToastClassOptions {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}
```

#### `ToastProps`

Props for the Toast/notification component.

```typescript
interface ToastProps extends HTMLElementProps {
  /**
   * Toast content.
   */
  children?: Children

  /**
   * Toast title.
   */
  title?: string

  /**
   * Toast description.
   */
  description?: string

  /**
   * Toast status/type.
   */
  status?: ColorVariant

  /**
   * Duration in milliseconds (0 for persistent).
   */
  duration?: number

  /**
   * Whether the toast is dismissible.
   */
  dismissible?: boolean

  /**
   * Called when dismissed.
   */
  onDismiss?: () => void

  /**
   * Toast position.
   */
  position?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left'

  /**
   * Accessible label for the close button.
   * @default 'Close'
   */
  closeLabel?: string
}
```

#### `TooltipProps`

Props for the Tooltip component (hover/focus popover with informational text).

```typescript
interface TooltipProps extends HTMLElementProps {
  /**
   * Tooltip content.
   */
  content: Children

  /**
   * Element that triggers the tooltip.
   */
  children: Children

  /**
   * Tooltip placement.
   */
  placement?: TooltipPlacement

  /**
   * Delay before showing (ms).
   */
  delay?: number

  /**
   * Whether the tooltip has an arrow.
   */
  hasArrow?: boolean
}
```

#### `UIClassMap`

UIClassMap interface — the contract for styling-agnostic class resolution.

Each styling library (Tailwind, Bootstrap, etc.) provides its own UIClassMap
implementation. Component resolvers accept GENERIC variant names from
`@molecule/app-ui` types and map to library-specific classes internally.

Framework UI packages (`@molecule/app-ui-react`, etc.) call getClassMap()
at render time to resolve classes without knowing which styling library
is active.

```typescript
interface UIClassMap {
  /**
   * Merges class names with library-specific conflict resolution
   * (e.g. tailwind-merge for Tailwind).
   */
  cn(...classes: ClassMapValue[]): string

  // ---- Component resolvers (functions) ----

  button(opts?: ButtonClassOptions): string
  input(opts?: InputClassOptions): string
  textarea(opts?: TextareaClassOptions): string
  select(opts?: SelectClassOptions): string
  checkbox(opts?: CheckboxClassOptions): string
  radio(opts?: RadioClassOptions): string
  switchBase(opts?: SwitchClassOptions): string
  switchThumb(opts?: SwitchClassOptions): string
  label(opts?: LabelClassOptions): string
  card(opts?: CardClassOptions): string
  badge(opts?: BadgeClassOptions): string
  alert(opts?: AlertClassOptions): string
  avatar(opts?: AvatarClassOptions): string
  modal(opts?: ModalClassOptions): string
  spinner(opts?: SpinnerClassOptions): string
  toast(opts?: ToastClassOptions): string
  separator(opts?: SeparatorClassOptions): string
  accordion(opts?: AccordionClassOptions): string
  pagination(opts?: PaginationClassOptions): string
  tooltip(): string
  progress(): string
  progressBar(): string
  skeleton(): string
  container(opts?: ContainerClassOptions): string
  flex(opts?: FlexClassOptions): string
  grid(opts?: GridClassOptions): string

  // ---- Variant resolvers (parameterized sub-component classes) ----

  /**
   * Returns card padding class for the given size ('none' removes padding).
   */
  cardPadding(size?: Size | 'none'): string
  /**
   * Returns progress bar height class for the given size.
   */
  progressHeight(size?: Size): string
  /**
   * Returns progress bar fill color class for the given color variant.
   */
  progressColor(color?: ColorVariant): string
  /**
   * Returns toast container positioning class for the given position.
   */
  toastContainer(opts?: { position?: ToastPosition }): string
  /**
   * Returns radio group layout class for horizontal or vertical direction.
   */
  radioGroupLayout(direction?: 'horizontal' | 'vertical'): string
  /**
   * Returns spacer element class (block or inline with configurable size).
   */
  spacer(opts?: { size?: Size; horizontal?: boolean }): string

  // ---- Static class strings (sub-components without variants) ----

  formError: string
  formHint: string
  cardHeader: string
  cardTitle: string
  cardDescription: string
  cardContent: string
  cardFooter: string
  alertTitle: string
  alertDescription: string
  avatarImage: string
  avatarFallback: string
  dialogOverlay: string
  dialogHeader: string
  dialogFooter: string
  dialogTitle: string
  dialogDescription: string
  dialogClose: string
  /** Modal centering wrapper: fixed full-screen flex container for centering content. */
  dialogWrapper: string
  /** Modal scrollable body area with padding. */
  dialogBody: string
  dropdownContent: string
  dropdownItem: string
  dropdownSeparator: string
  dropdownLabel: string
  table: string
  tableHeader: string
  tableBody: string
  tableFooter: string
  tableRow: string
  tableHead: string
  tableCell: string
  tableCaption: string
  tabsList: string
  tabsTrigger: string
  tabsContent: string
  tooltipContent: string
  toastViewport: string
  toastTitle: string
  toastDescription: string
  toastClose: string
  toastAction: string
  accordionRoot: string
  accordionItem: string
  accordionContent: string
  accordionContentInner: string
  paginationRoot: string
  paginationContent: string
  paginationLink: string
  paginationPrevious: string
  paginationNext: string
  paginationEllipsis: string
  center: string
  srOnly: string
  notSrOnly: string

  // ---- Icon size tokens ----

  /** Extra-small icon (e.g. 12×12). */
  iconXs: string
  /** Small icon (e.g. 16×16). Used for close buttons, sort indicators. */
  iconSm: string
  /** Medium icon (e.g. 20×20). Used for status icons, alerts, toasts. */
  iconMd: string

  // ---- Button sub-element tokens ----

  /** Left icon spacing inside buttons. */
  buttonIconLeft: string
  /** Right icon spacing inside buttons. */
  buttonIconRight: string
  /** Inline spinner inside loading buttons. */
  buttonSpinner: string

  // ---- Card sub-element tokens ----

  /** Interactive card hover/cursor behavior. */
  cardInteractive: string

  // ---- Alert sub-element tokens ----

  /** Alert icon wrapper (prevents shrinking). */
  alertIconWrapper: string
  /** Alert content area (fills remaining space). */
  alertContent: string
  /** Alert dismiss button styling. */
  alertDismiss: string

  // ---- Theme toggle tokens ----

  /** Theme toggle button (icon-only, transparent). */
  themeToggleButton: string

  // ---- OAuth tokens ----

  /** OAuth section "or continue with" divider container. */
  oauthDivider: string
  /** OAuth divider horizontal line. */
  oauthDividerLine: string
  /** OAuth divider text span (with background to mask line). */
  oauthDividerText: string
  /** OAuth button group (flex wrap container). */
  oauthButtonGroup: string
  /** Individual OAuth provider button. */
  oauthButton: string
  /** OAuth button icon wrapper (opacity transition). */
  oauthButtonIcon: string

  // ---- Auth page tokens ----

  /** Auth form error message. */
  authFormError: string
  /** Forgot password link button. */
  forgotPasswordLink: string

  // ---- Floating input sub-element tokens ----

  /** Floating input wrapper (relative inline-block). */
  floatingInputWrapper: string
  /** Floating input field class (sibling-selector hook for floating label). */
  floatingInput: string
  /** Floating input label/placeholder (absolute positioned, uppercase). */
  floatingLabel: string

  // ---- Input sub-element tokens ----

  /** Input outer wrapper (full-width block). */
  inputWrapper: string
  /** Input inner wrapper (relative positioning for icons). */
  inputInner: string
  /** Left icon/element container inside input. */
  inputLeftElement: string
  /** Right icon/element container inside input. */
  inputRightElement: string
  /** Clear button inside input. */
  inputClearButton: string
  /** Input left padding when left element is present. */
  inputPadLeft: string
  /** Input right padding when right element is present. */
  inputPadRight: string

  // ---- Select sub-element tokens ----

  /** Native select arrow area. */
  selectNative: string

  // ---- Label/Form sub-element tokens ----

  /** Block label with bottom margin (for use above inputs). */
  labelBlock: string
  /** Form fieldset wrapper. */
  formFieldset: string
  /** Fieldset with display:contents — invisible wrapper for disabled state. */
  formFieldsetContents: string
  /** Form field group wrapper. */
  formField: string
  /** Flex column wrapper around control + error message. */
  formFieldWrapper: string

  // ---- Control (Checkbox/Switch/Radio) shared tokens ----

  /** Control wrapper label (flex + gap + cursor). */
  controlLabel: string
  /** Inner control container (for checkbox/radio indicator). */
  controlContainer: string
  /** Control label text styling (font size, color, etc.). */
  controlText: string
  /** Disabled state for control wrappers. */
  controlDisabled: string

  // ---- Radio group tokens ----

  /** Radio group label/legend. */
  radioGroupLabel: string

  // ---- Accordion sub-element tokens ----

  /** Accordion trigger chevron icon (animated rotation). */
  accordionChevron: string
  /** Accordion trigger base (full-width, left-aligned). */
  accordionTriggerBase: string

  // ---- Tabs sub-element tokens ----

  /** Tabs list fitted variant (full-width). */
  tabsFitted: string
  /** Tab trigger fitted variant (flex-1). */
  tabTriggerFitted: string
  /** Tab trigger icon spacing. */
  tabTriggerIcon: string

  // ---- Pagination tokens ----

  /** Pagination button interactive classes (cursor). */
  paginationInteractive: string

  // ---- Progress sub-element tokens ----

  /** Progress outer wrapper (full-width). */
  progressWrapper: string
  /** Progress label container (flex between). */
  progressLabelContainer: string
  /** Progress label text styling. */
  progressLabelText: string
  /** Progress indeterminate animation. */
  progressIndeterminate: string

  // ---- Table sub-element tokens ----

  /** Table scrollable wrapper. */
  tableWrapper: string
  /** Table loading overlay. */
  tableLoadingOverlay: string
  /** Table empty state cell. */
  tableEmptyCell: string
  /** Table sort indicator wrapper. */
  tableSortWrapper: string
  /** Table sort icon spacing. */
  tableSortIcon: string
  /** Table striped row. */
  tableRowStriped: string
  /** Table hoverable row. */
  tableRowHoverable: string
  /** Table clickable row. */
  tableRowClickable: string
  /** Table sortable header. */
  tableHeadSortable: string
  /** Table bordered variant. */
  tableBordered: string

  // ---- Toast sub-element tokens ----

  /** Toast icon wrapper (prevents shrinking). */
  toastIconWrapper: string
  /** Toast content wrapper (fills remaining space). */
  toastContentWrapper: string

  // ---- Dropdown sub-element tokens ----

  /** Dropdown trigger wrapper. */
  dropdownTrigger: string
  /** Dropdown item icon spacing. */
  dropdownItemIcon: string
  /** Dropdown item label (fills remaining space). */
  dropdownItemLabel: string
  /** Dropdown item shortcut text. */
  dropdownItemShortcut: string
  /** Dropdown item disabled state. */
  dropdownItemDisabled: string

  // ---- Tooltip tokens ----

  /** Tooltip trigger wrapper. */
  tooltipTrigger: string

  // ---- Avatar sub-element tokens ----

  /** Avatar initials text styling. */
  avatarInitials: string
  /** Avatar fallback icon sizing. */
  avatarFallbackIcon: string
  /** Avatar square (non-rounded) variant. */
  avatarSquare: string

  // ---- Badge tokens ----

  /** Badge square (non-rounded) variant. */
  badgeSquare: string

  // ---- Skeleton sub-element tokens ----

  /** Skeleton text line container. */
  skeletonTextContainer: string
  /** Skeleton circle shape. */
  skeletonCircle: string
  /** Skeleton wave animation variant. */
  skeletonWave: string
  /** Skeleton no-animation variant. */
  skeletonNone: string

  // ---- Typography utility tokens ----

  /** Right-aligned text. */
  textRight: string

  // ---- Theme surface tokens ----

  /** Full-page background with default text color (light/dark aware). */
  page: string
  /** Card/panel surface background (light/dark aware). */
  surface: string
  /** Recessed/secondary surface background (e.g. tab bars, inputs, sidebars). */
  surfaceSecondary: string
  /** App header bar: surface + bottom border + subtle shadow. */
  headerBar: string
  /** Right-side drawer panel: fixed, full-height, scrollable. */
  drawer: string

  // ---- Text color tokens ----

  /** De-emphasized text (e.g. labels, secondary info). */
  textMuted: string
  /** Very subtle text (e.g. footer, icon color). */
  textSubtle: string
  /** Primary brand color text (e.g. links, active labels). */
  textPrimary: string
  /** Success state text color. */
  textSuccess: string
  /** Warning state text color. */
  textWarning: string
  /** Error-state text color. */
  textError: string

  // ---- Border tokens ----

  /** Bottom border in theme border color. */
  borderB: string
  /** Top border in theme border color. */
  borderT: string
  /** Right border in theme border color. */
  borderR: string
  /** All-sides border in theme border color. */
  borderAll: string
  /** Primary-colored bottom border (e.g. active tab indicator). */
  borderBPrimary: string

  // ---- Background utility tokens ----

  /** Subtle error background for banners/notifications. */
  bgErrorSubtle: string
  /** Border color used as element background (e.g. resize handles, separators). */
  bgBorder: string

  // ---- Composite style tokens ----

  /** Settings section heading (small, uppercase, muted). */
  sectionHeading: string
  /** Standard form label (block, small, medium weight, bottom margin). */
  formLabel: string
  /** Small form label variant (extra-small, muted). */
  formLabelSmall: string
  /** Inline text link appearance (hover effect). */
  link: string
  /** Rich text / long-form prose content. */
  prose: string
  /** Thin horizontal divider line. */
  dividerLine: string
  /** Modal overlay backdrop. */
  overlay: string
  /** Fixed bottom footer bar. */
  footerBar: string
  /** Footer link styling (muted, hover highlight). */
  footerLink: string
  /** Footer button styling (borderless, muted, hover highlight). */
  footerButton: string

  // ---- Language selector tokens ----

  /** Language selector grid container (responsive columns, scrollable). */
  languageGrid: string
  /** Language option item (default/inactive state). */
  languageOption: string
  /** Language option item (active/selected state). */
  languageActive: string

  // ---- Spacing utilities ----

  /**
   * Returns a spacing class for the given property and scale.
   */
  sp(property: SpacingProperty, scale: SpacingScale): string
  /**
   * Returns vertical space-between class (e.g. `space-y-*` in Tailwind).
   */
  stack(scale: SpacingScale): string

  // ---- Typography utilities ----

  /**
   * Returns font size class for the given scale.
   */
  textSize(size: TextScale): string
  /**
   * Returns font weight class for the given weight.
   */
  fontWeight(weight: FontWeightScale): string
  /** Center-aligned text. */
  textCenter: string

  // ---- Sizing utilities ----

  /**
   * Returns width class — fractional (`'1/2'`), keyword (`'full'`), or numeric.
   */
  w(value: WidthValue | number): string
  /**
   * Returns height class — keyword (`'full'`, `'screen'`) or numeric.
   */
  h(value: HeightValue | number): string
  /**
   * Returns minimum height class.
   */
  minH(value: HeightValue): string
  /**
   * Returns maximum width constraint class.
   */
  maxW(value: MaxWidthScale): string
  /** Prevent flex shrinking. */
  shrink0: string

  // ---- Position utilities ----

  // ---- Display utilities ----

  /** Block display. */
  displayBlock: string
  /** Inline-block display. */
  displayInlineBlock: string
  /** Contents display (invisible wrapper). */
  displayContents: string

  // ---- Layout utilities ----

  /** Horizontal auto margin (centering). */
  mxAuto: string
  /** Pointer cursor. */
  cursorPointer: string
  /** Full border radius (circle). */
  roundedFull: string

  // ---- Grid utilities ----

  /**
   * Returns grid-template-rows class for the given row count.
   */
  gridRows(rows: number): string

  // ---- Position utilities ----

  /**
   * Returns CSS position class for the given value.
   */
  position(value: 'relative' | 'absolute' | 'fixed' | 'sticky'): string
  /** Full inset (inset: 0). */
  inset0: string

  // ---- Logo / brand identity tokens ----

  /** Logo wordmark text styling (size, tracking, case). */
  logoText: string
  /** Logo icon color (primary brand color). */
  logoIcon: string

  // ---- Header layout tokens ----

  /** Fixed header positioning (fixed, full-width, high z-index). */
  headerFixed: string
  /** Main header inner container (max-width, height, padding). */
  headerInner: string

  // ---- Auth page layout tokens ----

  /** Auth page header inner container (full-width, no max-width). */
  authHeaderInner: string
  /** Auth page body: centered content area. */
  authPageBody: string
  /** Auth form narrow container (max-width, centered). */
  authFormWrapper: string
  /** Auth form field spacing (bottom margin). */
  authField: string
  /** Spacing after auth submit area (top margin). */
  authAfterSubmit: string

  // ---- Auth button layout tokens ----

  /** Flex row container for auth form buttons. */
  authButtonRow: string
  /** Back button sizing in auth forms. */
  authBackButton: string
  /** Submit button sizing next to back button. */
  authSubmitButton: string
  /** Login page signup button (half-width, left). */
  authLoginSignup: string
  /** Login page submit button (half-width, right). */
  authLoginSubmit: string
  /** Login submit full-width (when logging in). */
  authLoginSubmitFull: string
  /** Hidden state for login signup button. */
  authHidden: string
  /** Forward arrow icon spacing. */
  authArrowIcon: string

  // ---- App layout tokens ----

  /** Main app content padding (header/footer offsets). */
  appLayout: string

  /** Flex grow to fill available space (`flex: 1`). */
  flex1: string

  // ---- OAuth tokens ----

  /** OAuth provider name label (fallback when no icon). */
  oauthProviderLabel: string
}
```

#### `UIProvider`

Identifies the bonded UI styling library. Providers set `name`
to indicate which library is active (e.g. `"tailwind"`, `"bootstrap"`).

```typescript
interface UIProvider {
  /**
   * Identifier for the styling library (e.g. `"tailwind"`, `"ionic"`).
   */
  name: string
}
```

### Types

#### `ButtonSize`

Button size variants (extends Size with 'icon' for square icon-only buttons).

```typescript
type ButtonSize = Size | 'icon'
```

#### `ButtonVariant`

Button visual variant styles.

```typescript
type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link'
```

#### `ChangeEventHandler`

Framework-agnostic change event handler.

```typescript
type ChangeEventHandler = EventHandler<Event>
```

#### `Children`

Framework-agnostic child content.
Use `unknown` to allow any framework's node type (ReactNode, VNode, etc.).

```typescript
type Children = unknown
```

#### `ClassMapOverrides`

Overrides for extending a UIClassMap.

Can be a partial map of token replacements, or a function that receives
the base ClassMap and returns overrides (useful for extending resolver
functions while preserving the base behavior).

```typescript
type ClassMapOverrides = Partial<UIClassMap> | ((base: UIClassMap) => Partial<UIClassMap>)
```

#### `ClassMapValue`

Class value types accepted by the UIClassMap `cn()` function.
Supports strings, booleans, arrays, and conditional objects.

```typescript
type ClassMapValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassMapValue[]
  | Record<string, boolean | undefined | null>
```

#### `ColorVariant`

Semantic color variants used across components for status indication.

```typescript
type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
```

#### `EventHandler`

Framework-agnostic event handler.

```typescript
type EventHandler<E = Event> = (event: E) => void
```

#### `FocusEventHandler`

Framework-agnostic focus event handler.

```typescript
type FocusEventHandler = EventHandler<FocusEvent>
```

#### `FontWeightScale`

Font weight scale.

```typescript
type FontWeightScale = 'normal' | 'medium' | 'semibold' | 'bold'
```

#### `FormEventHandler`

Framework-agnostic form event handler.

```typescript
type FormEventHandler = EventHandler<Event>
```

#### `HeightValue`

Height value — keyword or numeric (mapped to spacing scale).

```typescript
type HeightValue = 'full' | 'screen' | 'auto'
```

#### `InputType`

Allowed HTML input type attribute values for the Input component.

```typescript
type InputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
  | 'time'
  | 'datetime-local'
```

#### `KeyboardEventHandler`

Framework-agnostic keyboard event handler.

```typescript
type KeyboardEventHandler = EventHandler<KeyboardEvent>
```

#### `MaxWidthScale`

Max-width scale for constraining content.

```typescript
type MaxWidthScale = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
```

#### `ModalSize`

Modal size variants including full-screen.

```typescript
type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
```

#### `MouseEventHandler`

Framework-agnostic mouse event handler.

```typescript
type MouseEventHandler = EventHandler<MouseEvent>
```

#### `Size`

Standard size scale used across all molecule UI components (buttons, inputs, badges, etc.).

```typescript
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
```

#### `SpacingProperty`

CSS spacing property shorthand (padding/margin with direction).

```typescript
type SpacingProperty =
  | 'p'
  | 'px'
  | 'py'
  | 'pt'
  | 'pb'
  | 'pl'
  | 'pr'
  | 'm'
  | 'mx'
  | 'my'
  | 'mt'
  | 'mb'
  | 'ml'
  | 'mr'
```

#### `SpacingScale`

Abstract spacing scale. Each styling library maps these to its own units.
For Tailwind: 0 → 0, 1 → 0.25rem, 4 → 1rem, 8 → 2rem, etc.

```typescript
type SpacingScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16
```

#### `TextScale`

Text size scale from extra-small to 4xl.

```typescript
type TextScale = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
```

#### `ToastPosition`

Toast position values for screen placement.

```typescript
type ToastPosition =
  | 'top'
  | 'top-right'
  | 'top-left'
  | 'bottom'
  | 'bottom-right'
  | 'bottom-left'
```

#### `TooltipPlacement`

Position where a tooltip renders relative to its trigger element (top, bottom, left, right, and corner variants).

```typescript
type TooltipPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
```

#### `WidthValue`

Width value — fractional, keyword, or numeric (mapped to spacing scale).

```typescript
type WidthValue = 'full' | '1/2' | '1/3' | '2/3' | '1/4' | '3/4' | 'auto' | 'screen'
```

### Functions

#### `extendClassMap(base, overrides)`

Creates a new UIClassMap by extending a base ClassMap with overrides.

Overrides can be a plain object (for replacing specific tokens/resolvers)
or a function that receives the base map (for extending resolvers while
preserving base behavior).

```typescript
function extendClassMap(base: UIClassMap, overrides: ClassMapOverrides): UIClassMap
```

- `base` — The base UIClassMap to extend
- `overrides` — Token overrides (object or function returning object)

**Returns:** A new UIClassMap with overrides applied

#### `getClassMap()`

Retrieves the bonded UIClassMap, throwing if none is configured.
Use this to resolve styling-agnostic class names in components.

```typescript
function getClassMap(): UIClassMap
```

**Returns:** The bonded UIClassMap implementation.

#### `getProvider()`

Retrieves the bonded UI provider, or `undefined` if none is configured.

```typescript
function getProvider(): UIProvider | undefined
```

**Returns:** The bonded UI provider, or `undefined`.

#### `hasClassMap()`

Checks whether a UIClassMap is currently bonded.

```typescript
function hasClassMap(): boolean
```

**Returns:** `true` if a UIClassMap is bonded.

#### `hasProvider()`

Checks whether a UI provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a UI provider is bonded.

#### `setClassMap(classMap)`

Registers a UIClassMap as the active styling resolver. Called at
app startup to wire a styling library (e.g. Tailwind, Bootstrap).

```typescript
function setClassMap(classMap: UIClassMap): void
```

- `classMap` — The UIClassMap implementation to bond.

#### `setProvider(provider)`

Registers a UI provider as the active singleton.

```typescript
function setProvider(provider: UIProvider): void
```

- `provider` — The UI provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Angular UI | `@molecule/app-ui-angular` |
| React UI | `@molecule/app-ui-react` |
| Solid UI | `@molecule/app-ui-solid` |
| Svelte UI | `@molecule/app-ui-svelte` |
| Tailwind UI | `@molecule/app-ui-tailwind` |
| Vue UI | `@molecule/app-ui-vue` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `react` >=18.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-ui`.
