# @molecule/app-ui-react-native

React Native UI component exports.

Re-exports all components and UI prop types from `@molecule/app-ui`.

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

#### `Accordion(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .items - Accordion items array.
- `root0` — .multiple - Whether multiple items can be open.
- `root0` — .defaultValue - Initial open value.
- `root0` — .value - Controlled open value.
- `root0` — .onChange - Change handler.
- `root0` — .collapsible - Whether items collapse.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Accordion element.

#### `Alert(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .children - Alert body content.
- `root0` — .title - Alert title text.
- `root0` — .variant - Visual variant.
- `root0` — .status - Status type.
- `root0` — .icon - Leading icon element.
- `root0` — .dismissible - Whether dismissible.
- `root0` — .onDismiss - Dismiss handler.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Alert element.

#### `Avatar(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .src - Image source URL.
- `root0` — .alt - Alt text for image.
- `root0` — .name - Display name for initials.
- `root0` — .fallback - Fallback element when image unavailable.
- `root0` — .size - Avatar size.
- `root0` — .rounded - Whether rounded (circular).
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Avatar element.

#### `Badge(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .children - Badge content.
- `root0` — .color - Badge color.
- `root0` — .variant - Visual variant style.
- `root0` — .size - Badge size.
- `root0` — .rounded - Whether rounded.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Badge element.

#### `Button(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .children - Button content.
- `root0` — .variant - Visual variant.
- `root0` — .color - Color theme.
- `root0` — .size - Button size.
- `root0` — .loading - Whether loading.
- `root0` — .loadingText - Text while loading.
- `root0` — .fullWidth - Whether full width.
- `root0` — .leftIcon - Left icon element.
- `root0` — .rightIcon - Right icon element.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.
- `root0` — .disabled - Whether disabled.
- `root0` — .onClick - Click handler.

**Returns:** The rendered Button element.

#### `Card(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .children - Card content.
- `root0` — .variant - Visual variant.
- `root0` — .padding - Padding size.
- `root0` — .interactive - Whether interactive.
- `root0` — .className - CSS class name override.
- `root0` — .style - Inline style object.
- `root0` — .testId - Test identifier.
- `root0` — .onClick - Click handler.

**Returns:** The rendered Card element.

#### `CardContent(root0, root0, root0)`

Renders a CardContent component.

