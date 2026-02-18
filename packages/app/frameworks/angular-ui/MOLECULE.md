# @molecule/app-ui-angular

Angular UI components for molecule.dev.

Provides Angular implementations of the `@molecule/app-ui` component
interfaces using the UIClassMap abstraction from `@molecule/app-ui`.

## Type
`framework`

## Installation
```bash
npm install @molecule/app-ui-angular
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

### Classes

#### `MoleculeAlert`

Angular Alert UI component with UIClassMap-driven styling.

#### `MoleculeBadge`

Angular Badge UI component with UIClassMap-driven styling.

#### `MoleculeButton`

Angular Button UI component with UIClassMap-driven styling.

#### `MoleculeCheckbox`

Angular Checkbox UI component with UIClassMap-driven styling.

#### `MoleculeInput`

Angular Input UI component with UIClassMap-driven styling.

#### `MoleculeModal`

Angular Modal UI component with UIClassMap-driven styling.

#### `MoleculeRadioGroup`

Angular RadioGroup UI component with UIClassMap-driven styling.

#### `MoleculeSelect`

Angular Select UI component with UIClassMap-driven styling.

#### `MoleculeSpinner`

Angular Spinner UI component with UIClassMap-driven styling.

#### `MoleculeSwitch`

Angular Switch UI component with UIClassMap-driven styling.

#### `MoleculeToast`

Angular Toast UI component with UIClassMap-driven styling.

#### `MoleculeTooltip`

Angular Tooltip UI component with UIClassMap-driven styling.

Wraps child content and shows a tooltip on hover/focus.

### Functions

#### `cn(inputs)`

Merge class names, filtering out falsy values.

```typescript
function cn(inputs?: (string | false | null | undefined)[]): string
```

- `inputs` — The inputs.

**Returns:** The resulting string.

#### `getIconSvg(name, className)`

Generates SVG markup string from an icon name.

```typescript
function getIconSvg(name: string, className: string): string
```

- `name` — Icon name from the icon set
- `className` — CSS class for sizing

**Returns:** SVG markup string

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-icons` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@angular/core` ^18.0.0 || ^19.0.0 || ^20.0.0 || ^21.0.0
