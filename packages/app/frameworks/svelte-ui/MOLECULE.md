# @molecule/app-ui-svelte

Svelte UI class generators for molecule.dev.

Provides class generators, variant maps, and utility functions for building
Svelte components that implement the `@molecule/app-ui` component interfaces
using the UIClassMap abstraction from `@molecule/app-ui`.

Unlike the React and Vue packages which export framework-specific components,
this package exports pure TypeScript utilities that Svelte components consume
to generate their class strings.

## Type
`framework`

## Installation
```bash
npm install @molecule/app-ui-svelte
```

## API

### Interfaces

#### `AccordionClassOptions`

Options for generating accordion classes.

```typescript
interface AccordionClassOptions {
  className?: string
}
```

#### `AccordionItem`

A single item in an Accordion component.

```typescript
interface AccordionItem<T = string> {
    /**
     * Item value/id.
     */
    value: T;
    /**
     * Item header/trigger.
     */
    header: Children;
    /**
     * Item content.
     */
    content: Children;
    /**
     * Whether the item is disabled.
     */
    disabled?: boolean;
}
```

#### `AccordionProps`

Props for the Accordion component.

```typescript
interface AccordionProps<T = string> extends BaseProps {
    /**
     * Accordion items.
     */
    items: AccordionItem<T>[];
    /**
     * Expanded item(s).
     */
    value?: T | T[];
    /**
     * Default expanded item(s).
     */
    defaultValue?: T | T[];
    /**
     * Change handler.
     */
    onChange?: (value: T | T[]) => void;
    /**
     * Whether multiple items can be expanded.
     */
    multiple?: boolean;
    /**
     * Whether items can be collapsed.
     */
    collapsible?: boolean;
}
```

#### `AlertClassOptions`

Options for generating alert classes.

```typescript
interface AlertClassOptions {
  status?: ColorVariant
  className?: string
}
```

#### `AlertProps`

Props for the Alert component.

```typescript
interface AlertProps extends HTMLElementProps {
    /**
     * Alert content.
     */
    children?: Children;
    /**
     * Alert title.
     */
    title?: string;
    /**
     * Alert status/type.
     */
    status?: ColorVariant;
    /**
     * Alert variant.
     */
    variant?: 'solid' | 'subtle' | 'outline' | 'left-accent';
    /**
     * Whether the alert is dismissible.
     */
    dismissible?: boolean;
    /**
     * Called when dismissed.
     */
    onDismiss?: () => void;
    /**
     * Icon to display.
     */
    icon?: Children;
    /**
     * Accessible label for the dismiss button.
     * @default 'Dismiss'
     */
    dismissLabel?: string;
}
```

#### `AvatarClassOptions`

Options for generating avatar classes.

```typescript
interface AvatarClassOptions {
  size?: Size | number
  rounded?: boolean
  className?: string
}
```

#### `AvatarProps`

Props for the Avatar component.

```typescript
interface AvatarProps extends HTMLElementProps {
    /**
     * Image source URL.
     */
    src?: string;
    /**
     * Alt text for the image.
     */
    alt?: string;
    /**
     * Name for fallback initials.
     */
    name?: string;
    /**
     * Avatar size.
     */
    size?: Size | number;
    /**
     * Whether the avatar is rounded.
     */
    rounded?: boolean;
    /**
     * Fallback element when no image.
     */
    fallback?: Children;
}
```

#### `BadgeClassOptions`

Options for generating badge classes.

```typescript
interface BadgeClassOptions {
  color?: ColorVariant
  variant?: 'solid' | 'outline' | 'subtle'
  size?: Size
  rounded?: boolean
  className?: string
}
```

#### `BadgeProps`

Props for the Badge component (status labels, counts, tags).

```typescript
interface BadgeProps extends HTMLElementProps {
    /**
     * Badge content.
     */
    children?: Children;
    /**
     * Badge color.
     */
    color?: ColorVariant;
    /**
     * Badge variant.
     */
    variant?: 'solid' | 'outline' | 'subtle';
    /**
     * Badge size.
     */
    size?: Size;
    /**
     * Whether the badge is rounded.
     */
    rounded?: boolean;
}
```

#### `BaseProps`

Base props shared by all components.

```typescript
interface BaseProps {
    /**
     * Additional CSS class name(s).
     */
    className?: string;
    /**
     * Inline styles.
     */
    style?: CSSProperties;
    /**
     * Test ID for automated testing.
     */
    testId?: string;
    /**
     * Whether the component is disabled.
     */
    disabled?: boolean;
}
```

#### `ButtonClassOptions`

Options for generating button classes.

```typescript
interface ButtonClassOptions {
  variant?: ButtonVariant
  color?: ColorVariant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  className?: string
}
```

#### `ButtonElementProps`

Base props for button elements.

```typescript
interface ButtonElementProps extends HTMLElementProps {
    type?: 'button' | 'submit' | 'reset';
    name?: string;
    value?: string;
    form?: string;
}
```

#### `ButtonProps`

Props for the Button component.

```typescript
interface ButtonProps extends ButtonElementProps {
    /**
     * Button content.
     */
    children?: Children;
    /**
     * Visual variant.
     */
    variant?: ButtonVariant;
    /**
     * Color scheme.
     */
    color?: ColorVariant;
    /**
     * Button size.
     */
    size?: ButtonSize;
    /**
     * Whether the button is in a loading state.
     */
    loading?: boolean;
    /**
     * Loading text to display.
     */
    loadingText?: string;
    /**
     * Whether the button takes full width.
     */
    fullWidth?: boolean;
    /**
     * Icon to display before the label.
     */
    leftIcon?: Children;
    /**
     * Icon to display after the label.
     */
    rightIcon?: Children;
}
```

#### `CardClassOptions`

Options for generating card classes.

```typescript
interface CardClassOptions {
  variant?: 'elevated' | 'outlined' | 'filled'
  padding?: Size | 'none'
  interactive?: boolean
  className?: string
}
```

#### `CardProps`

Props for the Card container component (elevated, outlined, or filled surface).

```typescript
interface CardProps extends HTMLElementProps {
    /**
     * Card content.
     */
    children?: Children;
    /**
     * Card variant.
     */
    variant?: 'elevated' | 'outlined' | 'filled';
    /**
     * Whether the card is interactive (clickable).
     */
    interactive?: boolean;
    /**
     * Padding size.
     */
    padding?: Size | 'none';
}
```

#### `CheckboxClassOptions`

Options for generating checkbox classes.

```typescript
interface CheckboxClassOptions {
  error?: string
  className?: string
}
```

#### `CheckboxProps`

Props for the Checkbox component.

```typescript
interface CheckboxProps extends InputElementProps {
    /**
     * Checkbox label.
     */
    label?: Children;
    /**
     * Whether the checkbox is checked.
     */
    checked?: boolean;
    /**
     * Whether the checkbox is in an indeterminate state.
     */
    indeterminate?: boolean;
    /**
     * Checkbox size.
     */
    size?: Size;
    /**
     * Error message.
     */
    error?: string;
}
```

#### `ContainerClassOptions`

Options for generating container classes.

```typescript
interface ContainerClassOptions {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
  centered?: boolean
  className?: string
}
```

#### `ContainerProps`

Props for the Container layout component.

```typescript
interface ContainerProps extends HTMLElementProps {
    /**
     * Container content.
     */
    children?: Children;
    /**
     * Maximum width.
     */
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string;
    /**
     * Whether to center the container.
     */
    centered?: boolean;
    /**
     * Horizontal padding.
     */
    paddingX?: Size | string;
}
```

#### `CSSProperties`

Framework-agnostic CSS properties.
Mirrors React.CSSProperties but without React dependency.

```typescript
interface CSSProperties {
    [key: string]: string | number | undefined;
}
```

#### `DropdownContentClassOptions`

Options for generating dropdown content classes.

```typescript
interface DropdownContentClassOptions {
  className?: string
}
```

#### `DropdownItem`

Dropdown menu item.

```typescript
interface DropdownItem<T = string> {
    /**
     * Item value/id.
     */
    value: T;
    /**
     * Display label.
     */
    label: Children;
    /**
     * Whether the item is disabled.
     */
    disabled?: boolean;
    /**
     * Icon to display.
     */
    icon?: Children;
    /**
     * Keyboard shortcut display.
     */
    shortcut?: string;
    /**
     * Whether this is a separator.
     */
    separator?: boolean;
    /**
     * Nested items (for submenus).
     */
    items?: DropdownItem<T>[];
}
```

#### `DropdownPosition`

Absolute top/left pixel position for a dropdown element.

```typescript
interface DropdownPosition {
  top: number
  left: number
}
```

#### `DropdownProps`

Props for the Dropdown menu component.

```typescript
interface DropdownProps<T = string> extends BaseProps {
    /**
     * Dropdown trigger element.
     */
    trigger: Children;
    /**
     * Dropdown items.
     */
    items: DropdownItem<T>[];
    /**
     * Called when an item is selected.
     */
    onSelect?: (value: T) => void;
    /**
     * Dropdown placement.
     */
    placement?: 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right';
    /**
     * Whether the dropdown is open (controlled).
     */
    open?: boolean;
    /**
     * Called when open state changes.
     */
    onOpenChange?: (open: boolean) => void;
    /**
     * Menu alignment.
     */
    align?: 'start' | 'center' | 'end';
    /**
     * Menu width.
     */
    width?: 'trigger' | 'auto' | number | string;
}
```

#### `FlexClassOptions`

Options for generating flex classes.

```typescript
interface FlexClassOptions {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
  gap?: Size | string | number
  className?: string
}
```

#### `FlexProps`

Flex container props.

```typescript
interface FlexProps extends HTMLElementProps {
    /**
     * Flex content.
     */
    children?: Children;
    /**
     * Flex direction.
     */
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    /**
     * Justify content.
     */
    justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
    /**
     * Align items.
     */
    align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    /**
     * Flex wrap.
     */
    wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
    /**
     * Gap between items.
     */
    gap?: Size | string | number;
}
```

#### `FormElementProps`

Base props for form elements.

```typescript
interface FormElementProps extends HTMLElementProps {
    action?: string;
    method?: 'get' | 'post';
    encType?: string;
    target?: string;
    noValidate?: boolean;
    autoComplete?: 'on' | 'off';
    onSubmit?: FormEventHandler;
    onReset?: FormEventHandler;
}
```

