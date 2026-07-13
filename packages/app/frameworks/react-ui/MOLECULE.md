# @molecule/app-ui-react

React UI components for molecule.dev.

Provides React implementations of the `@molecule/app-ui` component
interfaces using the UIClassMap abstraction from `@molecule/app-ui`.

## Type
`framework`

## Installation
```bash
npm install @molecule/app-ui-react
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

#### `AuthGuardProps`

Props for {@link AuthGuard}.

All props are optional — the default behavior (loading tag → redirect
to `/login` → `<Outlet />`) matches the bare-bones guard apps were
shipping locally. The props let apps customize per-call without
forking the component.

```typescript
interface AuthGuardProps {
  /**
   * Element rendered while `useAuth().state.initialized` is `false`.
   * Overrides the default `<div data-mol-id="auth-guard-loading">…</div>`
   * loading tag — pass a full-page spinner or any other UI you want
   * during the auth bootstrap window.
   */
  loadingFallback?: ReactNode
  /**
   * i18n key used for the default loading-tag text. Defaults to
   * `'common.loading'`. Ignored when `loadingFallback` is set.
   */
  loadingKey?: string
  /**
   * Fallback text if the i18n key is missing. Defaults to `'Loading...'`
   * (the project-canonical ASCII glyph — Phase C of the locale
   * canonicalization plan). Ignored when `loadingFallback` is set.
   */
  loadingDefault?: string
  /**
   * Path to redirect to when the user is not authenticated. Defaults to
   * `'/login'`. The current `useLocation()` is preserved as `state.from`
   * for post-login restoration.
   */
  loginPath?: string
  /**
   * Callback invoked when `isAuthenticated` transitions to `true` (or is
   * already `true` on first render). Useful for one-shot per-app
   * bootstrap effects (e.g. seeding fixture data). The caller is
   * responsible for idempotency if the auth state can flip back and
   * forth — this fires on every transition.
   */
  onAuthenticated?: () => void
  /**
   * Children to render when authenticated. Defaults to `<Outlet />`,
   * which is the React Router pattern this guard is designed for.
   */
  children?: ReactNode
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

#### `IconProps`

Props for {@link Icon}.

Extends `SVGProps<SVGSVGElement>` so callers can pass any SVG / HTML
attribute the underlying `<svg>` accepts, including `data-mol-id`,
`aria-*`, `role`, event handlers, `style`, etc. — without the
component needing to enumerate them.

```typescript
interface IconProps extends Omit<
  SVGProps<SVGSVGElement>,
  'width' | 'height' | 'viewBox' | 'fill'
> {
  /**
   * Name of the glyph to look up in the bonded icon set. Typed as
   * {@link IconName} so a typo fails the type-check instead of throwing at
   * render time; sets with extra glyphs augment `CustomIconNames` in
   * `@molecule/app-icons` to widen it.
   */
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 20. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
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

#### `LanguagePickerProps`

Props for {@link LanguagePicker}.

Extends standard `<button>` attributes so callers can pass any extra
`data-*`, `aria-*`, event handler, or `style` prop without forking the
component. The named props let apps customize the trigger label, icon,
size, and modal heading without spreading attribute concerns.

```typescript
interface LanguagePickerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'onClick' | 'type' | 'children'
> {
  /** i18n key for the trigger button label / aria-label. Defaults to `'footer.language'`. */
  labelKey?: string
  /** Fallback label if the i18n key is missing. Defaults to `'Language'`. */
  labelDefault?: string
  /** i18n key for the modal title. Defaults to `'languagePicker.modalTitle'`. */
  modalTitleKey?: string
  /** Fallback modal title if the i18n key is missing. Defaults to `'Choose language'`. */
  modalTitleDefault?: string
  /** Icon glyph to render before the current locale name. Defaults to `'globe'`. */
  icon?: IconName
  /** Pixel size for the rendered icon. Defaults to `16`. */
  iconSize?: number
  /**
   * What to render inside the trigger button.
   *
   * - `'name'` — globe icon + current locale's native name (e.g. `🌐 English`).
   *   This is the default; matches the molecule-dev footer pattern.
   * - `'code'` — globe icon + lowercase locale code (e.g. `🌐 en`). Useful in
   *   tight chrome where the long native name (e.g. "Bahasa Indonesia") would wrap.
   * - `'icon'` — globe icon only. Useful in icon-bar headers.
   */
  display?: 'name' | 'code' | 'icon'
  /** Optional className appended to the trigger button. */
  className?: string
  /** Optional render override: receives `{ open }` and replaces the default trigger. */
  renderTrigger?: (open: () => void) => ReactNode
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

#### `PanelCloseProviderProps`

Props for {@link PanelCloseProvider}.

```typescript
interface PanelCloseProviderProps {
  /** Callback that dismisses the enclosing drawer/modal. */
  close: () => void
  /** Panel content that may call {@link usePanelClose}. */
  children: ReactNode
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

Props for the Separator component.

```typescript
interface SeparatorProps extends BaseProps {
  /**
   * Orientation of the separator.
   */
  orientation?: 'horizontal' | 'vertical'

  /**
   * Decorative separators are purely visual.
   */
  decorative?: boolean
}
```

#### `SidebarUserCardProps`

Props for the {@link SidebarUserCard} component.

Extends standard `<button>` attributes so callers can pass extra
`data-*`, `aria-*`, `style`, or event handler props onto the trigger
button without forking. The named props below cover the common
customization points.

```typescript
interface SidebarUserCardProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'onClick' | 'children'
> {
  /**
   * Panel content shown inside the drawer/modal (typically the app's
   * `SettingsPanel`). It can dismiss the drawer by calling
   * `usePanelClose()` — no `onClose` prop-threading required.
   */
  children: ReactNode
  /**
   * Display name override. When omitted, falls back to
   * `useAuth().user?.name`, then `email`, then a guest label.
   */
  name?: string
  /**
   * Secondary line under the name (role, plan, status, etc.).
   * Apps typically pass something like `t('sidebar.memberStatus', {}, { defaultValue: 'Premium Member' })`.
   * When omitted and the auth user has an email, the email is shown instead.
   */
  secondaryLine?: string
  /** Optional avatar image URL — overrides `useAuth().user?.avatarUrl`. */
  avatarUrl?: string
  /** i18n key for the trigger button's aria-label. Default: `'sidebarUserCard.open'`. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Default: `'Open account menu'`. */
  ariaLabelDefault?: string
  /**
   * `data-mol-id` for the trigger button. Defaults to
   * `'sidebar-user-card'`. Pass a different value (e.g. `'user-menu'`)
   * to disambiguate or align with an app's existing e2e selectors.
   */
  dataMolId?: string
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

#### `ThemeToggleProps`

Props for {@link ThemeToggle}.

Extends standard `<button>` attributes so callers can pass any extra
`data-*`, `aria-*`, event handler, or `style` prop without forking the
component. The handful of explicitly named props below let apps swap
the icon glyphs, label, or size without spreading attribute concerns.

```typescript
interface ThemeToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'aria-pressed' | 'onClick' | 'type'
> {
  /** i18n key for the `aria-label`. Defaults to `'theme.toggle'`. */
  ariaLabelKey?: string
  /** Fallback `aria-label` if the i18n key is missing. Defaults to `'Toggle theme'`. */
  ariaLabelDefault?: string
  /** Icon name to render in dark mode. Defaults to `'moon'`. */
  darkIcon?: IconName
  /** Icon name to render in light mode. Defaults to `'sun'`. */
  lightIcon?: IconName
  /** Pixel size for the rendered icon. Defaults to `20`. */
  iconSize?: number
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

#### `UserMenuPopoverPanelProps`

Props for {@link UserMenuPopoverPanel}.

```typescript
interface UserMenuPopoverPanelProps {
  /**
   * Panel body — typically a set of `<Link>` nav items and a
   * `<UserMenuPopoverSignOut />`. Rendered inside a `<nav>` below the
   * built-in identity header.
   */
  children: ReactNode
  /** Extra className composed onto the absolute-positioned panel. */
  className?: string
  /** i18n key for the panel's aria-label. Default: `'userMenu.panelLabel'`. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Default: `'Account menu'`. */
  ariaLabelDefault?: string
  /** `data-mol-id` for the panel. Default: `'user-menu-panel'`. */
  dataMolId?: string
}
```

#### `UserMenuPopoverProps`

Props for {@link UserMenuPopover}.

```typescript
interface UserMenuPopoverProps {
  /**
   * The trigger and panel — typically `<UserMenuPopoverTrigger />` and
   * `<UserMenuPopoverPanel>`.
   */
  children: ReactNode
  /**
   * Label shown when there is no authenticated user. Defaults to the
   * `userMenuPopover.guest` translation (English fallback `"Account"`).
   */
  guestName?: string
  /** Extra className composed onto the relative-positioned container. */
  className?: string
}
```

#### `UserMenuPopoverSignOutProps`

Props for {@link UserMenuPopoverSignOut}.

```typescript
interface UserMenuPopoverSignOutProps {
  /** i18n key for the button label. Default: `'userMenu.signOut'`. */
  labelKey?: string
  /** Fallback label if the i18n key is missing. Default: `'Sign out'`. */
  labelDefault?: string
  /** `data-mol-id` for the button. Default: `'user-menu-sign-out'`. */
  dataMolId?: string
  /** Extra className composed onto the button. */
  className?: string
}
```

#### `UserMenuPopoverTriggerProps`

Props for {@link UserMenuPopoverTrigger}.

```typescript
interface UserMenuPopoverTriggerProps {
  /** i18n key for the trigger's aria-label. Default: `'userMenu.open'`. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Default: `'Open user menu'`. */
  ariaLabelDefault?: string
  /** `data-mol-id` for the trigger button. Default: `'user-menu'`. */
  dataMolId?: string
  /** Extra className composed onto the trigger button. */
  className?: string
}
```

#### `UserMenuProps`

Props for {@link UserMenu}.

The inner trigger is a Molecule `<Button>` whose own prop set
conflicts with raw `ButtonHTMLAttributes` (color, value, size enums),
so this component exposes a curated set of customization points
instead of extending HTML attributes. For one-off extra attributes,
pass them via `dataMolId` / `className` / `style` props.

```typescript
interface UserMenuProps {
  /**
   * Panel content shown inside the drawer/modal (typically the app's
   * `SettingsPanel`). It can dismiss the drawer by calling
   * `usePanelClose()` — no `onClose` prop-threading required.
   */
  children: ReactNode
  /**
   * i18n key for the trigger button's aria-label. Defaults to
   * `'userMenu.open'`. Apps whose existing locales use a different key
   * (e.g. `'userMenu.openButton'`) can override.
   */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Defaults to `"Open user menu"`. */
  ariaLabelDefault?: string
  /** Icon name for the trigger button. Defaults to `'user'`. */
  triggerIcon?: IconName
  /** Pixel size for the trigger icon. Defaults to 20. */
  triggerIconSize?: number
  /**
   * `data-mol-id` for the trigger button. Defaults to `'user-menu'`.
   * Pass an explicit value to disambiguate when the same page mounts
   * more than one UserMenu.
   */
  dataMolId?: string
  /** Extra className composed onto the trigger button. */
  className?: string
  /** Whether the trigger button is disabled. */
  disabled?: boolean
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

#### `AuthGuard(props)`

Route-element guard for authenticated sections of a React Router tree.

- While `useAuth().state.initialized` is `false`, renders the
  `loadingFallback` (or the default `<div data-mol-id="auth-guard-loading">{t('common.loading')}</div>`).
- If the user is not authenticated, redirects to `loginPath` carrying
  the attempted location in `state.from` for post-login restoration.
- Otherwise renders `children` (or `<Outlet />` if none).

The default loading tag carries `data-mol-id="auth-guard-loading"`
so AI agents and e2e tests can target it reliably. When the caller
passes a custom `loadingFallback`, it's the caller's responsibility
to include any data-mol-id they need.

```typescript
function AuthGuard({
  loadingFallback,
  loadingKey = 'common.loading',
  loadingDefault = 'Loading...',
  loginPath = '/login',
  onAuthenticated,
  children,
}?: AuthGuardProps): ReactNode
```

- `props` — {@link AuthGuardProps}

#### `cn(inputs)`

Merge class name strings, filtering out falsy values (undefined, null, false).

```typescript
function cn(inputs?: (string | false | null | undefined)[]): string
```

- `inputs` — Class name strings or falsy values to be filtered out.

**Returns:** A single space-separated class string.

#### `Icon(props)`

Renders an SVG glyph looked up by `name` from the bonded
`@molecule/app-icons` set.

Handles two icon-data shapes returned by the bond:
  1. Pre-rendered SVG markup (`icon.svg`) — injected via
     `dangerouslySetInnerHTML`. The bond is the trust boundary; only
     bond a set that controls its own SVG strings.
  2. Structured paths (`icon.paths`) — rendered as discrete `<path>`
     children, with optional stroke styling forwarded from the icon set.

Any extra HTML/SVG attribute (e.g. `data-mol-id`, `aria-label`,
`role="img"`, `onClick`) is forwarded to the root `<svg>` via spread.

Decorative by default: when the caller passes no `aria-label` /
`aria-labelledby` / `role`, the SVG is rendered `aria-hidden` +
`focusable="false"` so screen readers skip it (an unnamed inline SVG is
announced as a stray "image" by some combos). Passing any of those props
opts the icon into the accessibility tree.

```typescript
function Icon({ name, size = 20, className, ...rest }: IconProps): React.JSX.Element
```

- `props` — {@link IconProps}

**Returns:** An `<svg>` element rendering the named glyph.

#### `LanguagePicker(props)`

Globe-icon button that opens a modal grid of every locale registered
with the bonded i18n provider. Clicking a locale calls `setLocale`
and closes the modal.

Reads `locale`, `setLocale`, and `locales` from {@link useTranslation},
so the list of choices stays in sync with whatever set the
`setupI18nDefault` (or any other i18n setup) registered. No hardcoded
language list — adding a locale to the i18n bond adds it to the picker.

Molecule-convention defaults baked in:

- `data-mol-id="language-picker-trigger"` on the trigger button
- `data-mol-id="language-picker-modal"` on the modal dialog
- `data-mol-id="language-picker-option-<code>"` on each locale button
- `data-active` on the currently-selected locale button
- `aria-label` from the `footer.language` i18n key (default `"Language"`)

```typescript
function LanguagePicker({
  labelKey = 'footer.language',
  labelDefault = 'Language',
  modalTitleKey = 'languagePicker.modalTitle',
  modalTitleDefault = 'Choose language',
  icon = 'globe',
  iconSize = 16,
  display = 'name',
  className,
  renderTrigger,
  ...rest
}?: LanguagePickerProps): JSX.Element
```

- `props` — {@link LanguagePickerProps}

#### `PanelCloseProvider(props)`

Provides the panel-close callback to descendants. Rendered internally
by `UserMenu` and `SidebarUserCard` around their `children`; apps do
not normally render this directly.

```typescript
function PanelCloseProvider({ close, children }: PanelCloseProviderProps): JSX.Element
```

- `props` — The close callback and the panel content.

**Returns:** The children wrapped in the close-context provider.

#### `SidebarUserCard({
  children,
  name,
  secondaryLine,
  avatarUrl,
  ariaLabelKey = 'sidebarUserCard.open',
  ariaLabelDefault = 'Open account menu',
  dataMolId = 'sidebar-user-card',
  className,
  ...rest
})`

Sidebar-resident user-account card: avatar + name + status line, opens
the app's settings drawer on click.

Drop-in replacement for `<UserMenu />` when the trigger lives inside a
vertical sidebar (e.g. as the `userMenu` slot of `<SidebarLayout>`).
Reads name/email/avatar from `useAuth()` by default; pass explicit
`name` / `secondaryLine` / `avatarUrl` props to override.

Ships with `data-mol-id="sidebar-user-card"` on the trigger button
by default for AI-agent / e2e selection. Callers can override by
passing `data-mol-id` as an extra prop.

```typescript
function SidebarUserCard({
  children,
  name,
  secondaryLine,
  avatarUrl,
  ariaLabelKey = 'sidebarUserCard.open',
  ariaLabelDefault = 'Open account menu',
  dataMolId = 'sidebar-user-card',
  className,
  ...rest
}: SidebarUserCardProps): JSX.Element
```

#### `ThemeToggle(props)`

Button that flips the wired theme bond between light and dark.

Reads `mode` and `toggleTheme` from `useTheme()` and shows the
configured dark/light icon accordingly. Ships with molecule
conventions out of the box:

- `data-mol-id="theme-toggle"` for AI-agent / e2e selection
- `data-mode={mode}` so tests can assert current state via DOM
- `aria-pressed={mode === 'dark'}` for screen-reader state
- `aria-label` from the `theme.toggle` i18n key (default `"Toggle theme"`)

Every per-app variant the fleet was carrying — extra `data-*` attrs,
additional `aria-*` flags, custom event handlers — is now absorbed
via the spread of unknown props. Apps that need different icons or
label text use the named props.

```typescript
function ThemeToggle({
  ariaLabelKey = 'theme.toggle',
  ariaLabelDefault = 'Toggle theme',
  darkIcon = 'moon',
  lightIcon = 'sun',
  iconSize = 20,
  className,
  ...rest
}?: ThemeToggleProps): JSX.Element
```

- `props` — {@link ThemeToggleProps}

#### `ToastProvider(root0, root0, root0)`

Provider component that manages global toast state.

```typescript
function ToastProvider({
  children,
  position = 'bottom-right',
}: ToastProviderProps): React.JSX.Element
```

- `root0` — The component props.
- `root0` — .children - The child elements to render within the provider.
- `root0` — .position - The default position for toasts.

**Returns:** The rendered provider with toast container.

#### `usePanelClose()`

Returns the callback that dismisses the drawer the current panel is
mounted in. Safe to call anywhere — returns a no-op when no enclosing
`UserMenu` / `SidebarUserCard` provides one (e.g. a `SettingsPanel`
rendered as a standalone page).

```typescript
function usePanelClose(): () => void
```

**Returns:** A function that closes the enclosing drawer, or a no-op.

#### `UserMenu({
  children,
  ariaLabelKey = 'userMenu.open',
  ariaLabelDefault = 'Open user menu',
  triggerIcon = 'user',
  triggerIconSize = 20,
  dataMolId = 'user-menu',
  className,
  disabled,
})`

Avatar-style trigger that opens the app's settings panel in a drawer.

The panel content is passed as `children` so apps can mount their own
`SettingsPanel` (which diverges per app) inside the shared drawer
chrome. Panel content dismisses the drawer via `usePanelClose()`.

Ships with `data-mol-id="user-menu"` on the trigger button by
default for AI-agent / e2e selection.

```typescript
function UserMenu({
  children,
  ariaLabelKey = 'userMenu.open',
  ariaLabelDefault = 'Open user menu',
  triggerIcon = 'user',
  triggerIconSize = 20,
  dataMolId = 'user-menu',
  className,
  disabled,
}: UserMenuProps): JSX.Element
```

#### `UserMenuPopover(props)`

Container for the inline popover account menu. Owns the open state and
the auto-dismiss behaviour (route change, `popstate`, outside click,
`Escape`), and provides the resolved account identity to its
sub-components via context.

```typescript
function UserMenuPopover({
  children,
  guestName,
  className,
}: UserMenuPopoverProps): React.JSX.Element
```

- `props` — The popover children, optional guest label, and className.

**Returns:** The relative-positioned popover container.

#### `UserMenuPopoverPanel(props)`

The popover panel: an absolutely-positioned card with a built-in
identity header (name + email) and a `<nav>` wrapping the caller's nav
items. Renders nothing while the popover is closed.

Provides only the structural concerns (absolute positioning above the
trigger, `rounded-xl` border frame, the header/nav layout). Cosmetic
choices — width, background, padding, shadow — are per-app: pass them
via `className`. `cn()` concatenates (it does not tailwind-merge), so
the panel never bakes a width/background the caller would have to
fight.

```typescript
function UserMenuPopoverPanel({
  children,
  className,
  ariaLabelKey = 'userMenu.panelLabel',
  ariaLabelDefault = 'Account menu',
  dataMolId = 'user-menu-panel',
}: UserMenuPopoverPanelProps): React.JSX.Element | null
```

- `props` — The nav children, className, and aria-label overrides.

**Returns:** The popover panel, or `null` when closed.

#### `UserMenuPopoverSignOut(props)`

The sign-out nav item — closes the popover and calls `auth.logout()`.
Drop it in as the last child of `<UserMenuPopoverPanel>`.

```typescript
function UserMenuPopoverSignOut({
  labelKey = 'userMenu.signOut',
  labelDefault = 'Sign out',
  dataMolId = 'user-menu-sign-out',
  className,
}: UserMenuPopoverSignOutProps): React.JSX.Element
```

- `props` — Label overrides, `data-mol-id`, and className.

**Returns:** The sign-out button.

#### `UserMenuPopoverTrigger(props)`

The trigger button: an initials avatar plus the account name and email,
styled as a full-width sidebar card. Toggles the popover panel.

```typescript
function UserMenuPopoverTrigger({
  ariaLabelKey = 'userMenu.open',
  ariaLabelDefault = 'Open user menu',
  dataMolId = 'user-menu',
  className,
}: UserMenuPopoverTriggerProps): React.JSX.Element
```

- `props` — aria-label overrides, `data-mol-id`, and className.

**Returns:** The popover trigger button.

#### `useToast()`

Hook to access the toast context for adding and removing toasts.

```typescript
function useToast(): ToastContextValue
```

**Returns:** The toast context value with toast management methods.

#### `useUserMenuPopoverClose()`

Returns a callback that closes the enclosing `UserMenuPopover`. Useful
for nav-item `onClick` handlers that should dismiss the popover even
when they don't change the route. Returns a no-op when called outside
a `UserMenuPopover`.

```typescript
function useUserMenuPopoverClose(): () => void
```

**Returns:** A function that closes the popover.

### Constants

#### `Accordion`

Accordion component.

```typescript
const Accordion: React.ForwardRefExoticComponent<AccordionProps<string> & React.RefAttributes<HTMLDivElement>>
```

#### `Alert`

Alert component.

```typescript
const Alert: React.ForwardRefExoticComponent<AlertProps & React.RefAttributes<HTMLDivElement>>
```

#### `Avatar`

Avatar component.

```typescript
const Avatar: React.ForwardRefExoticComponent<AvatarProps & React.RefAttributes<HTMLDivElement>>
```

#### `Badge`

Badge component.

```typescript
const Badge: React.ForwardRefExoticComponent<BadgeProps & React.RefAttributes<HTMLSpanElement>>
```

#### `Button`

Button component.

```typescript
const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>
```

#### `Card`

Card component.

```typescript
const Card: React.ForwardRefExoticComponent<CardProps & { 'data-mol-id'?: string; } & React.RefAttributes<HTMLDivElement>>
```

#### `CardContent`

Card content component.

```typescript
const CardContent: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>
```

#### `CardDescription`

Card description component.

```typescript
const CardDescription: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>>
```

#### `CardFooter`

Card footer component.

```typescript
const CardFooter: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>
```

#### `CardHeader`

Card header component.

```typescript
const CardHeader: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>
```

#### `CardTitle`

Card title component.

```typescript
const CardTitle: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLHeadingElement>>
```

#### `Checkbox`

Checkbox component.

```typescript
const Checkbox: React.ForwardRefExoticComponent<CheckboxProps & React.RefAttributes<HTMLInputElement>>
```

#### `Container`

Container component.

```typescript
const Container: React.ForwardRefExoticComponent<ContainerProps & React.RefAttributes<HTMLDivElement>>
```

#### `Dropdown`

Dropdown component.

```typescript
const Dropdown: React.ForwardRefExoticComponent<DropdownProps<string> & React.RefAttributes<HTMLDivElement>>
```

#### `DropdownLabel`

Dropdown label for grouping items.

```typescript
const DropdownLabel: React.ForwardRefExoticComponent<{ children: React.ReactNode; className?: string; } & React.RefAttributes<HTMLDivElement>>
```

#### `DropdownSeparator`

Dropdown separator for dividing groups.

```typescript
const DropdownSeparator: React.ForwardRefExoticComponent<{ className?: string; } & React.RefAttributes<HTMLDivElement>>
```

#### `EmptyState`

EmptyState component.

Displays a centered placeholder with an optional icon, title, description,
and a primary action when a list or section has no content.

```typescript
const EmptyState: React.ForwardRefExoticComponent<EmptyStateProps & React.RefAttributes<HTMLDivElement>>
```

#### `Flex`

Flex container component.

```typescript
const Flex: React.ForwardRefExoticComponent<FlexProps & React.RefAttributes<HTMLDivElement>>
```

#### `FloatingInput`

An input with a floating label.

Shows the placeholder text as a small uppercase label always visible at
the top of the input. On focus the label turns primary-colored.

Works as both a controlled and an uncontrolled input: when `value` is
omitted, the component tracks its own state seeded from `defaultValue`
and still forwards every `onChange` event to the caller.

```typescript
const FloatingInput: ForwardRefExoticComponent<FloatingInputProps & RefAttributes<HTMLInputElement>>
```

#### `Form`

Form component.

```typescript
const Form: React.ForwardRefExoticComponent<FormProps & React.RefAttributes<HTMLFormElement>>
```

#### `FormField`

Form field wrapper component.

```typescript
const FormField: React.ForwardRefExoticComponent<FormFieldProps & React.RefAttributes<HTMLDivElement>>
```

#### `Grid`

Grid container component.

```typescript
const Grid: React.ForwardRefExoticComponent<GridProps & React.RefAttributes<HTMLDivElement>>
```

#### `Input`

Input component.

```typescript
const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>
```

#### `Label`

Label component.

```typescript
const Label: React.ForwardRefExoticComponent<React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean; } & React.RefAttributes<HTMLLabelElement>>
```

#### `Modal`

Modal component.

Renders into a `document.body` portal. Forwards any extra `data-*` or
`aria-*` props on the rest spread to the inner dialog `<div>` (e.g.
callers commonly pass `data-mol-id="some-modal"` for AI-agent / e2e
selectors).

The internal close button always carries `data-mol-id="modal-close"`
as the molecule-convention default for the one fixed interactive
element inside the chrome.

```typescript
const Modal: React.ForwardRefExoticComponent<ModalProps & { 'data-mol-id'?: string; } & React.RefAttributes<HTMLDivElement>>
```

#### `PageHeader`

PageHeader component.

Renders a page title with optional breadcrumb trail, description, and
action buttons for a consistent page heading area.

```typescript
const PageHeader: React.ForwardRefExoticComponent<PageHeaderProps & React.RefAttributes<HTMLDivElement>>
```

#### `PageShell`

PageShell component.

Provides the top-level layout for authenticated pages with an optional
collapsible sidebar, a top bar, and a scrollable main content area.

```typescript
const PageShell: React.ForwardRefExoticComponent<PageShellProps & React.RefAttributes<HTMLDivElement>>
```

#### `Pagination`

Pagination component.

```typescript
const Pagination: React.ForwardRefExoticComponent<PaginationProps & React.RefAttributes<HTMLElement>>
```

#### `Progress`

Progress component.

```typescript
const Progress: React.ForwardRefExoticComponent<ProgressProps & React.RefAttributes<HTMLDivElement>>
```

#### `RadioGroup`

RadioGroup component.

```typescript
const RadioGroup: React.ForwardRefExoticComponent<RadioGroupProps<string> & React.RefAttributes<HTMLDivElement>>
```

#### `Select`

Select component.

```typescript
const Select: React.ForwardRefExoticComponent<SelectProps<string> & React.RefAttributes<HTMLSelectElement>>
```

#### `Separator`

Separator component.

```typescript
const Separator: React.ForwardRefExoticComponent<SeparatorProps & React.RefAttributes<HTMLDivElement>>
```

#### `Skeleton`

Skeleton component.

```typescript
const Skeleton: React.ForwardRefExoticComponent<SkeletonProps & React.RefAttributes<HTMLDivElement>>
```

#### `SkeletonCircle`

Skeleton circle (avatar placeholder).

```typescript
const SkeletonCircle: React.ForwardRefExoticComponent<{ size?: number; className?: string; } & React.RefAttributes<HTMLDivElement>>
```

#### `SkeletonText`

Skeleton text line.

```typescript
const SkeletonText: React.ForwardRefExoticComponent<{ lines?: number; className?: string; } & React.RefAttributes<HTMLDivElement>>
```

#### `Spacer`

Spacer component.

```typescript
const Spacer: React.ForwardRefExoticComponent<SpacerProps & React.RefAttributes<HTMLDivElement>>
```

#### `Spinner`

Spinner component.

Extracts data-* and aria-* props from the rest spread so callers can
pass `data-mol-id`, custom `aria-*` overrides, etc. without forking.

```typescript
const Spinner: React.ForwardRefExoticComponent<SpinnerProps & { 'data-mol-id'?: string; } & React.RefAttributes<HTMLDivElement>>
```

#### `Switch`

Switch component.

```typescript
const Switch: React.ForwardRefExoticComponent<SwitchProps & React.RefAttributes<HTMLButtonElement>>
```

#### `Table`

Table component.

```typescript
const Table: React.ForwardRefExoticComponent<TableProps<Record<string, unknown>> & React.RefAttributes<HTMLTableElement>>
```

#### `Tabs`

Tabs component.

```typescript
const Tabs: React.ForwardRefExoticComponent<TabsProps<string> & React.RefAttributes<HTMLDivElement>>
```

#### `Textarea`

Textarea component.

```typescript
const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>
```

#### `Toast`

Single Toast component.

```typescript
const Toast: React.ForwardRefExoticComponent<ToastProps & React.RefAttributes<HTMLDivElement>>
```

#### `ToastContainer`

Container that positions toasts on screen via a portal.

```typescript
const ToastContainer: React.ForwardRefExoticComponent<ToastContainerProps & React.RefAttributes<HTMLDivElement>>
```

#### `Tooltip`

Tooltip component.

```typescript
const Tooltip: React.ForwardRefExoticComponent<TooltipProps & React.RefAttributes<HTMLDivElement>>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-icons` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-ui`.
