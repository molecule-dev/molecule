# @molecule/app-ui-solid

SolidJS UI components for molecule.dev.

Provides Solid implementations of the core `@molecule/app-ui` component
interfaces, styled through the UIClassMap abstraction — 25 components:
Accordion, Alert, Avatar, Badge, Button, Card, Checkbox, Dropdown, Form,
Input, Layout helpers, Modal, Pagination, Progress, RadioGroup, Select,
Separator, Skeleton, Spinner, Switch, Table, Tabs, Textarea, Toast,
Tooltip. React-only extras (Icon, UserMenu, ThemeToggle, PageHeader,
AuthGuard, …) live in `@molecule/app-ui-react` and are NOT available here.

## Quick Start

```tsx
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { Button, Card, Modal } from '@molecule/app-ui-solid'
import { createSignal } from 'solid-js'

// Once at startup, before first render — components throw without it:
setClassMap(classMap)

function ConfirmPanel() {
  const [open, setOpen] = createSignal(false)
  return (
    <Card>
      <Button color="primary" onClick={() => setOpen(true)}>Open</Button>
      <Modal open={open()} onClose={() => setOpen(false)} title="Confirm">
        <Button color="error" onClick={() => setOpen(false)}>Done</Button>
      </Modal>
    </Card>
  )
}
```

## Type
`framework`

## Installation
```bash
npm install @molecule/app-ui-solid @molecule/app-i18n @molecule/app-icons @molecule/app-ui solid-js
```

## API

### Interfaces

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
     * Automation ID for AI agents and E2E tests. Maps to the `data-mol-id`
     * HTML attribute. Use `molId()` from `./automation.js` to generate
     * semantic IDs. (Tooling only — screen readers do not expose `data-*`
     * attributes; accessible names come from labels/`aria-*`.)
     */
    automationId?: string;
    /**
     * Whether the component is disabled.
     */
    disabled?: boolean;
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

#### `ProgressProps`

Props for the Progress component.