#### `FormFieldClassOptions`

Options for generating form field classes.

```typescript
interface FormFieldClassOptions {
  className?: string
}
```

#### `FormFieldProps`

Form field wrapper props.

```typescript
interface FormFieldProps extends HTMLElementProps {
    /**
     * Field content.
     */
    children?: Children;
    /**
     * Field label.
     */
    label?: string;
    /**
     * Field name.
     */
    name?: string;
    /**
     * Error message.
     */
    error?: string;
    /**
     * Hint/help text.
     */
    hint?: string;
    /**
     * Whether the field is required.
     */
    required?: boolean;
}
```

#### `FormProps`

Props for the Form component (wraps inputs with submission handling and validation).

```typescript
interface FormProps extends FormElementProps {
    /**
     * Form content.
     */
    children?: Children;
    /**
     * Submit handler with form data.
     */
    onFormSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
    /**
     * Whether the form is submitting.
     */
    submitting?: boolean;
}
```

#### `GridClassOptions`

Options for generating grid classes.

```typescript
interface GridClassOptions {
  columns?: number | string
  rows?: number | string
  gap?: Size | string | number
  columnGap?: Size | string | number
  rowGap?: Size | string | number
  className?: string
}
```

#### `GridProps`

Grid container props.

```typescript
interface GridProps extends HTMLElementProps {
    /**
     * Grid content.
     */
    children?: Children;
    /**
     * Number of columns.
     */
    columns?: number | string;
    /**
     * Number of rows.
     */
    rows?: number | string;
    /**
     * Gap between items.
     */
    gap?: Size | string | number;
    /**
     * Column gap.
     */
    columnGap?: Size | string | number;
    /**
     * Row gap.
     */
    rowGap?: Size | string | number;
}
```

#### `HTMLElementProps`

Base props for HTML elements.
Framework bindings should extend this with framework-specific attributes.

```typescript
interface HTMLElementProps extends BaseProps {
    id?: string;
    title?: string;
    tabIndex?: number;
    role?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    'aria-hidden'?: boolean;
    'aria-disabled'?: boolean;
    'aria-expanded'?: boolean;
    'aria-selected'?: boolean;
    'aria-checked'?: boolean | 'mixed';
    'aria-pressed'?: boolean | 'mixed';
    'aria-invalid'?: boolean;
    'aria-required'?: boolean;
    'aria-readonly'?: boolean;
    'aria-busy'?: boolean;
    'aria-live'?: 'off' | 'polite' | 'assertive';
    onClick?: MouseEventHandler;
    onDoubleClick?: MouseEventHandler;
    onMouseEnter?: MouseEventHandler;
    onMouseLeave?: MouseEventHandler;
    onFocus?: FocusEventHandler;
    onBlur?: FocusEventHandler;
    onKeyDown?: KeyboardEventHandler;
    onKeyUp?: KeyboardEventHandler;
    onKeyPress?: KeyboardEventHandler;
}
```

#### `InputClassOptions`

Options for generating input classes.

```typescript
interface InputClassOptions {
  size?: Size
  error?: string
  hasLeftElement?: boolean
  hasRightElement?: boolean
  clearable?: boolean
  hasValue?: boolean
  required?: boolean
  className?: string
}
```

#### `InputElementProps`

Base props for input elements.

```typescript
interface InputElementProps extends HTMLElementProps {
    name?: string;
    value?: string | number | readonly string[];
    defaultValue?: string | number | readonly string[];
    placeholder?: string;
    required?: boolean;
    readOnly?: boolean;
    autoFocus?: boolean;
    autoComplete?: string;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    onChange?: ChangeEventHandler;
    onInput?: FormEventHandler;
}
```

#### `InputProps`

Props for the Input component (text field, email, password, etc.).

```typescript
interface InputProps extends InputElementProps {
    /**
     * Input type.
     */
    type?: InputType;
    /**
     * Input size.
     */
    size?: Size;
    /**
     * Label text.
     */
    label?: string;
    /**
     * Error message.
     */
    error?: string;
    /**
     * Hint/help text.
     */
    hint?: string;
    /**
     * Element to display on the left.
     */
    leftElement?: Children;
    /**
     * Element to display on the right.
     */
    rightElement?: Children;
    /**
     * Whether to show a clear button.
     */
    clearable?: boolean;
    /**
     * Called when the clear button is clicked.
     */
    onClear?: () => void;
    /**
     * Accessible label for the clear button.
     * @default 'Clear'
     */
    clearLabel?: string;
}
```

#### `ModalClassOptions`

Options for generating modal content classes.

```typescript
interface ModalClassOptions {
  size?: ModalSize
  className?: string
}
```

#### `ModalProps`

Props for the Modal/Dialog component.

```typescript
interface ModalProps extends HTMLElementProps {
    /**
     * Whether the modal is open.
     */
    open: boolean;
    /**
     * Called when the modal should close.
     */
    onClose: () => void;
    /**
     * Modal title.
     */
    title?: string;
    /**
     * Modal content.
     */
    children?: Children;
    /**
     * Modal size.
     */
    size?: ModalSize;
    /**
     * Whether to show a close button.
     */
    showCloseButton?: boolean;
    /**
     * Whether clicking the overlay closes the modal.
     */
    closeOnOverlayClick?: boolean;
    /**
     * Whether pressing Escape closes the modal.
     */
    closeOnEscape?: boolean;
    /**
     * Footer content (typically action buttons).
     */
    footer?: Children;
    /**
     * Whether the modal is centered vertically.
     */
    centered?: boolean;
    /**
     * Whether to prevent body scroll when open.
     */
    preventScroll?: boolean;
    /**
     * Accessible label for the close button.
     * @default 'Close'
     */
    closeLabel?: string;
}
```

#### `PaginationClassOptions`

Options for generating pagination classes.

```typescript
interface PaginationClassOptions {
  className?: string
}
```

#### `PaginationProps`

Props for the Pagination component (page navigation with current page, total, page size, and change callbacks).

```typescript
interface PaginationProps extends BaseProps {
    /**
     * Current page (1-indexed).
     */
    page: number;
    /**
     * Total number of pages.
     */
    totalPages: number;
    /**
     * Page change handler.
     */
    onChange: (page: number) => void;
    /**
     * Number of sibling pages to show.
     */
    siblings?: number;
    /**
     * Number of boundary pages to show.
     */
    boundaries?: number;
    /**
     * Pagination size.
     */
    size?: Size;
    /**
     * Whether to show first/last buttons.
     */
    showFirstLast?: boolean;
    /**
     * Whether to show previous/next buttons.
     */
    showPrevNext?: boolean;
    /**
     * Accessible labels for pagination controls.
     */
    labels?: {
        nav?: string;
        first?: string;
        previous?: string;
        next?: string;
        last?: string;
        goToPage?: (page: number) => string;
    };
}
```

#### `ProgressClassOptions`

Options for generating progress classes.

```typescript
interface ProgressClassOptions {
  size?: Size
  color?: ColorVariant
  indeterminate?: boolean
  className?: string
}
```

#### `RadioClassOptions`

Options for generating radio classes.

```typescript
interface RadioClassOptions {
  error?: string
  className?: string
}
```

#### `RadioGroupProps`

Props for the RadioGroup component.

```typescript
interface RadioGroupProps<T = string> extends BaseProps {
    /**
     * Radio options.
     */
    options: RadioOption<T>[];
    /**
     * Current value.
     */
    value?: T;
    /**
     * Change handler.
     */
    onChange?: (value: T) => void;
    /**
     * Radio size.
     */
    size?: Size;
    /**
     * Group label.
     */
    label?: string;
    /**
     * Layout direction.
     */
    direction?: 'horizontal' | 'vertical';
    /**
     * Error message.
     */
    error?: string;
}
```

#### `RadioOption`

A single option in a RadioGroup.

```typescript
interface RadioOption<T = string> {
    /**
     * Option value.
     */
    value: T;
    /**
     * Display label.
     */
    label: Children;
    /**
     * Whether the option is disabled.
     */
    disabled?: boolean;
}
```

#### `SelectClassOptions`

Options for generating select classes.

```typescript
interface SelectClassOptions {
  size?: Size
  error?: string
  required?: boolean
  className?: string
}
```

#### `SelectElementProps`

Base props for select elements.

```typescript
interface SelectElementProps extends HTMLElementProps {
    name?: string;
    required?: boolean;
    autoFocus?: boolean;
    multiple?: boolean;
    onChange?: ChangeEventHandler;
}
```

#### `SelectOption`

A single option in a Select dropdown.

```typescript
interface SelectOption<T = string> {
    /**
     * Option value.
     */
    value: T;
    /**
     * Display label.
     */
    label: string;
    /**
     * Whether the option is disabled.
     */
    disabled?: boolean;
    /**
     * Option group (for grouped selects).
     */
    group?: string;
}
```

#### `SelectProps`

Props for the Select dropdown component (single or multi-select).

```typescript
interface SelectProps<T = string> extends SelectElementProps {
    /**
     * Select options.
     */
    options: SelectOption<T>[];
    /**
     * Current value.
     */
    value?: T;
    /**
     * Change handler (with typed value).
     */
    onValueChange?: (value: T) => void;
    /**
     * Select size.
     */
    size?: Size;
    /**
     * Label text.
     */
    label?: string;
    /**
     * Placeholder text.
     */
    placeholder?: string;
    /**
     * Error message.
     */
    error?: string;
    /**
     * Hint/help text.
     */
    hint?: string;
    /**
     * Whether to allow clearing the selection.
     */
    clearable?: boolean;
}
```

#### `SeparatorClassOptions`

Options for generating separator classes.

```typescript
interface SeparatorClassOptions {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}
```

#### `SeparatorProps`

Props for the Separator/Divider component.

```typescript
interface SeparatorProps extends BaseProps {
    /**
     * Separator orientation.
     */
    orientation?: 'horizontal' | 'vertical';
    /**
     * Whether the separator is decorative only.
     */
    decorative?: boolean;
}
```

#### `SkeletonClassOptions`

Options for generating skeleton classes.

```typescript
interface SkeletonClassOptions {
  circle?: boolean
  animation?: 'pulse' | 'wave' | 'none'
  className?: string
}
```

