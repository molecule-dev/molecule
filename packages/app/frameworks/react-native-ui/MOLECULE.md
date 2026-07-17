# @molecule/app-ui-react-native

React Native UI components for molecule.dev.

Provides React Native implementations (View/Pressable/Text-based) of the
core `@molecule/app-ui` component interfaces — 30 components: Accordion,
Alert, Avatar, Badge, Button, Card (+ CardHeader/CardTitle/CardDescription/
CardContent/CardFooter), Checkbox, Container, Dropdown, Flex, Form,
FormField, Grid, Input, Label, Modal, Pagination, Progress, RadioGroup,
Select, Separator, Skeleton, Spacer, Spinner, Switch, Table, Tabs,
Textarea, Toast (+ ToastProvider / ToastContainer / useToast), Tooltip.
Prop types are re-exported from `@molecule/app-ui`. Web-only extras (Icon,
UserMenu, ThemeToggle, PageHeader, …) live in `@molecule/app-ui-react` and
are NOT available here.

## Quick Start

```tsx
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-nativewind'
import { Button, Card, CardContent, CardTitle } from '@molecule/app-ui-react-native'

// Once at startup, before first render:
setClassMap(classMap)

function Greeting() {
  return (
    <Card>
      <CardTitle>Hello</CardTitle>
      <CardContent>
        <Button color="primary" onClick={() => {}}>Tap me</Button>
      </CardContent>
    </Card>
  )
}
```

## Type
`framework`

## Installation
```bash
npm install @molecule/app-ui-react-native @molecule/app-i18n @molecule/app-icons @molecule/app-ui react react-native
```

## API

### Interfaces

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

### Functions

#### `Accordion(props)`

Renders an Accordion component.

```typescript
function Accordion({
  items = [],
  multiple = false,
  defaultValue,
  value: controlledValue,
  onChange,
  collapsible = true,
  className,
  testId,
}: AccordionProps<string>): React.JSX.Element
```

- `props` — Component props.
- `props.items` — Accordion items array.
- `props.multiple` — Whether multiple items can be open.
- `props.defaultValue` — Initial open value.
- `props.value` — Controlled open value.
- `props.onChange` — Change handler.
- `props.collapsible` — Whether items collapse.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Accordion element.

#### `Alert(props)`

Renders an Alert component.