```typescript
interface ProgressProps extends BaseProps {
  /**
   * Progress value (0-100).
   */
  value: number

  /**
   * Maximum value.
   */
  max?: number

  /**
   * Progress size.
   */
  size?: Size

  /**
   * Progress color.
   */
  color?: ColorVariant

  /**
   * Whether to show the value label.
   */
  showValue?: boolean

  /**
   * Accessible label.
   */
  label?: string

  /**
   * Whether the progress is indeterminate.
   */
  indeterminate?: boolean
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
     * Shared `name` attribute for the group's radio inputs (used for native
     * form submission). When omitted, a unique per-instance name is generated
     * so separate groups never merge — the visible `label` is deliberately
     * NOT used as the name, because two groups with the same label (e.g. two
     * "Size" pickers) would otherwise form ONE native radio group and
     * deselect each other.
     */
    name?: string;
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

#### `TooltipPlacement`

Position where a tooltip renders relative to its trigger element (top, bottom, left, right, and corner variants).

```typescript
type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
```

### Functions

#### `Accordion(props)`

Renders the Accordion component.

```typescript
function Accordion(props: AccordionProps<string>): any
```

- `props` — The component props.

**Returns:** The rendered accordion JSX.

#### `Alert(props)`

Renders the Alert component.

```typescript
function Alert(props: AlertProps): any
```

- `props` — The component props.

**Returns:** The rendered alert JSX.

#### `Avatar(props)`

Renders the Avatar component.

```typescript
function Avatar(props: AvatarProps): any
```

- `props` — The component props.

**Returns:** The rendered avatar JSX.

#### `Badge(props)`

Renders the Badge component.

```typescript
function Badge(props: BadgeProps): any
```

- `props` — The component props.

**Returns:** The rendered badge JSX.

#### `Button(props)`

Renders the Button component.

```typescript
function Button(props: ButtonProps): any
```

- `props` — The component props.

**Returns:** The rendered button JSX.

#### `Card(props)`

Renders the Card component.

```typescript
function Card(props: CardProps): any
```

- `props` — The component props.

**Returns:** The rendered card JSX.

#### `CardContent(props)`

Card content component.

```typescript
function CardContent(props: { children?: JSX.Element; class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `CardDescription(props)`

Card description component.

```typescript
function CardDescription(props: { children?: JSX.Element; class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `CardFooter(props)`

Card footer component.

```typescript
function CardFooter(props: { children?: JSX.Element; class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `CardHeader(props)`

Renders the CardHeader component.

```typescript
function CardHeader(props: { children?: JSX.Element; class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered card header JSX.

#### `CardTitle(props)`

Renders the CardTitle component.

```typescript
function CardTitle(props: { children?: JSX.Element; class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered card title JSX.

#### `Checkbox(props)`

Renders the Checkbox component.

```typescript
function Checkbox(props: CheckboxProps): any
```

- `props` — The component props.

**Returns:** The rendered checkbox JSX.

#### `cn(inputs)`

Merge class name strings, filtering out falsy values (undefined, null, false).

```typescript
function cn(inputs?: (string | false | null | undefined)[]): string
```

- `inputs` — Class name strings or falsy values to be filtered out.

**Returns:** A single space-separated class string.

#### `Container(props)`

Container component.

```typescript
function Container(props: ContainerProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Dropdown(props)`

Dropdown component.

```typescript
function Dropdown(props: DropdownProps<string>): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `DropdownLabel(props)`

Dropdown label for grouping items.

```typescript
function DropdownLabel(props: { children: JSX.Element; class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `DropdownSeparator(props)`

Dropdown separator for dividing groups.

```typescript
function DropdownSeparator(props: { class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Flex(props)`

Flex container component.

```typescript
function Flex(props: FlexProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Form(props)`

Form component.

```typescript
function Form(props: FormProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `FormField(props)`

Form field wrapper component.

```typescript
function FormField(props: FormFieldProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Grid(props)`

Grid container component.

```typescript
function Grid(props: GridProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Input(props)`

Renders the Input component.

```typescript
function Input(props: InputProps): any
```

- `props` — The component props.

**Returns:** The rendered input JSX.

#### `Label(props)`

Label component.

```typescript
function Label(props: { children?: JSX.Element; required?: boolean; class?: string; for?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Modal(props)`

Renders the Modal component.

`centered` (default `true`) vertically centers the dialog; `centered:
false` top-anchors it instead, via the sanctioned inline-style exception
(see `wrapperStyle` below).

```typescript
function Modal(props: ModalProps): any
```

- `props` — The component props.

**Returns:** The rendered modal JSX.

#### `Pagination(props)`

Pagination component.

```typescript
function Pagination(props: PaginationProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Progress(props)`

Progress component.

```typescript
function Progress(props: ProgressProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `RadioGroup(props)`

Renders the RadioGroup component.

```typescript
function RadioGroup(props: RadioGroupProps<string>): any
```

- `props` — The component props.

**Returns:** The rendered radio group JSX.

#### `Select(props)`

Renders the Select component.

```typescript
function Select(props: SelectProps<string>): any
```

- `props` — The component props.

**Returns:** The rendered select JSX.

#### `Separator(props)`

Renders the Separator component.

```typescript
function Separator(props: SeparatorProps): any
```

- `props` — The component props.

**Returns:** The rendered separator JSX.

#### `Skeleton(props)`

Skeleton component.

```typescript
function Skeleton(props: SkeletonProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `SkeletonCircle(props)`

Skeleton circle (avatar placeholder).

```typescript
function SkeletonCircle(props: { size?: number; class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `SkeletonText(props)`

Skeleton text line.

```typescript
function SkeletonText(props: { lines?: number; class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Spacer(props)`

Spacer component.

```typescript
function Spacer(props: SpacerProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Spinner(props)`

Renders the Spinner component.

```typescript
function Spinner(props: SpinnerProps): any
```

- `props` — The component props.

**Returns:** The rendered spinner JSX.

#### `Switch(props)`

Renders the Switch component.

```typescript
function Switch(props: SwitchProps): any
```

- `props` — The component props.

**Returns:** The rendered switch JSX.

#### `Table(props)`

Table component.

```typescript
function Table(props: TableProps<Record<string, unknown>>): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Tabs(props)`

Tabs component.

```typescript
function Tabs(props: TabsProps<string>): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `Textarea(props)`

Renders the Textarea component.

```typescript
function Textarea(props: TextareaProps): any
```

- `props` — The component props.

**Returns:** The rendered textarea JSX.

#### `Toast(props)`

Single Toast component.

```typescript
function Toast(props: ToastProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `ToastContainer(props)`

Toast container for positioning toasts.

```typescript
function ToastContainer(props: { children?: JSX.Element; position?: ToastProps["position"]; class?: string; }): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `ToastProvider(props)`

Provider component that manages global toast state.

```typescript
function ToastProvider(props: { children: JSX.Element; position?: ToastProps["position"]; }): any
```

- `props` — The component props.

**Returns:** The rendered provider with toast container.

#### `Tooltip(props)`

Tooltip component.

`hasArrow` renders a small themed pointer at the resolved `placement` edge.

```typescript
function Tooltip(props: TooltipProps): any
```

- `props` — The component props.

**Returns:** The rendered component element.

#### `useToast()`

Hook to access the toast context for adding and removing toasts.

```typescript
function useToast(): ToastContextValue
```

**Returns:** The toast context value with toast management methods.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-icons` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `solid-js` ^1.8.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-icons`
- `@molecule/app-ui`
- `solid-js`

- **`setClassMap()` must run before any component renders** — every component resolves
  styling via `getClassMap()` from `@molecule/app-ui`, which THROWS until a ClassMap bond
  (e.g. `@molecule/app-ui-tailwind`) is set.
- Follow Solid rules: pass signals as accessors in JSX (`open={open()}`), and don't
  destructure component props.

## Translations

Translation strings are provided by `@molecule/app-locales-ui`.