#### `SkeletonProps`

Props for the Skeleton loading placeholder component.

```typescript
interface SkeletonProps extends BaseProps {
    /**
     * Skeleton width.
     */
    width?: string | number;
    /**
     * Skeleton height.
     */
    height?: string | number;
    /**
     * Whether the skeleton is circular.
     */
    circle?: boolean;
    /**
     * Border radius.
     */
    borderRadius?: string | number;
    /**
     * Animation type.
     */
    animation?: 'pulse' | 'wave' | 'none';
}
```

#### `SpacerClassOptions`

Options for generating spacer classes.

```typescript
interface SpacerClassOptions {
  size?: Size | string | number
  horizontal?: boolean
  className?: string
}
```

#### `SpacerProps`

Props for the Spacer layout component (adds whitespace between elements).

```typescript
interface SpacerProps extends BaseProps {
    /**
     * Space size.
     */
    size?: Size | string | number;
    /**
     * Whether the spacer is horizontal.
     */
    horizontal?: boolean;
}
```

#### `SpinnerClassOptions`

Options for generating spinner classes.

```typescript
interface SpinnerClassOptions {
  size?: Size
  color?: ColorVariant | string
  className?: string
}
```

#### `SpinnerProps`

Props for the Spinner/loading indicator component.

```typescript
interface SpinnerProps extends BaseProps {
    /**
     * Spinner size.
     */
    size?: Size;
    /**
     * Spinner color.
     */
    color?: ColorVariant | string;
    /**
     * Loading label (for accessibility).
     */
    label?: string;
    /**
     * Spinner thickness.
     */
    thickness?: number;
}
```

#### `SwitchClassOptions`

Options for generating switch classes.

```typescript
interface SwitchClassOptions {
  size?: Size
  checked?: boolean
  disabled?: boolean
  className?: string
}
```

#### `SwitchProps`

Props for the Switch/Toggle component.

```typescript
interface SwitchProps extends InputElementProps {
    /**
     * Switch label.
     */
    label?: Children;
    /**
     * Whether the switch is on.
     */
    checked?: boolean;
    /**
     * Switch size.
     */
    size?: Size;
    /**
     * Color when on.
     */
    color?: ColorVariant;
}
```

#### `TabItem`

A single tab in a Tabs component.

```typescript
interface TabItem<T = string> {
    /**
     * Tab value/id.
     */
    value: T;
    /**
     * Tab label.
     */
    label: Children;
    /**
     * Tab content.
     */
    content?: Children;
    /**
     * Whether the tab is disabled.
     */
    disabled?: boolean;
    /**
     * Icon to display.
     */
    icon?: Children;
}
```

#### `TableClassOptions`

Options for generating table classes.

```typescript
interface TableClassOptions {
  bordered?: boolean
  className?: string
}
```

#### `TableColumn`

Table column definition.

```typescript
interface TableColumn<T> {
    /**
     * Column key (data property).
     */
    key: keyof T | string;
    /**
     * Column header.
     */
    header: Children;
    /**
     * Custom cell renderer.
     */
    render?: (value: unknown, row: T, index: number) => Children;
    /**
     * Column width.
     */
    width?: string | number;
    /**
     * Whether the column is sortable.
     */
    sortable?: boolean;
    /**
     * Text alignment.
     */
    align?: 'left' | 'center' | 'right';
}
```

#### `TableProps`

Props for the Table component.

```typescript
interface TableProps<T> extends HTMLElementProps {
    /**
     * Table data.
     */
    data: T[];
    /**
     * Column definitions.
     */
    columns: TableColumn<T>[];
    /**
     * Row key extractor.
     */
    rowKey?: keyof T | ((row: T) => string | number);
    /**
     * Whether to show borders.
     */
    bordered?: boolean;
    /**
     * Whether rows are striped.
     */
    striped?: boolean;
    /**
     * Whether rows are hoverable.
     */
    hoverable?: boolean;
    /**
     * Table size.
     */
    size?: Size;
    /**
     * Empty state content.
     */
    emptyContent?: Children;
    /**
     * Loading state.
     */
    loading?: boolean;
    /**
     * Sort configuration.
     */
    sort?: {
        key: string;
        direction: 'asc' | 'desc';
    };
    /**
     * Sort change handler.
     */
    onSort?: (key: string, direction: 'asc' | 'desc') => void;
    /**
     * Row click handler.
     */
    onRowClick?: (row: T, index: number) => void;
}
```

#### `TabsListClassOptions`

Options for generating tabs list classes.

```typescript
interface TabsListClassOptions {
  fitted?: boolean
  className?: string
}
```

#### `TabsProps`

Props for the Tabs component (switchable tabbed content panels).

```typescript
interface TabsProps<T = string> extends BaseProps {
    /**
     * Tab items.
     */
    items: TabItem<T>[];
    /**
     * Current active tab.
     */
    value?: T;
    /**
     * Default active tab.
     */
    defaultValue?: T;
    /**
     * Change handler.
     */
    onChange?: (value: T) => void;
    /**
     * Tab variant.
     */
    variant?: 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded';
    /**
     * Tab size.
     */
    size?: Size;
    /**
     * Whether tabs are fitted (take full width).
     */
    fitted?: boolean;
}
```

#### `TextareaClassOptions`

Options for generating textarea classes.

```typescript
interface TextareaClassOptions {
  error?: string
  required?: boolean
  className?: string
}
```

#### `TextareaElementProps`

Base props for textarea elements.

```typescript
interface TextareaElementProps extends HTMLElementProps {
    name?: string;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    required?: boolean;
    readOnly?: boolean;
    autoFocus?: boolean;
    rows?: number;
    cols?: number;
    maxLength?: number;
    minLength?: number;
    wrap?: 'hard' | 'soft' | 'off';
    onChange?: ChangeEventHandler;
    onInput?: FormEventHandler;
}
```

#### `TextareaProps`

Props for the Textarea component.

```typescript
interface TextareaProps extends TextareaElementProps {
    /**
     * Label text.
     */
    label?: string;
    /**
     * Error message.
     */
    error?: string;
    /**
     * Hint/help text.
     */
    hint?: string;
    /**
     * Whether the textarea auto-resizes.
     */
    autoResize?: boolean;
    /**
     * Minimum number of rows.
     */
    minRows?: number;
    /**
     * Maximum number of rows.
     */
    maxRows?: number;
}
```

#### `ToastClassOptions`

Options for generating toast classes.

```typescript
interface ToastClassOptions {
  status?: ColorVariant
  className?: string
}
```

#### `ToastData`

Toast data interface for programmatic toast management.

```typescript
interface ToastData {
  id: string
  title?: string
  description?: string
  status?: ColorVariant
  duration?: number
  dismissible?: boolean
}
```

#### `ToastProps`

Props for the Toast/notification component.

```typescript
interface ToastProps extends HTMLElementProps {
    /**
     * Toast content.
     */
    children?: Children;
    /**
     * Toast title.
     */
    title?: string;
    /**
     * Toast description.
     */
    description?: string;
    /**
     * Toast status/type.
     */
    status?: ColorVariant;
    /**
     * Duration in milliseconds (0 for persistent).
     */
    duration?: number;
    /**
     * Whether the toast is dismissible.
     */
    dismissible?: boolean;
    /**
     * Called when dismissed.
     */
    onDismiss?: () => void;
    /**
     * Toast position.
     */
    position?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left';
    /**
     * Accessible label for the close button.
     * @default 'Close'
     */
    closeLabel?: string;
}
```

#### `TooltipClassOptions`

Options for generating tooltip classes.

```typescript
interface TooltipClassOptions {
  className?: string
}
```

#### `TooltipPosition`

Absolute top/left pixel position for a tooltip element.

```typescript
interface TooltipPosition {
  top: number
  left: number
}
```

#### `TooltipProps`

Props for the Tooltip component (hover/focus popover with informational text).

```typescript
interface TooltipProps extends HTMLElementProps {
    /**
     * Tooltip content.
     */
    content: Children;
    /**
     * Element that triggers the tooltip.
     */
    children: Children;
    /**
     * Tooltip placement.
     */
    placement?: TooltipPlacement;
    /**
     * Delay before showing (ms).
     */
    delay?: number;
    /**
     * Whether the tooltip has an arrow.
     */
    hasArrow?: boolean;
}
```

### Types

#### `ButtonVariant`

Button visual variant styles.

```typescript
type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';
```

#### `ChangeEventHandler`

Framework-agnostic change event handler.

```typescript
type ChangeEventHandler = EventHandler<Event>;
```

#### `Children`

Framework-agnostic child content.
Use `unknown` to allow any framework's node type (ReactNode, VNode, etc.).

```typescript
type Children = unknown;
```

#### `ColorVariant`

Semantic color variants used across components for status indication.

```typescript
type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
```

#### `DropdownAlign`

Dropdown alignment type.

```typescript
type DropdownAlign = 'start' | 'center' | 'end'
```

#### `DropdownPlacement`

Dropdown placement type.

```typescript
type DropdownPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'right'
```

#### `EventHandler`

Framework-agnostic event handler.

```typescript
type EventHandler<E = Event> = (event: E) => void;
```

#### `FocusEventHandler`

Framework-agnostic focus event handler.

```typescript
type FocusEventHandler = EventHandler<FocusEvent>;
```

#### `FormEventHandler`

Framework-agnostic form event handler.

```typescript
type FormEventHandler = EventHandler<Event>;
```

#### `InputType`

Allowed HTML input type attribute values for the Input component.

```typescript
type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time' | 'datetime-local';
```

#### `KeyboardEventHandler`

Framework-agnostic keyboard event handler.

```typescript
type KeyboardEventHandler = EventHandler<KeyboardEvent>;
```

#### `ModalSize`

Modal size variants including full-screen.

```typescript
type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
```

#### `MouseEventHandler`

Framework-agnostic mouse event handler.

```typescript
type MouseEventHandler = EventHandler<MouseEvent>;
```

#### `Size`

Standard size scale used across all molecule UI components (buttons, inputs, badges, etc.).

```typescript
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
```

#### `ToastPosition`