```typescript
function Alert({
  children,
  title,
  variant: _variant = 'subtle',
  status,
  icon,
  dismissible,
  onDismiss,
  className,
  testId,
}: AlertProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Alert body content.
- `props.title` — Alert title text.
- `props.variant` — Visual variant.
- `props.status` — Status type.
- `props.icon` — Leading icon element.
- `props.dismissible` — Whether dismissible.
- `props.onDismiss` — Dismiss handler.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Alert element.

#### `Avatar(props)`

Renders an Avatar component.

```typescript
function Avatar({
  src,
  alt,
  name,
  fallback,
  size = 'md',
  rounded = true,
  className,
  testId,
}: AvatarProps): React.JSX.Element
```

- `props` — Component props.
- `props.src` — Image source URL.
- `props.alt` — Alt text for image.
- `props.name` — Display name for initials.
- `props.fallback` — Fallback element when image unavailable.
- `props.size` — Avatar size.
- `props.rounded` — Whether rounded (circular).
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Avatar element.

#### `Badge(props)`

Renders a Badge component.

```typescript
function Badge({
  children,
  color = 'primary',
  variant: _variant = 'solid',
  size = 'md',
  rounded = true,
  className,
  testId,
}: BadgeProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Badge content.
- `props.color` — Badge color.
- `props.variant` — Visual variant style.
- `props.size` — Badge size.
- `props.rounded` — Whether rounded.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Badge element.

#### `Button(props)`

Renders a Button component.

```typescript
function Button({
  children,
  variant = 'solid',
  color = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  testId,
  disabled,
  onClick,
}: ButtonProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Button content.
- `props.variant` — Visual variant.
- `props.color` — Color theme.
- `props.size` — Button size.
- `props.loading` — Whether loading.
- `props.loadingText` — Text while loading.
- `props.fullWidth` — Whether full width.
- `props.leftIcon` — Left icon element.
- `props.rightIcon` — Right icon element.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.
- `props.disabled` — Whether disabled.
- `props.onClick` — Click handler.

**Returns:** The rendered Button element.

#### `Card(props)`

Renders a Card component.

```typescript
function Card({
  children,
  variant = 'elevated',
  padding = 'md',
  interactive,
  className,
  style,
  testId,
  onClick,
}: CardProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Card content.
- `props.variant` — Visual variant.
- `props.padding` — Padding size.
- `props.interactive` — Whether interactive.
- `props.className` — CSS class name override.
- `props.style` — Inline style object.
- `props.testId` — Test identifier.
- `props.onClick` — Click handler.

**Returns:** The rendered Card element.

#### `CardContent(props)`

Renders a CardContent component.

```typescript
function CardContent({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Body content.
- `props.className` — CSS class name override.

**Returns:** The rendered CardContent element.

#### `CardDescription(props)`

Renders a CardDescription component.

```typescript
function CardDescription({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Description content.
- `props.className` — CSS class name override.

**Returns:** The rendered CardDescription element.

#### `CardFooter(props)`

Renders a CardFooter component.

```typescript
function CardFooter({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Footer content.
- `props.className` — CSS class name override.

**Returns:** The rendered CardFooter element.

#### `CardHeader(props)`

Renders a CardHeader component.

```typescript
function CardHeader({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Header content.
- `props.className` — CSS class name override.

**Returns:** The rendered CardHeader element.

#### `CardTitle(props)`

Renders a CardTitle component.

```typescript
function CardTitle({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Title content.
- `props.className` — CSS class name override.

**Returns:** The rendered CardTitle element.

#### `Checkbox(props)`

Renders a Checkbox component.

```typescript
function Checkbox({
  label,
  checked,
  indeterminate,
  onChange,
  error,
  disabled,
  className,
  testId,
}: CheckboxProps): React.JSX.Element
```

- `props` — Component props.
- `props.label` — Checkbox label text.
- `props.checked` — Whether checked.
- `props.indeterminate` — Whether indeterminate.
- `props.onChange` — Change handler.
- `props.error` — Error message.
- `props.disabled` — Whether disabled.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Checkbox element.

#### `Container(props)`

Renders a Container component.

```typescript
function Container({
  children,
  maxWidth = 'lg',
  centered = true,
  className,
  style,
  testId,
}: ContainerProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Container content.
- `props.maxWidth` — Maximum width constraint.
- `props.centered` — Whether centered.
- `props.className` — CSS class name override.
- `props.style` — Inline style object.
- `props.testId` — Test identifier.

**Returns:** The rendered Container element.

#### `Dropdown(props)`

Renders a Dropdown component.

```typescript
function Dropdown({
  trigger,
  items = [],
  onSelect,
  className,
  testId,
}: DropdownProps<string>): React.JSX.Element
```

- `props` — Component props.
- `props.trigger` — Trigger element.
- `props.items` — Menu items array.
- `props.onSelect` — Item selection handler.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Dropdown element.

#### `DropdownLabel(props)`

Renders a DropdownLabel component.

```typescript
function DropdownLabel({ children }: { children: unknown; }): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Label content.

**Returns:** The rendered DropdownLabel element.

#### `DropdownSeparator()`

Renders a DropdownSeparator component.

```typescript
function DropdownSeparator(): React.JSX.Element
```

**Returns:** The rendered DropdownSeparator element.

#### `Flex(props)`

Renders a Flex component.

```typescript
function Flex({
  children,
  direction = 'row',
  justify,
  align,
  wrap,
  gap,
  className,
  style,
  testId,
  onClick,
}: FlexProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Flex content.
- `props.direction` — Flex direction.
- `props.justify` — Justify content.
- `props.align` — Align items.
- `props.wrap` — Flex wrap behavior.
- `props.gap` — Gap between items.
- `props.className` — CSS class name override.
- `props.style` — Inline style object.
- `props.testId` — Test identifier.
- `props.onClick` — Click handler.

**Returns:** The rendered Flex element.

#### `Form(props)`

Renders a Form component.

In React Native there is no `<form>` element. This is a View wrapper
that provides consistent spacing.

```typescript
function Form({ children, onSubmit: _onSubmit, className, testId }: FormProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Form content.
- `props.onSubmit` — Submit handler (unused in RN).
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Form element.

#### `FormField(props)`

Renders a FormField component.

```typescript
function FormField({
  children,
  label,
  error,
  hint,
  required,
  className,
}: FormFieldProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Field input content.
- `props.label` — Field label text.
- `props.error` — Error message.
- `props.hint` — Hint text.
- `props.required` — Whether required.
- `props.className` — CSS class name override.

**Returns:** The rendered FormField element.

#### `Grid(props)`

Renders a Grid component.

```typescript
function Grid({ children, columns, gap, className, style, testId }: GridProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Grid content.
- `props.columns` — Number of columns.
- `props.gap` — Gap between items.
- `props.className` — CSS class name override.
- `props.style` — Inline style object.
- `props.testId` — Test identifier.

**Returns:** The rendered Grid element.

#### `Label(props)`

Renders a Label component.

```typescript
function Label({ children, required, className }: LabelProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Label content.
- `props.required` — Whether required.
- `props.className` — CSS class name override.

**Returns:** The rendered Label element.

#### `Modal(props)`

Renders a Modal component.

```typescript
function Modal({
  children,
  open,
  onClose,
  title,
  size = 'md',
  footer,
  className,
  testId,
}: ModalProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Modal body content.
- `props.open` — Whether open.
- `props.onClose` — Close handler.
- `props.title` — Modal title text.
- `props.size` — Modal size.
- `props.footer` — Footer content.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Modal element.

#### `Pagination(props)`

Renders a Pagination component.

```typescript
function Pagination({
  page,
  totalPages,
  onChange,
  siblings = 1,
  boundaries = 1,
  size = 'md',
  showFirstLast,
  className,
  testId,
}: PaginationProps): React.JSX.Element
```

- `props` — Component props.
- `props.page` — Current page number.
- `props.totalPages` — Total number of pages.
- `props.onChange` — Page change handler.
- `props.siblings` — Visible sibling pages.
- `props.boundaries` — Boundary page count.
- `props.size` — Pagination size.
- `props.showFirstLast` — Show first/last buttons.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Pagination element.

#### `Progress(props)`

Renders a Progress component.

```typescript
function Progress({
  value = 0,
  max = 100,
  label,
  showValue,
  color = 'primary',
  size = 'md',
  indeterminate,
  className,
  testId,
}: ProgressProps): React.JSX.Element
```

- `props` — Component props.
- `props.value` — Current progress value.
- `props.max` — Maximum progress value.
- `props.label` — Progress label text.
- `props.showValue` — Whether to show value.
- `props.color` — Progress bar color.
- `props.size` — Progress bar size.
- `props.indeterminate` — Whether indeterminate.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Progress element.

#### `RadioGroup(props)`

Renders a RadioGroup component.

```typescript
function RadioGroup({
  label,
  options = [],
  value,
  onChange,
  direction = 'vertical',
  error,
  disabled,
  className,
  testId,
}: RadioGroupProps<string>): React.JSX.Element
```

- `props` — Component props.
- `props.label` — Group label text.
- `props.options` — Radio options array.
- `props.value` — Selected value.
- `props.onChange` — Change handler.
- `props.direction` — Layout direction.
- `props.error` — Error message.
- `props.disabled` — Whether disabled.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered RadioGroup element.

#### `Select(props)`

Renders a Select component.

```typescript
function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder,
  error,
  hint,
  size = 'md',
  disabled,
  required,
  className,
  testId,
}: SelectProps<string>): React.JSX.Element
```

- `props` — Component props.
- `props.label` — Select label text.
- `props.options` — Select options array.
- `props.value` — Selected value.
- `props.onChange` — Change handler.
- `props.placeholder` — Placeholder text.
- `props.error` — Error message.
- `props.hint` — Hint text.
- `props.size` — Select size.
- `props.disabled` — Whether disabled.
- `props.required` — Whether required.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Select element.

#### `Separator(props)`

Renders a Separator component.

```typescript
function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
  testId,
}: SeparatorProps): React.JSX.Element
```

- `props` — Component props.
- `props.orientation` — Horizontal or vertical.
- `props.decorative` — Whether purely decorative.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Separator element.

#### `Skeleton(props)`

Renders a Skeleton component.

```typescript
function Skeleton({
  width,
  height,
  circle,
  animation = 'pulse',
  className,
  testId,
}: SkeletonProps): React.JSX.Element
```

- `props` — Component props.
- `props.width` — Skeleton width.
- `props.height` — Skeleton height.
- `props.circle` — Whether circular.
- `props.animation` — Animation type.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Skeleton element.

#### `SkeletonCircle(props)`

Renders a SkeletonCircle component.

```typescript
function SkeletonCircle({ size = 40, className, testId }: { size?: number; className?: string; testId?: string; }): React.JSX.Element
```

- `props` — Component props.
- `props.size` — Circle diameter.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered SkeletonCircle element.

#### `SkeletonText(props)`

Renders a SkeletonText component.

```typescript
function SkeletonText({ lines = 3, className, testId }: { lines?: number; className?: string; testId?: string; }): React.JSX.Element
```

- `props` — Component props.
- `props.lines` — Number of text lines.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered SkeletonText element.

#### `Spacer(props)`

Renders a Spacer component.

```typescript
function Spacer({
  size = 'md',
  horizontal,
  className,
  style,
  testId,
}: SpacerProps): React.JSX.Element
```

- `props` — Component props.
- `props.size` — Spacer size.
- `props.horizontal` — Whether horizontal.
- `props.className` — CSS class name override.
- `props.style` — Inline style object.
- `props.testId` — Test identifier.

**Returns:** The rendered Spacer element.

#### `Spinner(props)`

Renders a Spinner component.

```typescript
function Spinner({ size = 'md', className, testId }: SpinnerProps): React.JSX.Element
```

- `props` — Component props.
- `props.size` — Spinner size.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Spinner element.

#### `Switch(props)`

Renders a Switch component.

```typescript
function Switch({
  label,
  checked,
  onChange,
  size: _size = 'md',
  disabled,
  className,
  testId,
}: SwitchProps): React.JSX.Element
```

- `props` — Component props.
- `props.label` — Switch label text.
- `props.checked` — Whether checked.
- `props.onChange` — Change handler.
- `props.size` — Switch size (unused in RN).
- `props.disabled` — Whether disabled.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Switch element.

#### `Table(props)`

Renders a Table component.

```typescript
function Table({
  columns = [],
  data = [],
  rowKey,
  onRowClick,
  striped,
  bordered,
  hoverable,
  loading,
  emptyContent: emptyMessage,
  sort,
  onSort,
  className,
  testId,
}: TableProps<Record<string, unknown>>): React.JSX.Element
```

- `props` — Component props.
- `props.columns` — Column definitions.
- `props.data` — Table row data.
- `props.rowKey` — Row key accessor.
- `props.onRowClick` — Row click handler.
- `props.striped` — Whether striped rows.
- `props.bordered` — Whether bordered.
- `props.hoverable` — Whether rows hoverable.
- `props.loading` — Whether loading.
- `props.emptyContent` — Empty state message.
- `props.sort` — Active sort state.
- `props.onSort` — Sort handler.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Table element.

#### `Tabs(props)`

Renders a Tabs component.

```typescript
function Tabs({
  items = [],
  value: controlledValue,
  defaultValue,
  onChange,
  fitted,
  className,
  testId,
}: TabsProps<string>): React.JSX.Element
```

- `props` — Component props.
- `props.items` — Tab items array.
- `props.value` — Controlled active tab.
- `props.defaultValue` — Default active tab.
- `props.onChange` — Tab change handler.
- `props.fitted` — Whether tabs fill width.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Tabs element.

#### `Toast(props)`

Renders a Toast component.

```typescript
function Toast({
  title,
  description,
  status,
  duration = 5000,
  dismissible = true,
  onDismiss,
  className,
  testId,
}: ToastProps): React.JSX.Element
```

- `props` — Component props.
- `props.title` — Toast title text.
- `props.description` — Toast description text.
- `props.status` — Status type.
- `props.duration` — Auto-dismiss duration (ms).
- `props.dismissible` — Whether dismissible.
- `props.onDismiss` — Dismiss handler.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Toast element.

#### `ToastContainer(props)`

Renders a ToastContainer component.

```typescript
function ToastContainer({ children, position = 'bottom-right' }: { children: React.ReactNode; position?: "top" | "top-right" | "top-left" | "bottom" | "bottom-right" | "bottom-left"; }): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Toast elements.
- `props.position` — Screen position.

**Returns:** The rendered ToastContainer element.

#### `ToastProvider(props)`

Renders a ToastProvider component.

```typescript
function ToastProvider({ children, position = 'bottom-right' }: { children: React.ReactNode; position?: "top" | "top-right" | "top-left" | "bottom" | "bottom-right" | "bottom-left"; }): React.JSX.Element
```

- `props` — Component props.
- `props.children` — App content.
- `props.position` — Toast position.

**Returns:** The rendered ToastProvider element.

#### `Tooltip(props)`

Renders a Tooltip component.

```typescript
function Tooltip({ children, content, className, testId }: TooltipProps): React.JSX.Element
```

- `props` — Component props.
- `props.children` — Trigger element.
- `props.content` — Tooltip content.
- `props.className` — CSS class name override.
- `props.testId` — Test identifier.

**Returns:** The rendered Tooltip element.

#### `useToast()`

Hook for toast notifications.

```typescript
function useToast(): ToastContextValue
```

**Returns:** The toast context value.

### Constants

#### `Input`

Text input component.

```typescript
const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<TextInput>>
```

#### `Textarea`

Multi-line text input component.

```typescript
const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<TextInput>>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-icons` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-native` >=0.72.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-icons`
- `@molecule/app-ui`
- `react`
- `react-native`

- **Styling requires NativeWind, not just setClassMap.** Components apply ClassMap classes via
  `className` on React Native primitives — that prop only has an effect when the NativeWind
  babel preset + Tailwind config are wired into the app AND `setClassMap(classMap)` from
  `@molecule/app-ui-nativewind` has run. Missing either half renders the whole UI unstyled
  with NO error. `getClassMap()` itself throws until `setClassMap` is called.
- Event props follow the shared `@molecule/app-ui` interfaces (`onClick`, not `onPress`) so
  components stay swappable with the web implementations.
- Toasts need `ToastProvider` mounted at the root; `useToast()` throws outside it.

## Translations

Translation strings are provided by `@molecule/app-locales-ui`.