```typescript
function CardContent({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Body content.
- `root0` — .className - CSS class name override.

**Returns:** The rendered CardContent element.

#### `CardDescription(root0, root0, root0)`

Renders a CardDescription component.

```typescript
function CardDescription({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Description content.
- `root0` — .className - CSS class name override.

**Returns:** The rendered CardDescription element.

#### `CardFooter(root0, root0, root0)`

Renders a CardFooter component.

```typescript
function CardFooter({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Footer content.
- `root0` — .className - CSS class name override.

**Returns:** The rendered CardFooter element.

#### `CardHeader(root0, root0, root0)`

Renders a CardHeader component.

```typescript
function CardHeader({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Header content.
- `root0` — .className - CSS class name override.

**Returns:** The rendered CardHeader element.

#### `CardTitle(root0, root0, root0)`

Renders a CardTitle component.

```typescript
function CardTitle({
  children,
  className,
}: { children: unknown; className?: string; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Title content.
- `root0` — .className - CSS class name override.

**Returns:** The rendered CardTitle element.

#### `Checkbox(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .label - Checkbox label text.
- `root0` — .checked - Whether checked.
- `root0` — .indeterminate - Whether indeterminate.
- `root0` — .onChange - Change handler.
- `root0` — .error - Error message.
- `root0` — .disabled - Whether disabled.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Checkbox element.

#### `Container(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .children - Container content.
- `root0` — .maxWidth - Maximum width constraint.
- `root0` — .centered - Whether centered.
- `root0` — .className - CSS class name override.
- `root0` — .style - Inline style object.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Container element.

#### `Dropdown(root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .trigger - Trigger element.
- `root0` — .items - Menu items array.
- `root0` — .onSelect - Item selection handler.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Dropdown element.

#### `DropdownLabel(root0, root0)`

Renders a DropdownLabel component.

```typescript
function DropdownLabel({ children }: { children: unknown; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Label content.

**Returns:** The rendered DropdownLabel element.

#### `DropdownSeparator()`

Renders a DropdownSeparator component.

```typescript
function DropdownSeparator(): React.JSX.Element
```

**Returns:** The rendered DropdownSeparator element.

#### `Flex(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .children - Flex content.
- `root0` — .direction - Flex direction.
- `root0` — .justify - Justify content.
- `root0` — .align - Align items.
- `root0` — .wrap - Flex wrap behavior.
- `root0` — .gap - Gap between items.
- `root0` — .className - CSS class name override.
- `root0` — .style - Inline style object.
- `root0` — .testId - Test identifier.
- `root0` — .onClick - Click handler.

**Returns:** The rendered Flex element.

#### `Form(root0, root0, root0, root0, root0)`

Renders a Form component.

In React Native there is no `<form>` element. This is a View wrapper
that provides consistent spacing.

```typescript
function Form({ children, onSubmit: _onSubmit, className, testId }: FormProps): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Form content.
- `root0` — .onSubmit - Submit handler (unused in RN).
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Form element.

#### `FormField(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .children - Field input content.
- `root0` — .label - Field label text.
- `root0` — .error - Error message.
- `root0` — .hint - Hint text.
- `root0` — .required - Whether required.
- `root0` — .className - CSS class name override.

**Returns:** The rendered FormField element.

#### `Grid(root0, root0, root0, root0, root0, root0, root0)`

Renders a Grid component.

```typescript
function Grid({ children, columns, gap, className, style, testId }: GridProps): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Grid content.
- `root0` — .columns - Number of columns.
- `root0` — .gap - Gap between items.
- `root0` — .className - CSS class name override.
- `root0` — .style - Inline style object.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Grid element.

#### `Label(root0, root0, root0, root0)`

Renders a Label component.

```typescript
function Label({ children, required, className }: LabelProps): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Label content.
- `root0` — .required - Whether required.
- `root0` — .className - CSS class name override.

**Returns:** The rendered Label element.

#### `Modal(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .children - Modal body content.
- `root0` — .open - Whether open.
- `root0` — .onClose - Close handler.
- `root0` — .title - Modal title text.
- `root0` — .size - Modal size.
- `root0` — .footer - Footer content.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Modal element.

#### `Pagination(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .page - Current page number.
- `root0` — .totalPages - Total number of pages.
- `root0` — .onChange - Page change handler.
- `root0` — .siblings - Visible sibling pages.
- `root0` — .boundaries - Boundary page count.
- `root0` — .size - Pagination size.
- `root0` — .showFirstLast - Show first/last buttons.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Pagination element.

#### `Progress(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .value - Current progress value.
- `root0` — .max - Maximum progress value.
- `root0` — .label - Progress label text.
- `root0` — .showValue - Whether to show value.
- `root0` — .color - Progress bar color.
- `root0` — .size - Progress bar size.
- `root0` — .indeterminate - Whether indeterminate.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Progress element.

#### `RadioGroup(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .label - Group label text.
- `root0` — .options - Radio options array.
- `root0` — .value - Selected value.
- `root0` — .onChange - Change handler.
- `root0` — .direction - Layout direction.
- `root0` — .error - Error message.
- `root0` — .disabled - Whether disabled.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered RadioGroup element.

#### `Select(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .label - Select label text.
- `root0` — .options - Select options array.
- `root0` — .value - Selected value.
- `root0` — .onChange - Change handler.
- `root0` — .placeholder - Placeholder text.
- `root0` — .error - Error message.
- `root0` — .hint - Hint text.
- `root0` — .size - Select size.
- `root0` — .disabled - Whether disabled.
- `root0` — .required - Whether required.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Select element.

#### `Separator(root0, root0, root0, root0, root0)`

Renders a Separator component.

```typescript
function Separator({
  orientation = 'horizontal',
  decorative = true,
  className,
  testId,
}: SeparatorProps): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .orientation - Horizontal or vertical.
- `root0` — .decorative - Whether purely decorative.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Separator element.

#### `Skeleton(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .width - Skeleton width.
- `root0` — .height - Skeleton height.
- `root0` — .circle - Whether circular.
- `root0` — .animation - Animation type.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Skeleton element.

#### `SkeletonCircle(root0, root0, root0, root0)`

Renders a SkeletonCircle component.

```typescript
function SkeletonCircle({ size = 40, className, testId }: { size?: number; className?: string; testId?: string; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .size - Circle diameter.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered SkeletonCircle element.

#### `SkeletonText(root0, root0, root0, root0)`

Renders a SkeletonText component.

```typescript
function SkeletonText({ lines = 3, className, testId }: { lines?: number; className?: string; testId?: string; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .lines - Number of text lines.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered SkeletonText element.

#### `Spacer(root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .size - Spacer size.
- `root0` — .horizontal - Whether horizontal.
- `root0` — .className - CSS class name override.
- `root0` — .style - Inline style object.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Spacer element.

#### `Spinner(root0, root0, root0, root0)`

Renders a Spinner component.

```typescript
function Spinner({ size = 'md', className, testId }: SpinnerProps): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .size - Spinner size.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Spinner element.

#### `Switch(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .label - Switch label text.
- `root0` — .checked - Whether checked.
- `root0` — .onChange - Change handler.
- `root0` — .size - Switch size (unused in RN).
- `root0` — .disabled - Whether disabled.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Switch element.

#### `Table(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .columns - Column definitions.
- `root0` — .data - Table row data.
- `root0` — .rowKey - Row key accessor.
- `root0` — .onRowClick - Row click handler.
- `root0` — .striped - Whether striped rows.
- `root0` — .bordered - Whether bordered.
- `root0` — .hoverable - Whether rows hoverable.
- `root0` — .loading - Whether loading.
- `root0` — .emptyContent - Empty state message.
- `root0` — .sort - Active sort state.
- `root0` — .onSort - Sort handler.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Table element.

#### `Tabs(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .items - Tab items array.
- `root0` — .value - Controlled active tab.
- `root0` — .defaultValue - Default active tab.
- `root0` — .onChange - Tab change handler.
- `root0` — .fitted - Whether tabs fill width.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Tabs element.

#### `Toast(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — Component props.
- `root0` — .title - Toast title text.
- `root0` — .description - Toast description text.
- `root0` — .status - Status type.
- `root0` — .duration - Auto-dismiss duration (ms).
- `root0` — .dismissible - Whether dismissible.
- `root0` — .onDismiss - Dismiss handler.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

**Returns:** The rendered Toast element.

#### `ToastContainer(root0, root0, root0)`

Renders a ToastContainer component.

```typescript
function ToastContainer({ children, position = 'bottom-right' }: { children: React.ReactNode; position?: "top" | "top-right" | "top-left" | "bottom" | "bottom-right" | "bottom-left"; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Toast elements.
- `root0` — .position - Screen position.

**Returns:** The rendered ToastContainer element.

#### `ToastProvider(root0, root0, root0)`

Renders a ToastProvider component.

```typescript
function ToastProvider({ children, position = 'bottom-right' }: { children: React.ReactNode; position?: "top" | "top-right" | "top-left" | "bottom" | "bottom-right" | "bottom-left"; }): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - App content.
- `root0` — .position - Toast position.

**Returns:** The rendered ToastProvider element.

#### `Tooltip(root0, root0, root0, root0, root0)`

Renders a Tooltip component.

```typescript
function Tooltip({ children, content, className, testId }: TooltipProps): React.JSX.Element
```

- `root0` — Component props.
- `root0` — .children - Trigger element.
- `root0` — .content - Tooltip content.
- `root0` — .className - CSS class name override.
- `root0` — .testId - Test identifier.

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

## Translations

Translation strings are provided by `@molecule/app-locales-ui`.