Toast position type.

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
type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
```

### Functions

#### `calculateDropdownPosition(triggerRect, menuRect, placement, align, offset)`

Calculate dropdown menu position based on trigger element and placement.

```typescript
function calculateDropdownPosition(triggerRect: DOMRect, menuRect: DOMRect, placement: DropdownPlacement, align?: DropdownAlign, offset?: number): DropdownPosition
```

- `triggerRect` — The bounding rect of the trigger element.
- `menuRect` — The bounding rect of the menu element.
- `placement` — The desired placement of the dropdown.
- `align` — The alignment within the placement axis.
- `offset` — The pixel offset from the trigger element.

**Returns:** The calculated absolute position for the dropdown.

#### `calculateTooltipPosition(triggerRect, tooltipRect, placement, offset)`

Calculate tooltip position based on trigger and tooltip element rects.

```typescript
function calculateTooltipPosition(triggerRect: DOMRect, tooltipRect: DOMRect, placement: TooltipPlacement, offset?: number): TooltipPosition
```

- `triggerRect` — The bounding rect of the trigger element.
- `tooltipRect` — The bounding rect of the tooltip element.
- `placement` — The desired tooltip placement.
- `offset` — The pixel offset from the trigger element.

**Returns:** The calculated absolute position for the tooltip.

#### `cn(inputs)`

Merge class names, filtering out falsy values.

Use this in Svelte components to conditionally combine classes:
```svelte
<script>
  import { cn } from '`@molecule/app-ui-svelte`'
  export let variant = 'solid'
  export let className = ''
  $: classes = cn('base-class', variant === 'solid' && 'solid-variant', className)
</script>
<button class={classes}><slot /></button>
```

```typescript
function cn(inputs?: (string | false | null | undefined)[]): string
```

- `inputs` — Class name strings, or falsy values to be filtered out.

**Returns:** A single space-separated class string with falsy values removed.

#### `createToastHelpers()`

Create a toast store helper for Svelte stores.
Returns functions for managing toast state in a Svelte writable store.

```typescript
function createToastHelpers(): { getToasts(): ToastData[]; addToast(toast: Omit<ToastData, "id">): string; removeToast(id: string): void; }
```

**Returns:** An object with getToasts, addToast, and removeToast methods.

#### `generatePaginationRange(currentPage, totalPages, siblings, boundaries)`

Generate a pagination range with page numbers and 'ellipsis' markers.
Used by pagination components to render page navigation controls.

```typescript
function generatePaginationRange(currentPage: number, totalPages: number, siblings: number, boundaries: number): (number | "ellipsis")[]
```

- `currentPage` — The currently active page number (1-indexed).
- `totalPages` — The total number of pages.
- `siblings` — Number of sibling pages to show on each side of the current page.
- `boundaries` — Number of pages to always show at the start and end.

**Returns:** Array of page numbers and 'ellipsis' string markers.

#### `generateToastId()`

Generates toast id.

```typescript
function generateToastId(): string
```

**Returns:** The created instance.

#### `getAccordionChevronClass()`

Chevron icon class for accordion triggers.

```typescript
function getAccordionChevronClass(): string
```

**Returns:** The accordion chevron class string.

#### `getAccordionChevronIconData()`

Get icon data for the accordion chevron.

```typescript
function getAccordionChevronIconData(): IconData
```

**Returns:** Icon data for a downward chevron from the current icon set

#### `getAccordionClasses(options)`

Generate classes for the accordion container.

Usage in Svelte:
```svelte
<script>
  import {
    getAccordionClasses, getAccordionItemClass,
    getAccordionTriggerClasses, getAccordionContentClass, getAccordionContentInnerClass,
  } from '`@molecule/app-ui-svelte`'
  export let items = []
  let expandedItems = []
  $: containerClass = getAccordionClasses()
</script>
<div class={containerClass}>
  {#each items as item}
    <div class={getAccordionItemClass()} data-state={expandedItems.includes(item.value) ? 'open' : 'closed'}>
      <button class={getAccordionTriggerClasses()} data-state={...} on:click={() => toggle(item.value)}>
        {item.header}
        <svg class={cm.accordionChevron}>...</svg>
      </button>
      {#if expandedItems.includes(item.value)}
        <div class={getAccordionContentClass()}>
          <div class={getAccordionContentInnerClass()}>{item.content}</div>
        </div>
      {/if}
    </div>
  {/each}
</div>
```

```typescript
function getAccordionClasses(options?: AccordionClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getAccordionContentClass()`

Get the accordion content wrapper class string.

```typescript
function getAccordionContentClass(): string
```

**Returns:** The accordion content wrapper class string.

#### `getAccordionContentInnerClass()`

Get the accordion content inner padding class string.

```typescript
function getAccordionContentInnerClass(): string
```

**Returns:** The accordion content inner padding class string.

#### `getAccordionItemClass()`

Get the accordion item class string.

```typescript
function getAccordionItemClass(): string
```

**Returns:** The accordion item class string.

#### `getAccordionTriggerClasses(className)`

Generate classes for an accordion trigger button.

```typescript
function getAccordionTriggerClasses(className?: string): string
```

- `className` — Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getAlertClasses(options)`

Generate classes for an alert container.

Usage in Svelte:
```svelte
<script>
  import { getAlertClasses, getAlertTitleClass, getAlertDescriptionClass } from '`@molecule/app-ui-svelte`'
  export let status = 'info'
  $: classes = getAlertClasses({ status })
</script>
<div role="alert" class={classes}>
  {#if title}<h5 class={getAlertTitleClass()}>{title}</h5>{/if}
  <div class={getAlertDescriptionClass()}><slot /></div>
</div>
```

```typescript
function getAlertClasses(options?: AlertClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getAlertContentClass()`

Content wrapper class.

```typescript
function getAlertContentClass(): string
```

**Returns:** The resulting string.

#### `getAlertDescriptionClass()`

Get the alert description class string.

```typescript
function getAlertDescriptionClass(): string
```

**Returns:** The alert description class string.

#### `getAlertDismissClass()`

Dismiss button class.

```typescript
function getAlertDismissClass(): string
```

**Returns:** The alert dismiss button class string.

#### `getAlertIconData(status)`

Get icon data for an alert status.

```typescript
function getAlertIconData(status: string): IconData | null
```

- `status` — Alert status variant (info, success, warning, error)

**Returns:** Icon data from the current icon set, or null if status is unknown

#### `getAlertIconWrapperClass()`

Icon container class.

```typescript
function getAlertIconWrapperClass(): string
```

**Returns:** The resulting string.

#### `getAlertTitleClass()`

Get the alert title class string.

```typescript
function getAlertTitleClass(): string
```

**Returns:** The alert title class string.

#### `getAvatarClasses(options)`

Generate classes for the avatar container.

Usage in Svelte:
```svelte
<script>
  import { getAvatarClasses, getAvatarImageClass, getAvatarFallbackClass, getAvatarCustomSize } from '`@molecule/app-ui-svelte`'
  import { getInitials } from '`@molecule/app-ui-svelte`'
  import { t } from '`@molecule/app-i18n`'
  export let src = ''
  export let name = ''
  export let size = 'md'
  $: classes = getAvatarClasses({ size })
  $: customSize = getAvatarCustomSize(size)
  $: initials = name ? getInitials(name) : ''
</script>
<div class={classes} style={customSize}>
  {#if src}
    <img {src} alt={alt || name || t('ui.avatar.alt')} class={getAvatarImageClass()} />
  {:else}
    <div class={getAvatarFallbackClass()}>
      {#if name}<span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{initials}</span>{/if}
    </div>
  {/if}
</div>
```

```typescript
function getAvatarClasses(options?: AvatarClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getAvatarCustomSize(size)`

Get inline style for custom (numeric) avatar size.
Returns undefined if size is a named Size.

```typescript
function getAvatarCustomSize(size: number | Size): Record<string, string> | undefined
```

- `size` — The avatar size value (named or numeric).

**Returns:** An inline style object, or undefined for named sizes.

#### `getAvatarFallbackClass()`

Get the avatar fallback class string.

```typescript
function getAvatarFallbackClass(): string
```

**Returns:** The resulting string.

#### `getAvatarFallbackIconClass()`

Avatar fallback icon class.

```typescript
function getAvatarFallbackIconClass(): string
```

**Returns:** The avatar fallback icon class string.

#### `getAvatarImageClass()`

Get the avatar image class string.

```typescript
function getAvatarImageClass(): string
```

**Returns:** The avatar image class string.

#### `getAvatarInitialsClass()`

Avatar initials text class.

```typescript
function getAvatarInitialsClass(): string
```

**Returns:** The avatar initials class string.

#### `getBadgeClasses(options)`

Generate classes for a badge element.

Usage in Svelte:
```svelte
<script>
  import { getBadgeClasses } from '`@molecule/app-ui-svelte`'
  export let color = 'primary'
  export let variant = 'solid'
  $: classes = getBadgeClasses({ color, variant })
</script>
<span class={classes}><slot /></span>
```

```typescript
function getBadgeClasses(options?: BadgeClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getButtonClasses(options)`

Generate classes for a button component.

Usage in Svelte:
```svelte
<script>
  import { getButtonClasses } from '`@molecule/app-ui-svelte`'
  export let variant = 'solid'
  export let color = 'primary'
  export let size = 'md'
  export let fullWidth = false
  $: classes = getButtonClasses({ variant, color, size, fullWidth })
</script>
<button class={classes} on:click><slot /></button>
```

```typescript
function getButtonClasses(options?: ButtonClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getCardClasses(options)`

Generate classes for a card container.

Usage in Svelte:
```svelte
<script>
  import { getCardClasses, getCardHeaderClass, getCardTitleClass, getCardContentClass, getCardFooterClass } from '`@molecule/app-ui-svelte`'
  export let variant = 'elevated'
  export let padding = 'md'
  export let interactive = false
  $: classes = getCardClasses({ variant, padding, interactive })
</script>
<div class={classes} role={interactive ? 'button' : undefined} tabindex={interactive ? 0 : undefined}>
  <slot />
</div>
```

```typescript
function getCardClasses(options?: CardClassOptions): string
```

- `options` — The options.

**Returns:** The resulting class string.

#### `getCardContentClass()`

Get the card content class string.

```typescript
function getCardContentClass(): string
```

**Returns:** The card content class string.

#### `getCardDescriptionClass()`

Get the card description class string.

```typescript
function getCardDescriptionClass(): string
```

**Returns:** The card description class string.

#### `getCardFooterClass()`

Get the card footer class string.

```typescript
function getCardFooterClass(): string
```

**Returns:** The resulting string.

#### `getCardHeaderClass()`

Get the card header class string.

```typescript
function getCardHeaderClass(): string
```

**Returns:** The card header class string.

#### `getCardPaddingMap()`

Gets the card padding map.

```typescript
function getCardPaddingMap(): Record<Size | "none", string>
```

**Returns:** The result.

#### `getCardTitleClass()`

Get the card title class string.

```typescript
function getCardTitleClass(): string
```

**Returns:** The card title class string.

#### `getCheckboxClasses(options)`

Generate classes for a checkbox input element.

Usage in Svelte:
```svelte
<script>
  import { getCheckboxClasses, checkboxLabelWrapperClass } from '`@molecule/app-ui-svelte`'
  export let error = ''
  export let checked = false
  $: classes = getCheckboxClasses({ error })
</script>
<label class={checkboxLabelWrapperClass}>
  <input type="checkbox" bind:checked class={classes} data-state={checked ? 'checked' : 'unchecked'} />
  <span class={cm.textSize('sm')}>{label}</span>
</label>
```

```typescript
function getCheckboxClasses(options?: CheckboxClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getCheckboxErrorClass(className)`

Error message class.

```typescript
function getCheckboxErrorClass(className?: string): string
```

- `className` — Optional CSS class name to append.

**Returns:** The checkbox error class string.

#### `getCheckboxLabelTextClass(disabled)`

Class for the checkbox label text.

```typescript
function getCheckboxLabelTextClass(disabled?: boolean): string
```

- `disabled` — Whether the checkbox is disabled.

**Returns:** The checkbox label text class string.

#### `getCheckboxLabelWrapperClass()`

Wrapper class for the checkbox + label combination.

```typescript
function getCheckboxLabelWrapperClass(): string
```

**Returns:** The checkbox label wrapper class string.

#### `getContainerClasses(options)`

Generate classes for a container element.

Usage in Svelte:
```svelte
<script>
  import { getContainerClasses, getContainerCustomStyle } from '`@molecule/app-ui-svelte`'
  export let maxWidth = 'lg'
  export let centered = true
  $: classes = getContainerClasses({ maxWidth, centered })
  $: customStyle = getContainerCustomStyle(maxWidth)
</script>
<div class={classes} style={customStyle}>
  <slot />
</div>
```

```typescript
function getContainerClasses(options?: ContainerClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getContainerCustomStyle(maxWidth)`

Get inline style for custom max-width values.
Returns undefined if maxWidth is a standard named value.

```typescript
function getContainerCustomStyle(maxWidth: string): Record<string, string> | undefined
```

- `maxWidth` — The max-width value to evaluate.

**Returns:** An inline style object, or undefined for standard sizes.

#### `getDropdownContentClasses(options)`

Generate classes for the dropdown menu content container.

Usage in Svelte:
```svelte
<script>
  import {
    getDropdownContentClasses, getDropdownItemClasses, getDropdownSeparatorClass,
    calculateDropdownPosition, dropdownTriggerClass,
  } from '`@molecule/app-ui-svelte`'
  export let items = []
  export let placement = 'bottom-start'
  let open = false
  let triggerEl, menuEl
  let position = { top: 0, left: 0 }
  $: contentClass = getDropdownContentClasses()
</script>
<div bind:this={triggerEl} class={dropdownTriggerClass} on:click={() => open = !open}>
  <slot name="trigger" />
</div>
{#if open}
  <div bind:this={menuEl} role="menu" data-state="open" class={contentClass}
    style="position:absolute;top:{position.top}px;left:{position.left}px;z-index:50;">
    {#each items as item}
      {#if item.separator}
        <div class={getDropdownSeparatorClass()} role="separator" />
      {:else}
        <div role="menuitem" class={getDropdownItemClasses({ disabled: item.disabled })} on:click={() => onSelect(item.value)}>
          {item.label}
        </div>
      {/if}
    {/each}
  </div>
{/if}
```

```typescript
function getDropdownContentClasses(options?: DropdownContentClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getDropdownItemClasses(options, options, options)`

Generate classes for a dropdown menu item.

```typescript
function getDropdownItemClasses(options?: { disabled?: boolean; className?: string; }): string
```

- `options` — The options.
- `options` — .disabled - Whether the item is disabled.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getDropdownItemIconClass()`

Dropdown item icon container class.

```typescript
function getDropdownItemIconClass(): string
```

**Returns:** The dropdown item icon class string.

#### `getDropdownItemLabelClass()`

Dropdown item label class.

```typescript
function getDropdownItemLabelClass(): string
```

**Returns:** The dropdown item label class string.

#### `getDropdownItemShortcutClass()`

Dropdown item shortcut class.

```typescript
function getDropdownItemShortcutClass(): string
```

**Returns:** The resulting string.

#### `getDropdownLabelClass()`

Get the dropdown label class string.

```typescript
function getDropdownLabelClass(): string
```

**Returns:** The dropdown label class string.

#### `getDropdownSeparatorClass()`

Get the dropdown separator class string.

```typescript
function getDropdownSeparatorClass(): string
```

**Returns:** The dropdown separator class string.

#### `getDropdownTriggerClass()`

Dropdown trigger wrapper class.

```typescript
function getDropdownTriggerClass(): string
```

**Returns:** The dropdown trigger class string.

#### `getFlexClasses(options)`

Generate classes for a flex container.

Usage in Svelte:
```svelte
<script>
  import { getFlexClasses, getFlexGapStyle } from '`@molecule/app-ui-svelte`'
  export let direction = 'row'
  export let justify = undefined
  export let align = undefined
  export let gap = undefined
  $: classes = getFlexClasses({ direction, justify, align, gap })
  $: gapStyle = getFlexGapStyle(gap)
</script>
<div class={classes} style={gapStyle}>
  <slot />
</div>
```

```typescript
function getFlexClasses(options?: FlexClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getFlexGapStyle(gap)`

Gets the flex gap style.

```typescript
function getFlexGapStyle(gap?: string | number): Record<string, string> | undefined
```

- `gap` — The gap.

**Returns:** The result.

#### `getFormErrorClass()`

Get the form error message class string.

```typescript
function getFormErrorClass(): string
```

**Returns:** The form error class string.

#### `getFormFieldClasses(options)`

Generate classes for a form field wrapper.

Usage in Svelte:
```svelte
<script>
  import { getFormFieldClasses, getFormLabelClasses, getFormErrorClass, getFormHintClass } from '`@molecule/app-ui-svelte`'
</script>
<form on:submit|preventDefault={handleSubmit}>
  <fieldset disabled={submitting} class="contents">
    <div class={getFormFieldClasses()}>
      <label for={name} class={getFormLabelClasses({ required })}>{label}</label>
      <slot />
      {#if error}<p class={getFormErrorClass()}>{error}</p>{/if}
      {#if hint && !error}<p class={getFormHintClass()}>{hint}</p>{/if}
    </div>
  </fieldset>
</form>
```

```typescript
function getFormFieldClasses(options?: FormFieldClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getFormFieldsetClass()`

Form fieldset class (for disabled state wrapping).

```typescript
function getFormFieldsetClass(): string
```

**Returns:** The form fieldset class string.

#### `getFormHintClass()`

Get the form hint message class string.

```typescript
function getFormHintClass(): string
```

**Returns:** The resulting string.

#### `getFormLabelClasses(options, options, options)`

Generate classes for a form label.

```typescript
function getFormLabelClasses(options?: { required?: boolean; className?: string; }): string
```

- `options` — The options.
- `options` — .required - Whether the field is required.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getGridClasses(options)`

Generate classes for a grid container.

Usage in Svelte:
```svelte
<script>
  import { getGridClasses, getGridStyle } from '`@molecule/app-ui-svelte`'
  export let columns = 3
  export let gap = 'md'
  $: classes = getGridClasses({ columns, gap })
  $: style = getGridStyle({ columns, gap })
</script>
<div class={classes} style={style}>
  <slot />
</div>
```

```typescript
function getGridClasses(options?: GridClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getGridStyle(options)`

Generate inline style for a grid container.
Handles custom column/row templates and non-standard gap values.

```typescript
function getGridStyle(options?: GridClassOptions): string
```

- `options` — The grid style options.

**Returns:** The inline style string.

#### `getIconData(name)`

Gets icon data by name from the current icon set.

```typescript
function getIconData(name: string): IconData
```

- `name` — Icon name

**Returns:** Icon data for SVG rendering in Svelte templates

#### `getInitials(name)`

Gets up to two uppercase initials from a name string.
Used by the avatar component for fallback display.

```typescript
function getInitials(name: string): string
```

- `name` — A full name to extract initials from (e.g. "John Doe").

**Returns:** The uppercase initials, at most two characters (e.g. "JD").

#### `getInputClasses(options)`

Generate classes for an input element.

Usage in Svelte:
```svelte
<script>
  import { getInputClasses } from '`@molecule/app-ui-svelte`'
  export let size = 'md'
  export let error = ''
  $: classes = getInputClasses({ size, error })
</script>
<input class={classes} />
```

```typescript
function getInputClasses(options?: InputClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getInputClearButtonClass()`

Clear button class.

```typescript
function getInputClearButtonClass(): string
```

**Returns:** The input clear button class string.

#### `getInputErrorClass()`

Get the error message class string.

```typescript
function getInputErrorClass(): string
```

**Returns:** The resulting string.

#### `getInputHintClass()`

Get the hint message class string.

```typescript
function getInputHintClass(): string
```

**Returns:** The input hint class string.

#### `getInputInnerClass()`

Input relative container class (for left/right element positioning).

```typescript
function getInputInnerClass(): string
```

**Returns:** The input inner class string.

#### `getInputLabelClasses(options, options, options)`

Generate classes for an input label.

```typescript
function getInputLabelClasses(options?: { required?: boolean; className?: string; }): string
```

- `options` — The options.
- `options` — .required - Whether the field is required.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getInputLeftElementClass()`

Left element container class.

```typescript
function getInputLeftElementClass(): string
```

**Returns:** The input left element class string.

#### `getInputRightElementClass()`

Right element container class.

```typescript
function getInputRightElementClass(): string
```

**Returns:** The input right element class string.

#### `getInputWrapperClass()`

Input wrapper class.

```typescript
function getInputWrapperClass(): string
```

**Returns:** The input wrapper class string.

#### `getModalBodyClass()`

Get the modal body class string.

```typescript
function getModalBodyClass(): string
```

**Returns:** The modal body class string.

#### `getModalCloseClass()`

Get the modal close button class string.

```typescript
function getModalCloseClass(): string
```

**Returns:** The modal close button class string.

#### `getModalContentClasses(options)`

Generate classes for the modal content container.

Usage in Svelte:
```svelte
<script>
  import { getModalContentClasses, getModalOverlayClass, getModalWrapperClass, getModalHeaderClass, getModalTitleClass, getModalCloseClass, getModalBodyClass } from '`@molecule/app-ui-svelte`'
  export let open = false
  export let size = 'md'
  $: contentClass = getModalContentClasses({ size })
</script>
{#if open}
  <div class={getModalOverlayClass()} aria-hidden="true"></div>
  <div class={getModalWrapperClass()} on:click={onOverlayClick}>
    <div role="dialog" aria-modal="true" class={contentClass} on:click|stopPropagation>
      <div class={getModalHeaderClass()}>
        <h2 class={getModalTitleClass()}>{title}</h2>
        <button class={getModalCloseClass()} on:click={onClose}>X</button>
      </div>
      <div class={getModalBodyClass()}><slot /></div>
    </div>
  </div>
{/if}
```

```typescript
function getModalContentClasses(options?: ModalClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getModalDescriptionClass()`

Get the modal description class string.

```typescript
function getModalDescriptionClass(): string
```

**Returns:** The resulting string.

#### `getModalFooterClass()`

Get the modal footer class string.

```typescript
function getModalFooterClass(): string
```

**Returns:** The modal footer class string.

#### `getModalHeaderClass()`

Get the modal header class string.

```typescript
function getModalHeaderClass(): string
```

**Returns:** The modal header class string.

#### `getModalOverlayClass()`

Get the modal overlay class string.

```typescript
function getModalOverlayClass(): string
```

**Returns:** The modal overlay class string.

#### `getModalTitleClass()`

Get the modal title class string.

```typescript
function getModalTitleClass(): string
```

**Returns:** The resulting string.

#### `getModalWrapperClass()`

Get the modal centering wrapper class string.

```typescript
function getModalWrapperClass(): string
```

**Returns:** The modal wrapper class string.

#### `getPaginationClasses(options)`

Generate classes for the pagination nav container.

Usage in Svelte:
```svelte
<script>
  import {
    getPaginationClasses, getPaginationContentClass, getPaginationItemClasses,
    getPaginationEllipsisClass, generatePaginationRange,
  } from '`@molecule/app-ui-svelte`'
  import { t } from '`@molecule/app-i18n`'
  export let page = 1
  export let totalPages = 10
  export let siblings = 1
  export let boundaries = 1
  $: range = generatePaginationRange(page, totalPages, siblings, boundaries)
  $: navClass = getPaginationClasses()
</script>
<nav role="navigation" aria-label={t('ui.pagination.nav')} class={navClass}>
  <ul class={getPaginationContentClass()}>
    {#each range as item}
      {#if item === 'ellipsis'}
        <li><span class={getPaginationEllipsisClass()}>...</span></li>
      {:else}
        <li>
          <button class={getPaginationItemClasses({ active: item === page, size })} on:click={() => onChange(item)}>
            {item}
          </button>
        </li>
      {/if}
    {/each}
  </ul>
</nav>
```

```typescript
function getPaginationClasses(options?: PaginationClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getPaginationContentClass()`

Get the pagination content (ul) class string.

```typescript
function getPaginationContentClass(): string
```

**Returns:** The pagination content class string.

#### `getPaginationEllipsisClass()`

Get the pagination ellipsis class string.

```typescript
function getPaginationEllipsisClass(): string
```

**Returns:** The pagination ellipsis class string.

#### `getPaginationIconData(direction)`

Get icon data for a pagination navigation direction.

```typescript
function getPaginationIconData(direction: string): IconData
```

- `direction` — Navigation direction (first, prev, next, last, ellipsis)

**Returns:** Icon data from the current icon set

#### `getPaginationItemClasses(options, options, options, options)`

Generate classes for a pagination button item.

```typescript
function getPaginationItemClasses(options?: { active?: boolean; size?: Size; className?: string; }): string
```

- `options` — The options.
- `options` — .active - Whether the item is currently active.
- `options` — .size - The size of the pagination item.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getProgressClasses(options)`

Generate classes for the progress bar track.

Usage in Svelte:
```svelte
<script>
  import { getProgressClasses, getProgressIndicatorClasses, getProgressPercentage } from '`@molecule/app-ui-svelte`'
  export let value = 0
  export let max = 100
  export let size = 'md'
  export let color = 'primary'
  $: percentage = getProgressPercentage(value, max)
  $: trackClass = getProgressClasses({ size })
  $: indicatorClass = getProgressIndicatorClasses({ color })
</script>
<div class={cm.w('full')}>
  <div class={trackClass} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
    <div class={indicatorClass} style="transform: translateX(-{100 - percentage}%)" />
  </div>
</div>
```

```typescript
function getProgressClasses(options?: ProgressClassOptions): string
```

- `options` — The options.

**Returns:** The resulting class string.

#### `getProgressIndicatorClasses(options, options, options, options)`

Generate classes for the progress indicator bar.

```typescript
function getProgressIndicatorClasses(options?: { color?: ColorVariant; indeterminate?: boolean; className?: string; }): string
```

- `options` — The options.
- `options` — .color - The color variant for the indicator.
- `options` — .indeterminate - Whether the progress is indeterminate.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getProgressLabelContainerClass()`

Progress label container class.

```typescript
function getProgressLabelContainerClass(): string
```

**Returns:** The progress label container class string.

#### `getProgressLabelTextClass()`

Progress label text class.

```typescript
function getProgressLabelTextClass(): string
```

**Returns:** The progress label text class string.

#### `getProgressPercentage(value, max)`

Calculate the percentage of progress.

```typescript
function getProgressPercentage(value: number, max?: number): number
```

- `value` — The current progress value.
- `max` — The maximum progress value.

**Returns:** The calculated percentage (0-100).

#### `getProgressWrapperClass()`

Progress wrapper class.

```typescript
function getProgressWrapperClass(): string
```

**Returns:** The progress wrapper class string.

#### `getRadioClasses(options)`

Generate classes for a radio input element.

Usage in Svelte:
```svelte
<script>
  import { getRadioClasses, getRadioGroupClasses } from '`@molecule/app-ui-svelte`'
  export let direction = 'vertical'
  export let error = ''
  $: radioClass = getRadioClasses({ error })
  $: groupClass = getRadioGroupClasses(direction)
</script>
```

```typescript
function getRadioClasses(options?: RadioClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getRadioErrorClass(className)`

Error message class.

```typescript
function getRadioErrorClass(className?: string): string
```

- `className` — Optional CSS class name to append.

**Returns:** The radio error class string.

#### `getRadioGroupClasses(direction)`

Generate the flex container class for the radio options.

```typescript
function getRadioGroupClasses(direction?: "horizontal" | "vertical"): string
```

- `direction` — The layout direction of the radio group.

**Returns:** The resulting class string.

#### `getRadioGroupLabelClasses(className)`

Generate the group label classes.

```typescript
function getRadioGroupLabelClasses(className?: string): string
```

- `className` — Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getRadioOptionLabelClass(disabled)`

Generate the option label wrapper class.

```typescript
function getRadioOptionLabelClass(disabled?: boolean): string
```

- `disabled` — Whether the radio option is disabled.

**Returns:** The resulting class string.

#### `getRadioOptionTextClass()`

Radio option text class.

```typescript
function getRadioOptionTextClass(): string
```

**Returns:** The radio option text class string.

#### `getSelectChevronIconData()`

Get icon data for the select dropdown chevron.

```typescript
function getSelectChevronIconData(): IconData
```

**Returns:** Icon data for a downward chevron from the current icon set

#### `getSelectClasses(options)`

Generate classes for a select element.

Usage in Svelte:
```svelte
<script>
  import { getSelectClasses } from '`@molecule/app-ui-svelte`'
  export let size = 'md'
  export let error = ''
  $: classes = getSelectClasses({ size, error })
</script>
<select class={classes}>
  <slot />
</select>
```

```typescript
function getSelectClasses(options?: SelectClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getSelectErrorClass()`

Get the error message class string.

```typescript
function getSelectErrorClass(): string
```

**Returns:** The select error class string.

#### `getSelectHintClass()`

Get the hint message class string.

```typescript
function getSelectHintClass(): string
```

**Returns:** The resulting string.

#### `getSelectInnerClass()`

Select relative container class.

```typescript
function getSelectInnerClass(): string
```

**Returns:** The resulting string.

#### `getSelectLabelClasses(options, options, options)`

Generate classes for a select label.

```typescript
function getSelectLabelClasses(options?: { required?: boolean; className?: string; }): string
```

- `options` — The options.
- `options` — .required - Whether the field is required.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getSelectWrapperClass()`

Select wrapper class.

```typescript
function getSelectWrapperClass(): string
```

**Returns:** The select wrapper class string.

#### `getSeparatorClasses(options)`

Generate classes for a separator element.

Usage in Svelte:
```svelte
<script>
  import { getSeparatorClasses } from '`@molecule/app-ui-svelte`'
  export let orientation = 'horizontal'
  export let decorative = true
  $: classes = getSeparatorClasses({ orientation })
</script>
<div
  role={decorative ? 'none' : 'separator'}
  aria-orientation={decorative ? undefined : orientation}
  class={classes}
/>
```

```typescript
function getSeparatorClasses(options?: SeparatorClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getSkeletonClasses(options)`

Generate classes for a skeleton element.

Usage in Svelte:
```svelte
<script>
  import { getSkeletonClasses, getSkeletonStyle } from '`@molecule/app-ui-svelte`'
  export let width = undefined
  export let height = undefined
  export let circle = false
  export let animation = 'pulse'
  $: classes = getSkeletonClasses({ circle, animation })
  $: style = getSkeletonStyle({ width, height, circle, borderRadius })
</script>
<div class={classes} style={style} />
```

```typescript
function getSkeletonClasses(options?: SkeletonClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getSkeletonStyle(options, options, options, options, options)`

Generate inline style for a skeleton element.

```typescript
function getSkeletonStyle(options: { width?: string | number; height?: string | number; circle?: boolean; borderRadius?: string | number; }): string
```

- `options` — The style options.
- `options` — .width - The width of the skeleton element.
- `options` — .height - The height of the skeleton element.
- `options` — .circle - Whether the skeleton is circular.
- `options` — .borderRadius - Custom border radius value.

**Returns:** The inline style string.

#### `getSkeletonTextConfig(lines)`

Generate classes and style for a SkeletonText component (multiple lines).

```typescript
function getSkeletonTextConfig(lines?: number): { width: string; height: number; }[]
```

- `lines` — The lines.

**Returns:** The result.

#### `getSkeletonTextContainerClass()`

Skeleton text container class.

```typescript
function getSkeletonTextContainerClass(): string
```

**Returns:** The skeleton text container class string.

#### `getSortIconData(direction)`

Get icon data for a table sort direction indicator.

```typescript
function getSortIconData(direction: "asc" | "desc"): IconData
```

- `direction` — Sort direction ('asc' or 'desc')

**Returns:** Icon data from the current icon set

#### `getSpacerClasses(options)`

Generate classes for a spacer element.

Usage in Svelte:
```svelte
<script>
  import { getSpacerClasses, getSpacerStyle } from '`@molecule/app-ui-svelte`'
  export let size = 'md'
  export let horizontal = false
  $: classes = getSpacerClasses({ size, horizontal })
  $: style = getSpacerStyle({ size, horizontal })
</script>
<div class={classes} style={style} />
```

```typescript
function getSpacerClasses(options?: SpacerClassOptions): string
```

- `options` — The options.

**Returns:** The resulting class string.

#### `getSpacerStyle(options)`

Generate inline style for custom spacer sizes.

```typescript
function getSpacerStyle(options?: SpacerClassOptions): string
```

- `options` — The spacer style options.

**Returns:** The inline style string.

#### `getSpinnerClasses(options)`

Generate classes for a spinner element.

Usage in Svelte:
```svelte
<script>
  import { getSpinnerClasses, getSpinnerColorStyle } from '`@molecule/app-ui-svelte`'
  import { t } from '`@molecule/app-i18n`'
  export let size = 'md'
  export let color = undefined
  $: classes = getSpinnerClasses({ size })
  $: colorStyle = getSpinnerColorStyle(color)
</script>
<div role="status" aria-label={label || t('ui.spinner.loading')} class={classes} style={colorStyle}>
  {#if label}<span class="sr-only">{label}</span>{/if}
</div>
```

```typescript
function getSpinnerClasses(options?: SpinnerClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getSpinnerColorStyle(color)`

Get inline style for custom spinner color.
Returns undefined if the color is a standard variant or not provided.

```typescript
function getSpinnerColorStyle(color?: string): Record<string, string> | undefined
```

- `color` — The color variant or custom color string.

**Returns:** An inline style object, or undefined for standard variants.

#### `getSpinnerSrOnlyClass()`

Screen reader only class for spinner labels.

```typescript
function getSpinnerSrOnlyClass(): string
```

**Returns:** The screen reader only class string.

#### `getSwitchClasses(options)`

Generate classes for the switch track element.

Usage in Svelte:
```svelte
<script>
  import { getSwitchClasses, getSwitchThumbClasses, getSwitchWrapperClasses } from '`@molecule/app-ui-svelte`'
  export let checked = false
  export let size = 'md'
  export let disabled = false
  $: state = checked ? 'checked' : 'unchecked'
  $: trackClass = getSwitchClasses({ size })
  $: thumbClass = getSwitchThumbClasses({ size })
  $: wrapperClass = getSwitchWrapperClasses({ disabled })
</script>
<label class={wrapperClass}>
  <button type="button" role="switch" aria-checked={checked} data-state={state} class={trackClass} on:click>
    <span data-state={state} class={thumbClass} />
  </button>
  {#if label}<span class={cm.textSize('sm')}>{label}</span>{/if}
</label>
```

```typescript
function getSwitchClasses(options?: SwitchClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getSwitchLabelTextClass()`

Switch label text class.

```typescript
function getSwitchLabelTextClass(): string
```

**Returns:** The switch label text class string.

#### `getSwitchThumbClasses(options, options)`

Generate classes for the switch thumb element.

```typescript
function getSwitchThumbClasses(options?: { size?: Size; }): string
```

- `options` — The options.
- `options` — .size - The size of the switch thumb.

**Returns:** The resulting class string.

#### `getSwitchWrapperClasses(options, options)`

Generate classes for the switch wrapper (label element).

```typescript
function getSwitchWrapperClasses(options?: { disabled?: boolean; }): string
```

- `options` — The options.
- `options` — .disabled - Whether the switch is disabled.

**Returns:** The resulting class string.

#### `getTableBodyClass()`

Get the table body class string.

```typescript
function getTableBodyClass(): string
```

**Returns:** The table body class string.

#### `getTableCellClasses(options, options, options)`

Generate classes for a table data cell.

```typescript
function getTableCellClasses(options?: { align?: "left" | "center" | "right"; className?: string; }): string
```

- `options` — The options.
- `options` — .align - The text alignment of the cell.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getTableClasses(options)`

Generate classes for the table element.

Usage in Svelte:
```svelte
<script>
  import {
    getTableClasses, getTableHeaderClass, getTableBodyClass,
    getTableRowClasses, getTableHeadClasses, getTableCellClasses,
  } from '`@molecule/app-ui-svelte`'
  export let bordered = false
  export let striped = false
  export let hoverable = true
  $: tableClass = getTableClasses({ bordered })
</script>
<div class={cm.tableWrapper}>
  <table class={tableClass}>
    <thead class={getTableHeaderClass()}>
      <tr class={getTableRowClasses()}>
        {#each columns as col}
          <th class={getTableHeadClasses({ align: col.align, sortable: col.sortable })}>{col.header}</th>
        {/each}
      </tr>
    </thead>
    <tbody class={getTableBodyClass()}>
      {#each data as row, i}
        <tr class={getTableRowClasses({ striped, hoverable, index: i })}>
          {#each columns as col}
            <td class={getTableCellClasses({ align: col.align })}>{row[col.key]}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
```

```typescript
function getTableClasses(options?: TableClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getTableEmptyCellClass()`

Empty state cell class.

```typescript
function getTableEmptyCellClass(): string
```

**Returns:** The resulting string.

#### `getTableHeadClasses(options, options, options, options)`

Generate classes for a table header cell.

```typescript
function getTableHeadClasses(options?: { align?: "left" | "center" | "right"; sortable?: boolean; className?: string; }): string
```

- `options` — The options.
- `options` — .align - The text alignment of the header cell.
- `options` — .sortable - Whether the column is sortable.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getTableHeaderClass()`

Get the table header class string.

```typescript
function getTableHeaderClass(): string
```

**Returns:** The table header class string.

#### `getTableLoadingOverlayClass()`

Loading overlay class.

```typescript
function getTableLoadingOverlayClass(): string
```

**Returns:** The resulting string.

#### `getTableRowClasses(options, options, options, options, options, options)`

Generate classes for a table row.

```typescript
function getTableRowClasses(options?: { striped?: boolean; hoverable?: boolean; index?: number; clickable?: boolean; className?: string; }): string
```

- `options` — The options.
- `options` — .striped - Whether striped row styling is enabled.
- `options` — .hoverable - Whether hover styling is enabled.
- `options` — .index - The row index for striped styling.
- `options` — .clickable - Whether the row is clickable.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getTableSortIconClass()`

Sort icon class.

```typescript
function getTableSortIconClass(): string
```

**Returns:** The table sort icon class string.

#### `getTableSortWrapperClass()`

Sort indicator container class.

```typescript
function getTableSortWrapperClass(): string
```

**Returns:** The table sort wrapper class string.

#### `getTableWrapperClass()`

Table wrapper class.

```typescript
function getTableWrapperClass(): string
```

**Returns:** The table wrapper class string.

#### `getTabsContentClass()`

Get the tab content panel class string.

```typescript
function getTabsContentClass(): string
```

**Returns:** The tabs content class string.

#### `getTabsListClasses(options)`

Generate classes for the tabs list container.

Usage in Svelte:
```svelte
<script>
  import { getTabsListClasses, getTabsTriggerClasses, getTabsContentClass } from '`@molecule/app-ui-svelte`'
  export let items = []
  export let value = ''
  export let fitted = false
  $: listClass = getTabsListClasses({ fitted })
</script>
<div class={listClass} role="tablist">
  {#each items as item}
    <button
      role="tab"
      aria-selected={value === item.value}
      data-state={value === item.value ? 'active' : 'inactive'}
      disabled={item.disabled}
      class={getTabsTriggerClasses({ fitted })}
      on:click={() => onChange(item.value)}
    >
      {item.label}
    </button>
  {/each}
</div>
{#if activeContent}
  <div role="tabpanel" class={getTabsContentClass()}>{activeContent}</div>
{/if}
```

```typescript
function getTabsListClasses(options?: TabsListClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getTabsTriggerClasses(options, options, options)`

Generate classes for a tab trigger button.

```typescript
function getTabsTriggerClasses(options?: { fitted?: boolean; className?: string; }): string
```

- `options` — The options.
- `options` — .fitted - Whether the tab takes equal width.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getTextareaClasses(options)`

Generate classes for a textarea element.

Usage in Svelte:
```svelte
<script>
  import { getTextareaClasses } from '`@molecule/app-ui-svelte`'
  export let error = ''
  $: classes = getTextareaClasses({ error })
</script>
<textarea class={classes} />
```

```typescript
function getTextareaClasses(options?: TextareaClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getTextareaErrorClass()`

Get the error message class string.

```typescript
function getTextareaErrorClass(): string
```

**Returns:** The textarea error class string.

#### `getTextareaHintClass()`

Get the hint message class string.

```typescript
function getTextareaHintClass(): string
```

**Returns:** The resulting string.

#### `getTextareaLabelClasses(options, options, options)`

Generate classes for a textarea label.

```typescript
function getTextareaLabelClasses(options?: { required?: boolean; className?: string; }): string
```

- `options` — The options.
- `options` — .required - Whether the field is required.
- `options` — .className - Optional CSS class name to append.

**Returns:** The resulting class string.

#### `getTextareaWrapperClass()`

Textarea wrapper class.

```typescript
function getTextareaWrapperClass(): string
```

**Returns:** The textarea wrapper class string.

#### `getToastClasses(options)`

Generate classes for a toast element.

Usage in Svelte:
```svelte
<script>
  import { getToastClasses, getToastTitleClass, getToastDescriptionClass, getToastCloseClass } from '`@molecule/app-ui-svelte`'
  import { t } from '`@molecule/app-i18n`'
  export let status = 'info'
  $: classes = getToastClasses({ status })
</script>
<div role="alert" data-state="open" class={classes}>
  <span class={cm.toastIconWrapper}>{\@html icon}</span>
  <div class={cm.toastContentWrapper}>
    {#if title}<div class={getToastTitleClass()}>{title}</div>{/if}
    {#if description}<div class={getToastDescriptionClass()}>{description}</div>{/if}
  </div>
  {#if dismissible}
    <button class={getToastCloseClass()} on:click={onDismiss} aria-label={t('ui.toast.close')}>X</button>
  {/if}
</div>
```

```typescript
function getToastClasses(options?: ToastClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getToastCloseClass()`

Get the toast close button class string.

```typescript
function getToastCloseClass(): string
```

**Returns:** The toast close button class string.

#### `getToastCloseIconData()`

Get icon data for the close/dismiss button.

```typescript
function getToastCloseIconData(): IconData
```

**Returns:** Icon data for the X mark icon

#### `getToastContainerClasses(position, className)`

Generate classes for the toast container.

```typescript
function getToastContainerClasses(position?: ToastPosition, className?: string): string
```

- `position` — The position.
- `className` — The CSS class name.

**Returns:** The resulting string.

#### `getToastContentWrapperClass()`

Toast content wrapper class.

```typescript
function getToastContentWrapperClass(): string
```

**Returns:** The resulting string.

#### `getToastDescriptionClass()`

Get the toast description class string.

```typescript
function getToastDescriptionClass(): string
```

**Returns:** The toast description class string.

#### `getToastIconData(status)`

Get icon data for a toast status.

```typescript
function getToastIconData(status: string): IconData | null
```

- `status` — Toast status variant (info, success, warning, error)

**Returns:** Icon data from the current icon set, or null if status is unknown

#### `getToastIconWrapperClass()`

Toast icon container class.

```typescript
function getToastIconWrapperClass(): string
```

**Returns:** The resulting string.

#### `getToastTitleClass()`

Get the toast title class string.

```typescript
function getToastTitleClass(): string
```

**Returns:** The toast title class string.

#### `getTooltipClasses(options)`

Generate classes for the tooltip content element.

Usage in Svelte:
```svelte
<script>
  import { getTooltipClasses, calculateTooltipPosition } from '`@molecule/app-ui-svelte`'
  export let placement = 'top'
  let triggerEl, tooltipEl
  let visible = false
  let position = { top: 0, left: 0 }
  $: classes = getTooltipClasses()
</script>
<div bind:this={triggerEl} on:mouseenter={() => visible = true} on:mouseleave={() => visible = false}>
  <slot />
</div>
{#if visible}
  <div bind:this={tooltipEl} role="tooltip" class={classes} style="position:absolute;top:{position.top}px;left:{position.left}px;z-index:9999;">
    {content}
  </div>
{/if}
```

```typescript
function getTooltipClasses(options?: TooltipClassOptions): string
```

- `options` — The options.

**Returns:** The resulting string.

#### `getTooltipTriggerClass()`

Tooltip trigger wrapper class.

```typescript
function getTooltipTriggerClass(): string
```

**Returns:** The tooltip trigger class string.

#### `groupSelectOptions(options)`

Group options by their group field for optgroup rendering.

```typescript
function groupSelectOptions(options: SelectOption<T>[]): Record<string, SelectOption<T>[]>
```

- `options` — The select options to group.

**Returns:** A record mapping group names to their options.

#### `toggleAccordionItem(expandedItems, itemValue, options, options, options)`

Helper to manage accordion expanded state.
Handles single/multiple expansion and collapsibility logic.

```typescript
function toggleAccordionItem(expandedItems: string[], itemValue: string, options?: { multiple?: boolean; collapsible?: boolean; }): string[]
```

- `expandedItems` — The currently expanded item values.
- `itemValue` — The value of the item being toggled.
- `options` — Toggle behavior options.
- `options` — .multiple - Whether multiple items can be expanded simultaneously.
- `options` — .collapsible - Whether all items can be collapsed.

**Returns:** The updated array of expanded item values.

### Constants

#### `accordionChevronClass` *(deprecated)*

Accordion chevron class constant.

```typescript
const accordionChevronClass: string
```

#### `alertContentClass` *(deprecated)*

Alert content class constant.

```typescript
const alertContentClass: string
```

#### `alertDismissClass` *(deprecated)*

Alert dismiss class constant.

```typescript
const alertDismissClass: string
```

#### `alertIconClass`

The alert icon class.

```typescript
const alertIconClass: string
```

#### `alertStatusVariantMap`

Re-export status variant map for direct access.

```typescript
const alertStatusVariantMap: Record<ColorVariant, "success" | "warning" | "error" | "info" | "default">
```

#### `avatarInitialsClass` *(deprecated)*

Avatar initials class constant.

```typescript
const avatarInitialsClass: string
```

#### `cardPaddingMap`

Map of card padding.

```typescript
const cardPaddingMap: Record<Size | "none", string>
```

#### `checkboxContainerClass`

Container class for the checkbox component.

```typescript
const checkboxContainerClass: string
```

#### `checkboxLabelWrapperClass` *(deprecated)*

Checkbox label wrapper class constant.

```typescript
const checkboxLabelWrapperClass: string
```

#### `dropdownItemIconClass` *(deprecated)*

Dropdown item icon class constant.

```typescript
const dropdownItemIconClass: string
```

#### `dropdownItemLabelClass` *(deprecated)*

Dropdown item label class constant.

```typescript
const dropdownItemLabelClass: string
```

#### `dropdownItemShortcutClass`

Dropdown item shortcut class constant.

```typescript
const dropdownItemShortcutClass: string
```

#### `dropdownTriggerClass`

The dropdown trigger class.

```typescript
const dropdownTriggerClass: string
```

#### `formFieldsetClass` *(deprecated)*

Form fieldset class constant.

```typescript
const formFieldsetClass: string
```

#### `inputClearButtonClass` *(deprecated)*

Input clear button class constant.

```typescript
const inputClearButtonClass: string
```

#### `inputLeftElementClass` *(deprecated)*

Input left element class constant.

```typescript
const inputLeftElementClass: string
```

#### `inputRelativeClass` *(deprecated)*

Input relative class constant.

```typescript
const inputRelativeClass: string
```

#### `inputRightElementClass` *(deprecated)*

Input right element class constant.

```typescript
const inputRightElementClass: string
```

#### `inputWrapperClass`

The input wrapper class.

```typescript
const inputWrapperClass: string
```

#### `modalBodyClass` *(deprecated)*

Modal body class.

```typescript
const modalBodyClass: string
```

#### `progressColorMap` *(deprecated)*

Progress color map constant.

```typescript
const progressColorMap: Record<ColorVariant, string>
```

#### `progressLabelClass` *(deprecated)*

Progress label class constant.

```typescript
const progressLabelClass: string
```

#### `progressLabelContainerClass`

The progress label container class.

```typescript
const progressLabelContainerClass: string
```

#### `progressSizeHeightMap` *(deprecated)*

Progress size height map constant.

```typescript
const progressSizeHeightMap: Record<Size, string>
```

#### `progressWrapperClass` *(deprecated)*

Progress wrapper class constant.

```typescript
const progressWrapperClass: string
```

#### `radioOptionTextClass` *(deprecated)*

Radio option text class constant.

```typescript
const radioOptionTextClass: string
```

#### `selectRelativeClass` *(deprecated)*

Select relative class constant.

```typescript
const selectRelativeClass: string
```

#### `selectWrapperClass`

The select wrapper class.

```typescript
const selectWrapperClass: string
```

#### `skeletonTextContainerClass`

The skeleton text container class.

```typescript
const skeletonTextContainerClass: string
```

#### `spacerSizeMap`

Map of spacer size.

```typescript
const spacerSizeMap: Record<Size, string>
```

#### `statusIconMap`

Status icon name mapping for Alert/Toast components.

```typescript
const statusIconMap: Record<string, string>
```

#### `switchLabelTextClass` *(deprecated)*

Switch label text class constant.

```typescript
const switchLabelTextClass: string
```

#### `tableEmptyCellClass` *(deprecated)*

Table empty cell class constant.

```typescript
const tableEmptyCellClass: string
```

#### `tableLoadingOverlayClass`

The table loading overlay class.

```typescript
const tableLoadingOverlayClass: string
```

#### `tableSortIconClass` *(deprecated)*

Table sort icon class constant.

```typescript
const tableSortIconClass: string
```

#### `tableSortIndicatorClass` *(deprecated)*

Table sort indicator class constant.

```typescript
const tableSortIndicatorClass: string
```

#### `tableWrapperClass` *(deprecated)*

Table wrapper class constant.

```typescript
const tableWrapperClass: string
```

#### `textareaWrapperClass` *(deprecated)*

Textarea wrapper class constant.

```typescript
const textareaWrapperClass: string
```

#### `toastContentClass`

The toast content class.

```typescript
const toastContentClass: string
```

#### `toastIconClass` *(deprecated)*

Toast icon class constant.

```typescript
const toastIconClass: string
```

#### `toastPositionClasses`

The toast position classes.

```typescript
const toastPositionClasses: Record<ToastPosition, string>
```

#### `toastStatusVariantMap`

Re-export status variant map for direct access.

```typescript
const toastStatusVariantMap: Record<ColorVariant, "success" | "warning" | "error" | "info" | "default">
```

#### `tooltipTriggerClass` *(deprecated)*

Tooltip trigger class constant.

```typescript
const tooltipTriggerClass: string
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-icons` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `svelte` ^4.0.0 || ^5.0.0
