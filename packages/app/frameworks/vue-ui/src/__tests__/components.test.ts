/**
 * Tests for Vue UI components.
 *
 * Tests component definitions, variant maps, props configurations,
 * and setup function behavior using mocked Vue and ClassMap dependencies.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ============================================================================
// Mock Vue
// ============================================================================

const mockH = vi.fn((...args: unknown[]) => ({
  __vnode: true,
  type: args[0],
  props: args[1],
  children: args[2],
}))
const mockRef = vi.fn((val: unknown) => ({ value: val }))
const mockComputed = vi.fn((fn: () => unknown) => ({ value: fn() }))
const mockWatch = vi.fn()
const mockOnMounted = vi.fn()
const mockOnUnmounted = vi.fn()
const mockProvide = vi.fn()
const mockInject = vi.fn()
const mockReactive = vi.fn((obj: unknown) => obj)

const mockDefineComponent = vi.fn((opts: Record<string, unknown>) => opts)

vi.mock('vue', () => ({
  defineComponent: (opts: Record<string, unknown>) => mockDefineComponent(opts),
  h: (...args: unknown[]) => mockH(...args),
  ref: (val: unknown) => mockRef(val),
  computed: (fn: () => unknown) => mockComputed(fn),
  watch: (...args: unknown[]) => mockWatch(...args),
  onMounted: (fn: unknown) => mockOnMounted(fn),
  onUnmounted: (fn: unknown) => mockOnUnmounted(fn),
  provide: (...args: unknown[]) => mockProvide(...args),
  inject: (...args: unknown[]) => mockInject(...args),
  reactive: (obj: unknown) => mockReactive(obj),
  Teleport: 'Teleport',
}))

// ============================================================================
// Mock @molecule/app-ui with getClassMap
// ============================================================================

const mockClassMap = {
  cn: vi.fn((...args: unknown[]) => args.filter(Boolean).join(' ')),
  button: vi.fn(
    (opts?: Record<string, unknown>) =>
      `button-classes variant-${opts?.variant || 'solid'} color-${opts?.color || 'primary'} size-${opts?.size || 'md'}${opts?.fullWidth ? ' full-width' : ''}`,
  ),
  input: vi.fn(
    (opts?: Record<string, unknown>) =>
      `input-classes error-${opts?.error || false} size-${opts?.size || 'md'}`,
  ),
  textarea: vi.fn(
    (opts?: Record<string, unknown>) => `textarea-classes error-${opts?.error || false}`,
  ),
  select: vi.fn(
    (opts?: Record<string, unknown>) =>
      `select-classes error-${opts?.error || false} size-${opts?.size || 'md'}`,
  ),
  checkbox: vi.fn(
    (opts?: Record<string, unknown>) => `checkbox-classes error-${opts?.error || false}`,
  ),
  radio: vi.fn((opts?: Record<string, unknown>) => `radio-classes error-${opts?.error || false}`),
  switchBase: vi.fn(
    (opts?: Record<string, unknown>) => `switch-base-classes size-${opts?.size || 'md'}`,
  ),
  switchThumb: vi.fn(
    (opts?: Record<string, unknown>) => `switch-thumb-classes size-${opts?.size || 'md'}`,
  ),
  label: vi.fn(
    (opts?: Record<string, unknown>) => `label-classes required-${opts?.required || false}`,
  ),
  formError: 'form-error-classes',
  formHint: 'form-hint-classes',
  card: vi.fn(
    (opts?: Record<string, unknown>) => `card-classes variant-${opts?.variant || 'default'}`,
  ),
  cardHeader: 'card-header-classes',
  cardTitle: 'card-title-classes',
  cardDescription: 'card-description-classes',
  cardContent: 'card-content-classes',
  cardFooter: 'card-footer-classes',
  badge: vi.fn(
    (opts?: Record<string, unknown>) =>
      `badge-classes variant-${opts?.variant || 'default'} size-${opts?.size || 'md'}`,
  ),
  alert: vi.fn(
    (opts?: Record<string, unknown>) => `alert-classes variant-${opts?.variant || 'default'}`,
  ),
  alertTitle: 'alert-title-classes',
  alertDescription: 'alert-description-classes',
  avatar: vi.fn((opts?: Record<string, unknown>) => `avatar-classes size-${opts?.size || 'md'}`),
  avatarImage: 'avatar-image-classes',
  avatarFallback: 'avatar-fallback-classes',
  modal: vi.fn((opts?: Record<string, unknown>) => `modal-classes size-${opts?.size || 'md'}`),
  dialogOverlay: 'dialog-overlay-classes',
  dialogHeader: 'dialog-header-classes',
  dialogFooter: 'dialog-footer-classes',
  dialogTitle: 'dialog-title-classes',
  dialogDescription: 'dialog-description-classes',
  dialogClose: 'dialog-close-classes',
  spinner: vi.fn((opts?: Record<string, unknown>) => `spinner-classes size-${opts?.size || 'md'}`),
  separator: vi.fn(
    (opts?: Record<string, unknown>) =>
      `separator-classes orientation-${opts?.orientation || 'horizontal'}`,
  ),
  progress: vi.fn(() => 'progress-classes'),
  progressBar: vi.fn(() => 'progress-bar-classes'),
  skeleton: vi.fn(() => 'skeleton-classes'),
  toast: vi.fn(
    (opts?: Record<string, unknown>) => `toast-classes variant-${opts?.variant || 'default'}`,
  ),
  toastTitle: 'toast-title-classes',
  toastDescription: 'toast-description-classes',
  toastClose: 'toast-close-classes',
  toastViewport: 'toast-viewport-classes',
  toastAction: 'toast-action-classes',
  tooltip: vi.fn(() => 'tooltip-classes'),
  tooltipContent: 'tooltip-content-classes',
  accordion: vi.fn(() => 'accordion-trigger-classes'),
  accordionRoot: 'accordion-root-classes',
  accordionItem: 'accordion-item-classes',
  accordionContent: 'accordion-content-classes',
  accordionContentInner: 'accordion-content-inner-classes',
  pagination: vi.fn(
    (opts?: Record<string, unknown>) =>
      `pagination-classes active-${opts?.active || false} size-${opts?.size || 'md'}`,
  ),
  paginationRoot: 'pagination-root-classes',
  paginationContent: 'pagination-content-classes',
  paginationLink: 'pagination-link-classes',
  paginationPrevious: 'pagination-previous-classes',
  paginationNext: 'pagination-next-classes',
  paginationEllipsis: 'pagination-ellipsis-classes',
  dropdownContent: 'dropdown-content-classes',
  dropdownItem: 'dropdown-item-classes',
  dropdownSeparator: 'dropdown-separator-classes',
  dropdownLabel: 'dropdown-label-classes',
  table: 'table-classes',
  tableHeader: 'table-header-classes',
  tableBody: 'table-body-classes',
  tableFooter: 'table-footer-classes',
  tableRow: 'table-row-classes',
  tableHead: 'table-head-classes',
  tableCell: 'table-cell-classes',
  tableCaption: 'table-caption-classes',
  tabsList: 'tabs-list-classes',
  tabsTrigger: 'tabs-trigger-classes',
  tabsContent: 'tabs-content-classes',
  container: vi.fn(
    (opts?: Record<string, unknown>) => `container-centered size-${opts?.size || 'lg'}`,
  ),
  flex: vi.fn((opts?: Record<string, unknown>) => {
    const parts = ['flex-layout']
    if (opts?.direction) parts.push(`dir-${opts.direction}`)
    if (opts?.justify) parts.push(`justify-${opts.justify}`)
    if (opts?.align) parts.push(`align-${opts.align}`)
    if (opts?.wrap) parts.push(`wrap-${opts.wrap}`)
    if (opts?.gap) parts.push(`gap-${opts.gap}`)
    return parts.join(' ')
  }),
  grid: vi.fn((opts?: Record<string, unknown>) => {
    const parts = ['grid-layout']
    if (opts?.cols) parts.push(`cols-${opts.cols}`)
    if (opts?.gap) parts.push(`gap-${opts.gap}`)
    return parts.join(' ')
  }),
  gridRows: vi.fn((n: number) => `rows-${n}`),
  w: vi.fn((size: string) => `width-${size}`),
  maxW: vi.fn((size: string) => `max-width-${size}`),
  mxAuto: 'center-horizontal',
  displayBlock: 'display-block',
  displayInlineBlock: 'display-inline-block',
  center: 'center-classes',
  srOnly: 'screen-reader-only',
  notSrOnly: 'not-screen-reader-only',
  // Resolver functions
  cardPadding: vi.fn((size?: string) => (size === 'none' ? '' : 'card-padding-classes')),
  progressHeight: vi.fn(() => 'progress-height-classes'),
  progressColor: vi.fn(() => 'progress-color-classes'),
  toastContainer: vi.fn(() => 'toast-container-classes'),
  radioGroupLayout: vi.fn((dir?: string) =>
    dir === 'horizontal' ? 'radio-layout-horizontal' : 'radio-layout-vertical',
  ),
  spacer: vi.fn((opts?: { size?: string; horizontal?: boolean }) =>
    opts?.horizontal ? 'spacer-horizontal' : 'spacer-vertical',
  ),
  dialogContent: vi.fn(() => 'dialog-content-classes'),
  // Static string tokens
  iconXs: 'icon-xs',
  iconSm: 'icon-sm',
  iconMd: 'icon-md',
  buttonIconLeft: 'button-icon-left',
  buttonIconRight: 'button-icon-right',
  buttonSpinner: 'button-spinner',
  cardInteractive: 'card-interactive',
  alertIconWrapper: 'alert-icon-wrapper',
  alertContent: 'alert-content',
  alertDismiss: 'alert-dismiss',
  inputWrapper: 'input-wrapper',
  inputInner: 'input-inner',
  inputLeftElement: 'input-left-element',
  inputRightElement: 'input-right-element',
  inputClearButton: 'input-clear-button',
  inputPadLeft: 'input-pad-left',
  inputPadRight: 'input-pad-right',
  selectNative: 'select-native',
  labelBlock: 'label-block',
  formFieldset: 'form-fieldset',
  formField: 'form-field',
  controlLabel: 'control-label',
  controlContainer: 'control-container',
  controlText: 'control-text',
  controlDisabled: 'control-disabled',
  radioGroupLabel: 'radio-group-label',
  accordionChevron: 'accordion-chevron',
  accordionTriggerBase: 'accordion-trigger-base',
  tabsFitted: 'tabs-fitted',
  tabTriggerFitted: 'tab-trigger-fitted',
  tabTriggerIcon: 'tab-trigger-icon',
  paginationInteractive: 'pagination-interactive',
  progressWrapper: 'progress-wrapper',
  progressLabelContainer: 'progress-label-container',
  progressLabelText: 'progress-label-text',
  progressIndeterminate: 'progress-indeterminate',
  tableWrapper: 'table-wrapper',
  tableLoadingOverlay: 'table-loading-overlay',
  tableEmptyCell: 'table-empty-cell',
  tableSortWrapper: 'table-sort-wrapper',
  tableSortIcon: 'table-sort-icon',
  tableRowStriped: 'table-row-striped',
  tableRowHoverable: 'table-row-hoverable',
  tableRowClickable: 'table-row-clickable',
  tableHeadSortable: 'table-head-sortable',
  tableBordered: 'table-bordered',
  toastIconWrapper: 'toast-icon-wrapper',
  toastContentWrapper: 'toast-content-wrapper',
  dropdownTrigger: 'dropdown-trigger',
  dropdownItemIcon: 'dropdown-item-icon',
  dropdownItemLabel: 'dropdown-item-label',
  dropdownItemShortcut: 'dropdown-item-shortcut',
  dropdownItemDisabled: 'dropdown-item-disabled',
  tooltipTrigger: 'tooltip-trigger',
  avatarInitials: 'avatar-initials',
  avatarFallbackIcon: 'avatar-fallback-icon',
  avatarSquare: 'avatar-square',
  badgeSquare: 'badge-square',
  skeletonTextContainer: 'skeleton-text-container',
  skeletonCircle: 'skeleton-circle',
  skeletonWave: 'skeleton-wave',
  skeletonNone: 'skeleton-none',
  textRight: 'mock-text-right',
  dialogWrapper: 'dialog-wrapper-classes',
  dialogBody: 'dialog-body-classes',
}

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => mockClassMap,
}))

// ============================================================================
// Mock @molecule/app-icons
// ============================================================================

vi.mock('@molecule/app-icons', () => ({
  getIcon: (name: string) => ({
    paths: [{ d: `mock-path-${name}`, fillRule: 'evenodd', clipRule: 'evenodd' }],
  }),
  getIconSet: () => ({}),
  setIconSet: () => {},
  hasIconSet: () => true,
  getIconDataUrl: (name: string) => `url("data:image/svg+xml,mock-${name}")`,
}))

// ============================================================================
// Helper to reset mocks between tests
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks()
  // Restore cn to default behavior after clearAllMocks
  mockClassMap.cn.mockImplementation((...args: unknown[]) => args.filter(Boolean).join(' '))
})

// ============================================================================
// Button Component Tests
// ============================================================================

describe('Button component', () => {
  it('should be defined via defineComponent with correct name', async () => {
    const { Button } = await import('../components/Button.js')
    expect(Button).toBeDefined()
    expect(Button.name).toBe('MButton')
  })

  it('should have correct props defined', async () => {
    const { Button } = await import('../components/Button.js')
    const props = Button.props as Record<string, unknown>
    expect(props).toHaveProperty('variant')
    expect(props).toHaveProperty('color')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('loading')
    expect(props).toHaveProperty('loadingText')
    expect(props).toHaveProperty('fullWidth')
    expect(props).toHaveProperty('disabled')
    expect(props).toHaveProperty('type')
    expect(props).toHaveProperty('class')
  })

  it('should have correct default props', async () => {
    const { Button } = await import('../components/Button.js')
    const props = Button.props as Record<string, { default?: unknown }>
    expect(props.variant.default).toBe('solid')
    expect(props.color.default).toBe('primary')
    expect(props.size.default).toBe('md')
    expect(props.loading.default).toBe(false)
    expect(props.fullWidth.default).toBe(false)
    expect(props.disabled.default).toBe(false)
    expect(props.type.default).toBe('button')
  })

  it('should emit click events', async () => {
    const { Button } = await import('../components/Button.js')
    expect(Button.emits).toContain('click')
  })

  it('should have a setup function', async () => {
    const { Button } = await import('../components/Button.js')
    expect(typeof Button.setup).toBe('function')
  })

  it('should call setup and return a render function', async () => {
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Button text' }

    const renderFn = (Button.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'solid',
        color: 'primary',
        size: 'md',
        loading: false,
        fullWidth: false,
        disabled: false,
        type: 'button',
      },
      { slots: mockSlots, emit: mockEmit },
    )
    expect(typeof renderFn).toBe('function')
  })

  it('render function should call h with button element', async () => {
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Button text' }

    const renderFn = (Button.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'solid',
        color: 'primary',
        size: 'md',
        loading: false,
        fullWidth: false,
        disabled: false,
        type: 'button',
        class: undefined,
        loadingText: undefined,
      },
      { slots: mockSlots, emit: mockEmit },
    )
    renderFn()
    expect(mockH).toHaveBeenCalledWith(
      'button',
      expect.objectContaining({
        type: 'button',
        disabled: false,
        'aria-busy': false,
      }),
      expect.any(Array),
    )
  })

  it('render function should apply loading state', async () => {
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Button text' }

    const renderFn = (Button.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'solid',
        color: 'primary',
        size: 'md',
        loading: true,
        fullWidth: false,
        disabled: false,
        type: 'button',
        class: undefined,
        loadingText: 'Loading...',
      },
      { slots: mockSlots, emit: mockEmit },
    )
    renderFn()
    // When loading, the button should be disabled
    expect(mockH).toHaveBeenCalledWith(
      'button',
      expect.objectContaining({
        disabled: true,
        'aria-busy': true,
      }),
      expect.any(Array),
    )
  })

  it('render function should apply fullWidth class', async () => {
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Button text' }

    const renderFn = (Button.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'solid',
        color: 'primary',
        size: 'md',
        loading: false,
        fullWidth: true,
        disabled: false,
        type: 'button',
        class: undefined,
        loadingText: undefined,
      },
      { slots: mockSlots, emit: mockEmit },
    )
    renderFn()
    // The class string should contain 'full-width'
    const buttonCall = mockH.mock.calls.find((call) => call[0] === 'button')
    expect(buttonCall).toBeDefined()
    expect(buttonCall![1].class).toContain('full-width')
  })

  it('render function should pass color prop to classMap button', async () => {
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Button text' }

    const renderFn = (Button.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'solid',
        color: 'secondary',
        size: 'md',
        loading: false,
        fullWidth: false,
        disabled: false,
        type: 'button',
        class: undefined,
        loadingText: undefined,
      },
      { slots: mockSlots, emit: mockEmit },
    )
    renderFn()
    expect(mockClassMap.button).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'secondary' }),
    )
  })

  it('render function should pass error color to classMap button', async () => {
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Button text' }

    const renderFn = (Button.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'solid',
        color: 'error',
        size: 'md',
        loading: false,
        fullWidth: false,
        disabled: false,
        type: 'button',
        class: undefined,
        loadingText: undefined,
      },
      { slots: mockSlots, emit: mockEmit },
    )
    renderFn()
    expect(mockClassMap.button).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
  })

  it('render function should pass variant to classMap button', async () => {
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Button text' }

    const renderFn = (Button.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'outline',
        color: undefined,
        size: 'md',
        loading: false,
        fullWidth: false,
        disabled: false,
        type: 'button',
        class: undefined,
        loadingText: undefined,
      },
      { slots: mockSlots, emit: mockEmit },
    )
    renderFn()
    expect(mockClassMap.button).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'outline' }),
    )
  })

  it('render function should pass xs size directly to classMap', async () => {
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Button text' }

    const renderFn = (Button.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'solid',
        color: 'primary',
        size: 'xs',
        loading: false,
        fullWidth: false,
        disabled: false,
        type: 'button',
        class: undefined,
        loadingText: undefined,
      },
      { slots: mockSlots, emit: mockEmit },
    )
    renderFn()
    expect(mockClassMap.button).toHaveBeenCalledWith(expect.objectContaining({ size: 'xs' }))
  })

  it('render function should pass xl size directly to classMap', async () => {
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Button text' }

    const renderFn = (Button.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'solid',
        color: 'primary',
        size: 'xl',
        loading: false,
        fullWidth: false,
        disabled: false,
        type: 'button',
        class: undefined,
        loadingText: undefined,
      },
      { slots: mockSlots, emit: mockEmit },
    )
    renderFn()
    expect(mockClassMap.button).toHaveBeenCalledWith(expect.objectContaining({ size: 'xl' }))
  })
})

// ============================================================================
// Input Component Tests
// ============================================================================

describe('Input component', () => {
  it('should be defined via defineComponent with correct name', async () => {
    const { Input } = await import('../components/Input.js')
    expect(Input).toBeDefined()
    expect(Input.name).toBe('MInput')
  })

  it('should have correct props defined', async () => {
    const { Input } = await import('../components/Input.js')
    const props = Input.props as Record<string, unknown>
    expect(props).toHaveProperty('type')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('modelValue')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('placeholder')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('hint')
    expect(props).toHaveProperty('disabled')
    expect(props).toHaveProperty('required')
    expect(props).toHaveProperty('name')
    expect(props).toHaveProperty('id')
    expect(props).toHaveProperty('clearable')
  })

  it('should have correct default props', async () => {
    const { Input } = await import('../components/Input.js')
    const props = Input.props as Record<string, { default?: unknown }>
    expect(props.type.default).toBe('text')
    expect(props.size.default).toBe('md')
  })

  it('should emit correct events', async () => {
    const { Input } = await import('../components/Input.js')
    expect(Input.emits).toContain('update:modelValue')
    expect(Input.emits).toContain('clear')
    expect(Input.emits).toContain('focus')
    expect(Input.emits).toContain('blur')
  })

  it('setup should return a render function', async () => {
    const { Input } = await import('../components/Input.js')
    const mockEmit = vi.fn()
    const mockSlots = {}

    const renderFn = (Input.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        type: 'text',
        size: 'md',
        modelValue: '',
        label: undefined,
        placeholder: undefined,
        error: undefined,
        hint: undefined,
        disabled: false,
        required: false,
        name: 'test',
        id: undefined,
        class: undefined,
        clearable: false,
      },
      { emit: mockEmit, slots: mockSlots },
    )
    expect(typeof renderFn).toBe('function')
  })

  it('render should include label when provided', async () => {
    const { Input } = await import('../components/Input.js')
    const mockEmit = vi.fn()
    const mockSlots = {}

    const renderFn = (Input.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        type: 'text',
        size: 'md',
        modelValue: '',
        label: 'Email',
        placeholder: undefined,
        error: undefined,
        hint: undefined,
        disabled: false,
        required: false,
        name: 'email',
        id: undefined,
        class: undefined,
        clearable: false,
      },
      { emit: mockEmit, slots: mockSlots },
    )
    renderFn()
    // Should have called h with 'label' for the label element
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'label')
    expect(labelCall).toBeDefined()
  })

  it('render should include error message when error prop is set', async () => {
    const { Input } = await import('../components/Input.js')
    const mockEmit = vi.fn()
    const mockSlots = {}

    const renderFn = (Input.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        type: 'text',
        size: 'md',
        modelValue: '',
        label: undefined,
        placeholder: undefined,
        error: 'Required field',
        hint: undefined,
        disabled: false,
        required: false,
        name: 'test',
        id: undefined,
        class: undefined,
        clearable: false,
      },
      { emit: mockEmit, slots: mockSlots },
    )
    renderFn()
    // Should have called h with 'p' for the error element
    const errorCall = mockH.mock.calls.find(
      (call) => call[0] === 'p' && call[2] === 'Required field',
    )
    expect(errorCall).toBeDefined()
  })

  it('render should include hint when provided and no error', async () => {
    const { Input } = await import('../components/Input.js')
    const mockEmit = vi.fn()
    const mockSlots = {}

    const renderFn = (Input.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        type: 'text',
        size: 'md',
        modelValue: '',
        label: undefined,
        placeholder: undefined,
        error: undefined,
        hint: 'Enter your email',
        disabled: false,
        required: false,
        name: 'test',
        id: undefined,
        class: undefined,
        clearable: false,
      },
      { emit: mockEmit, slots: mockSlots },
    )
    renderFn()
    const hintCall = mockH.mock.calls.find(
      (call) => call[0] === 'p' && call[2] === 'Enter your email',
    )
    expect(hintCall).toBeDefined()
  })

  it('render should use error flag when error is present', async () => {
    const { Input } = await import('../components/Input.js')
    const mockEmit = vi.fn()
    const mockSlots = {}

    const renderFn = (Input.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        type: 'text',
        size: 'md',
        modelValue: '',
        label: undefined,
        placeholder: undefined,
        error: 'error msg',
        hint: undefined,
        disabled: false,
        required: false,
        name: 'test',
        id: undefined,
        class: undefined,
        clearable: false,
      },
      { emit: mockEmit, slots: mockSlots },
    )
    renderFn()
    expect(mockClassMap.input).toHaveBeenCalledWith(expect.objectContaining({ error: true }))
  })

  it('render should pass size to classMap', async () => {
    const { Input } = await import('../components/Input.js')
    const mockEmit = vi.fn()
    const mockSlots = {}

    const renderFn = (Input.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        type: 'text',
        size: 'xs',
        modelValue: '',
        label: undefined,
        placeholder: undefined,
        error: undefined,
        hint: undefined,
        disabled: false,
        required: false,
        name: 'test',
        id: undefined,
        class: undefined,
        clearable: false,
      },
      { emit: mockEmit, slots: mockSlots },
    )
    renderFn()
    expect(mockClassMap.input).toHaveBeenCalledWith(expect.objectContaining({ size: 'xs' }))
  })
})

// ============================================================================
// Textarea Component Tests
// ============================================================================

describe('Textarea component', () => {
  it('should be defined with correct name', async () => {
    const { Textarea } = await import('../components/Textarea.js')
    expect(Textarea).toBeDefined()
    expect(Textarea.name).toBe('MTextarea')
  })

  it('should have correct props', async () => {
    const { Textarea } = await import('../components/Textarea.js')
    const props = Textarea.props as Record<string, unknown>
    expect(props).toHaveProperty('modelValue')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('placeholder')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('hint')
    expect(props).toHaveProperty('disabled')
    expect(props).toHaveProperty('required')
    expect(props).toHaveProperty('rows')
    expect(props).toHaveProperty('autoResize')
    expect(props).toHaveProperty('minRows')
    expect(props).toHaveProperty('maxRows')
  })

  it('should have correct default for minRows', async () => {
    const { Textarea } = await import('../components/Textarea.js')
    const props = Textarea.props as Record<string, { default?: unknown }>
    expect(props.minRows.default).toBe(3)
  })

  it('should emit correct events', async () => {
    const { Textarea } = await import('../components/Textarea.js')
    expect(Textarea.emits).toContain('update:modelValue')
    expect(Textarea.emits).toContain('focus')
    expect(Textarea.emits).toContain('blur')
  })
})

// ============================================================================
// Select Component Tests
// ============================================================================

describe('Select component', () => {
  it('should be defined with correct name', async () => {
    const { Select } = await import('../components/Select.js')
    expect(Select).toBeDefined()
    expect(Select.name).toBe('MSelect')
  })

  it('should have correct props', async () => {
    const { Select } = await import('../components/Select.js')
    const props = Select.props as Record<string, unknown>
    expect(props).toHaveProperty('modelValue')
    expect(props).toHaveProperty('options')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('placeholder')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('hint')
    expect(props).toHaveProperty('disabled')
    expect(props).toHaveProperty('required')
    expect(props).toHaveProperty('clearable')
  })

  it('should have options as required', async () => {
    const { Select } = await import('../components/Select.js')
    const props = Select.props as Record<string, { required?: boolean }>
    expect(props.options.required).toBe(true)
  })

  it('should emit update:modelValue', async () => {
    const { Select } = await import('../components/Select.js')
    expect(Select.emits).toContain('update:modelValue')
  })

  it('should have correct default size', async () => {
    const { Select } = await import('../components/Select.js')
    const props = Select.props as Record<string, { default?: unknown }>
    expect(props.size.default).toBe('md')
  })

  it('setup should handle options grouping', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        modelValue: 'a',
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B', group: 'Group 1' },
          { value: 'c', label: 'Option C', group: 'Group 1' },
        ],
        size: 'md',
        label: undefined,
        placeholder: undefined,
        error: undefined,
        hint: undefined,
        disabled: false,
        required: false,
        clearable: false,
        name: undefined,
        id: undefined,
        class: undefined,
      },
      { emit: mockEmit },
    )

    expect(typeof renderFn).toBe('function')
    renderFn()
    // Should have rendered optgroup for grouped options
    const optgroupCall = mockH.mock.calls.find((call) => call[0] === 'optgroup')
    expect(optgroupCall).toBeDefined()
  })
})

// ============================================================================
// Checkbox Component Tests
// ============================================================================

describe('Checkbox component', () => {
  it('should be defined with correct name', async () => {
    const { Checkbox } = await import('../components/Checkbox.js')
    expect(Checkbox).toBeDefined()
    expect(Checkbox.name).toBe('MCheckbox')
  })

  it('should have correct props', async () => {
    const { Checkbox } = await import('../components/Checkbox.js')
    const props = Checkbox.props as Record<string, unknown>
    expect(props).toHaveProperty('modelValue')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('indeterminate')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('disabled')
  })

  it('should emit update:modelValue', async () => {
    const { Checkbox } = await import('../components/Checkbox.js')
    expect(Checkbox.emits).toContain('update:modelValue')
  })
})

// ============================================================================
// RadioGroup Component Tests
// ============================================================================

describe('RadioGroup component', () => {
  it('should be defined with correct name', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    expect(RadioGroup).toBeDefined()
    expect(RadioGroup.name).toBe('MRadioGroup')
  })

  it('should have correct props', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const props = RadioGroup.props as Record<string, unknown>
    expect(props).toHaveProperty('modelValue')
    expect(props).toHaveProperty('options')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('direction')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('disabled')
  })

  it('should have correct default direction', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const props = RadioGroup.props as Record<string, { default?: unknown }>
    expect(props.direction.default).toBe('vertical')
  })

  it('should emit update:modelValue', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    expect(RadioGroup.emits).toContain('update:modelValue')
  })

  it('should render with role radiogroup', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const mockEmit = vi.fn()

    const renderFn = (RadioGroup.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        modelValue: 'a',
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ],
        label: 'Choose',
        direction: 'vertical',
        error: undefined,
        disabled: false,
        class: undefined,
      },
      { emit: mockEmit },
    )

    renderFn()
    // Last call to h should be the root div with role 'radiogroup'
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]).toHaveProperty('role', 'radiogroup')
  })
})

// ============================================================================
// Switch Component Tests
// ============================================================================

describe('Switch component', () => {
  it('should be defined with correct name', async () => {
    const { Switch } = await import('../components/Switch.js')
    expect(Switch).toBeDefined()
    expect(Switch.name).toBe('MSwitch')
  })

  it('should have correct props', async () => {
    const { Switch } = await import('../components/Switch.js')
    const props = Switch.props as Record<string, unknown>
    expect(props).toHaveProperty('modelValue')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('color')
    expect(props).toHaveProperty('disabled')
  })

  it('should have correct default size', async () => {
    const { Switch } = await import('../components/Switch.js')
    const props = Switch.props as Record<string, { default?: unknown }>
    expect(props.size.default).toBe('md')
  })

  it('should emit update:modelValue', async () => {
    const { Switch } = await import('../components/Switch.js')
    expect(Switch.emits).toContain('update:modelValue')
  })

  it('setup should return render function that creates a switch button', async () => {
    const { Switch } = await import('../components/Switch.js')
    const mockEmit = vi.fn()

    const renderFn = (Switch.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        modelValue: false,
        label: 'Toggle',
        size: 'md',
        color: undefined,
        disabled: false,
        class: undefined,
      },
      { emit: mockEmit },
    )

    renderFn()
    // Should have a button with role='switch'
    const buttonCall = mockH.mock.calls.find(
      (call) => call[0] === 'button' && call[1]?.role === 'switch',
    )
    expect(buttonCall).toBeDefined()
    expect(buttonCall![1]['aria-checked']).toBe(false)
    expect(buttonCall![1]['data-state']).toBe('unchecked')
  })

  it('should reflect checked state', async () => {
    const { Switch } = await import('../components/Switch.js')
    const mockEmit = vi.fn()

    const renderFn = (Switch.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        modelValue: true,
        label: 'Toggle',
        size: 'md',
        color: undefined,
        disabled: false,
        class: undefined,
      },
      { emit: mockEmit },
    )

    renderFn()
    const buttonCall = mockH.mock.calls.find(
      (call) => call[0] === 'button' && call[1]?.role === 'switch',
    )
    expect(buttonCall![1]['aria-checked']).toBe(true)
    expect(buttonCall![1]['data-state']).toBe('checked')
  })
})

// ============================================================================
// Spinner Component Tests
// ============================================================================

describe('Spinner component', () => {
  it('should be defined with correct name', async () => {
    const { Spinner } = await import('../components/Spinner.js')
    expect(Spinner).toBeDefined()
    expect(Spinner.name).toBe('MSpinner')
  })

  it('should have correct props', async () => {
    const { Spinner } = await import('../components/Spinner.js')
    const props = Spinner.props as Record<string, unknown>
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('color')
    expect(props).toHaveProperty('label')
  })

  it('should have correct default size', async () => {
    const { Spinner } = await import('../components/Spinner.js')
    const props = Spinner.props as Record<string, { default?: unknown }>
    expect(props.size.default).toBe('md')
  })

  it('setup should render with role status', async () => {
    const { Spinner } = await import('../components/Spinner.js')

    const renderFn = (Spinner.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { size: 'md', color: undefined, label: undefined, class: undefined },
      {},
    )

    renderFn()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div' && call[1]?.role === 'status')
    expect(divCall).toBeDefined()
    expect(divCall![1]['aria-label']).toBe('Loading')
  })

  it('should use custom label', async () => {
    const { Spinner } = await import('../components/Spinner.js')

    const renderFn = (Spinner.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { size: 'md', color: undefined, label: 'Processing', class: undefined },
      {},
    )

    renderFn()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div' && call[1]?.role === 'status')
    expect(divCall![1]['aria-label']).toBe('Processing')
  })

  it('should apply custom color style for non-standard colors', async () => {
    const { Spinner } = await import('../components/Spinner.js')

    const renderFn = (Spinner.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { size: 'md', color: '#ff0000', label: undefined, class: undefined },
      {},
    )

    renderFn()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div' && call[1]?.role === 'status')
    expect(divCall![1].style).toEqual({ borderColor: '#ff0000', borderTopColor: 'transparent' })
  })

  it('should not apply custom color style for standard color names', async () => {
    const { Spinner } = await import('../components/Spinner.js')

    const renderFn = (Spinner.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { size: 'md', color: 'primary', label: undefined, class: undefined },
      {},
    )

    renderFn()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div' && call[1]?.role === 'status')
    expect(divCall![1].style).toBeUndefined()
  })
})

// ============================================================================
// Badge Component Tests
// ============================================================================

describe('Badge component', () => {
  it('should be defined with correct name', async () => {
    const { Badge } = await import('../components/Badge.js')
    expect(Badge).toBeDefined()
    expect(Badge.name).toBe('MBadge')
  })

  it('should have correct props', async () => {
    const { Badge } = await import('../components/Badge.js')
    const props = Badge.props as Record<string, unknown>
    expect(props).toHaveProperty('color')
    expect(props).toHaveProperty('variant')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('rounded')
  })

  it('should have correct defaults', async () => {
    const { Badge } = await import('../components/Badge.js')
    const props = Badge.props as Record<string, { default?: unknown }>
    expect(props.color.default).toBe('primary')
    expect(props.variant.default).toBe('solid')
    expect(props.rounded.default).toBe(true)
  })

  it('setup should render a span element', async () => {
    const { Badge } = await import('../components/Badge.js')
    const mockSlots = { default: () => 'Badge text' }

    const renderFn = (Badge.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { color: 'primary', variant: 'solid', size: undefined, rounded: true, class: undefined },
      { slots: mockSlots },
    )

    renderFn()
    const spanCall = mockH.mock.calls.find((call) => call[0] === 'span')
    expect(spanCall).toBeDefined()
  })

  it('should pass color as badge variant to classMap', async () => {
    const { Badge } = await import('../components/Badge.js')
    const mockSlots = { default: () => 'Badge text' }

    const renderFn = (Badge.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { color: 'primary', variant: 'outline', size: undefined, rounded: true, class: undefined },
      { slots: mockSlots },
    )

    renderFn()
    expect(mockClassMap.badge).toHaveBeenCalledWith(expect.objectContaining({ variant: 'primary' }))
  })

  it('should map success color to success variant', async () => {
    const { Badge } = await import('../components/Badge.js')
    const mockSlots = { default: () => 'Badge text' }

    const renderFn = (Badge.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { color: 'success', variant: 'solid', size: undefined, rounded: true, class: undefined },
      { slots: mockSlots },
    )

    renderFn()
    expect(mockClassMap.badge).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })
})

// ============================================================================
// Alert Component Tests
// ============================================================================

describe('Alert component', () => {
  it('should be defined with correct name', async () => {
    const { Alert } = await import('../components/Alert.js')
    expect(Alert).toBeDefined()
    expect(Alert.name).toBe('MAlert')
  })

  it('should have correct props', async () => {
    const { Alert } = await import('../components/Alert.js')
    const props = Alert.props as Record<string, unknown>
    expect(props).toHaveProperty('title')
    expect(props).toHaveProperty('status')
    expect(props).toHaveProperty('variant')
    expect(props).toHaveProperty('dismissible')
  })

  it('should have correct default status', async () => {
    const { Alert } = await import('../components/Alert.js')
    const props = Alert.props as Record<string, { default?: unknown }>
    expect(props.status.default).toBe('info')
  })

  it('should emit dismiss event', async () => {
    const { Alert } = await import('../components/Alert.js')
    expect(Alert.emits).toContain('dismiss')
  })

  it('should render with role alert', async () => {
    const { Alert } = await import('../components/Alert.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Alert message' }

    const renderFn = (Alert.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: 'Warning',
        status: 'warning',
        variant: undefined,
        dismissible: false,
        class: undefined,
      },
      { emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    // Root div should have role='alert'
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]).toHaveProperty('role', 'alert')
  })

  it('should map status to classMap variant correctly', async () => {
    const { Alert } = await import('../components/Alert.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Alert message' }

    const renderFn = (Alert.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: undefined,
        status: 'error',
        variant: undefined,
        dismissible: false,
        class: undefined,
      },
      { emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    expect(mockClassMap.alert).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error' }))
  })
})

// ============================================================================
// Avatar Component Tests
// ============================================================================

describe('Avatar component', () => {
  it('should be defined with correct name', async () => {
    const { Avatar } = await import('../components/Avatar.js')
    expect(Avatar).toBeDefined()
    expect(Avatar.name).toBe('MAvatar')
  })

  it('should have correct props', async () => {
    const { Avatar } = await import('../components/Avatar.js')
    const props = Avatar.props as Record<string, unknown>
    expect(props).toHaveProperty('src')
    expect(props).toHaveProperty('alt')
    expect(props).toHaveProperty('name')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('rounded')
  })

  it('should default to rounded', async () => {
    const { Avatar } = await import('../components/Avatar.js')
    const props = Avatar.props as Record<string, { default?: unknown }>
    expect(props.rounded.default).toBe(true)
  })

  it('should default to md size', async () => {
    const { Avatar } = await import('../components/Avatar.js')
    const props = Avatar.props as Record<string, { default?: unknown }>
    expect(props.size.default).toBe('md')
  })
})

// ============================================================================
// Card Component Tests
// ============================================================================

describe('Card components', () => {
  it('should define Card with correct name', async () => {
    const { Card } = await import('../components/Card.js')
    expect(Card).toBeDefined()
    expect(Card.name).toBe('MCard')
  })

  it('should have correct default variant', async () => {
    const { Card } = await import('../components/Card.js')
    const props = Card.props as Record<string, { default?: unknown }>
    expect(props.variant.default).toBe('elevated')
  })

  it('should have correct default padding', async () => {
    const { Card } = await import('../components/Card.js')
    const props = Card.props as Record<string, { default?: unknown }>
    expect(props.padding.default).toBe('md')
  })

  it('should emit click events', async () => {
    const { Card } = await import('../components/Card.js')
    expect(Card.emits).toContain('click')
  })

  it('should define CardHeader', async () => {
    const { CardHeader } = await import('../components/Card.js')
    expect(CardHeader).toBeDefined()
    expect(CardHeader.name).toBe('MCardHeader')
  })

  it('should define CardTitle', async () => {
    const { CardTitle } = await import('../components/Card.js')
    expect(CardTitle).toBeDefined()
    expect(CardTitle.name).toBe('MCardTitle')
  })

  it('should define CardDescription', async () => {
    const { CardDescription } = await import('../components/Card.js')
    expect(CardDescription).toBeDefined()
    expect(CardDescription.name).toBe('MCardDescription')
  })

  it('should define CardContent', async () => {
    const { CardContent } = await import('../components/Card.js')
    expect(CardContent).toBeDefined()
    expect(CardContent.name).toBe('MCardContent')
  })

  it('should define CardFooter', async () => {
    const { CardFooter } = await import('../components/Card.js')
    expect(CardFooter).toBeDefined()
    expect(CardFooter.name).toBe('MCardFooter')
  })

  it('Card setup should map variant correctly', async () => {
    const { Card } = await import('../components/Card.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'content' }

    const renderFn = (Card.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { variant: 'outlined', padding: 'md', interactive: false, class: undefined },
      { emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    expect(mockClassMap.card).toHaveBeenCalledWith(expect.objectContaining({ variant: 'outline' }))
  })

  it('Card setup should set interactive attributes', async () => {
    const { Card } = await import('../components/Card.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'content' }

    const renderFn = (Card.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { variant: 'elevated', padding: 'md', interactive: true, class: undefined },
      { emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]).toHaveProperty('role', 'button')
    expect(rootCall[1]).toHaveProperty('tabindex', 0)
  })

  it('Card setup should handle none padding', async () => {
    const { Card } = await import('../components/Card.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'content' }

    const renderFn = (Card.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { variant: 'elevated', padding: 'none', interactive: false, class: undefined },
      { emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    // padding 'none' should result in no padding class (empty string filtered by cn)
    expect(rootCall[1].class).not.toContain('card-padding-classes')
  })
})

// ============================================================================
// Separator Component Tests
// ============================================================================

describe('Separator component', () => {
  it('should be defined with correct name', async () => {
    const { Separator } = await import('../components/Separator.js')
    expect(Separator).toBeDefined()
    expect(Separator.name).toBe('MSeparator')
  })

  it('should have correct defaults', async () => {
    const { Separator } = await import('../components/Separator.js')
    const props = Separator.props as Record<string, { default?: unknown }>
    expect(props.orientation.default).toBe('horizontal')
    expect(props.decorative.default).toBe(true)
  })

  it('should render decorative separator with role none', async () => {
    const { Separator } = await import('../components/Separator.js')

    const renderFn = (Separator.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { orientation: 'horizontal', decorative: true, class: undefined },
      {},
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(divCall[1]).toHaveProperty('role', 'none')
    expect(divCall[1]['aria-orientation']).toBeUndefined()
  })

  it('should render non-decorative separator with role separator', async () => {
    const { Separator } = await import('../components/Separator.js')

    const renderFn = (Separator.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { orientation: 'vertical', decorative: false, class: undefined },
      {},
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(divCall[1]).toHaveProperty('role', 'separator')
    expect(divCall[1]['aria-orientation']).toBe('vertical')
  })
})

// ============================================================================
// Progress Component Tests
// ============================================================================

describe('Progress component', () => {
  it('should be defined with correct name', async () => {
    const { Progress } = await import('../components/Progress.js')
    expect(Progress).toBeDefined()
    expect(Progress.name).toBe('MProgress')
  })

  it('should have correct props', async () => {
    const { Progress } = await import('../components/Progress.js')
    const props = Progress.props as Record<string, unknown>
    expect(props).toHaveProperty('value')
    expect(props).toHaveProperty('max')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('color')
    expect(props).toHaveProperty('showValue')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('indeterminate')
  })

  it('should have correct defaults', async () => {
    const { Progress } = await import('../components/Progress.js')
    const props = Progress.props as Record<string, { default?: unknown }>
    expect(props.max.default).toBe(100)
    expect(props.size.default).toBe('md')
    expect(props.color.default).toBe('primary')
  })

  it('should render with progressbar role', async () => {
    const { Progress } = await import('../components/Progress.js')

    const renderFn = (Progress.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        value: 50,
        max: 100,
        size: 'md',
        color: 'primary',
        showValue: false,
        label: undefined,
        indeterminate: false,
        class: undefined,
      },
      {},
    )

    renderFn()
    const progressCall = mockH.mock.calls.find((call) => call[1]?.role === 'progressbar')
    expect(progressCall).toBeDefined()
    expect(progressCall![1]['aria-valuenow']).toBe(50)
    expect(progressCall![1]['aria-valuemin']).toBe(0)
    expect(progressCall![1]['aria-valuemax']).toBe(100)
  })

  it('should clamp percentage between 0 and 100', async () => {
    const { Progress } = await import('../components/Progress.js')

    // Value exceeding max
    const renderFn = (Progress.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        value: 150,
        max: 100,
        size: 'md',
        color: 'primary',
        showValue: true,
        label: undefined,
        indeterminate: false,
        class: undefined,
      },
      {},
    )

    renderFn()
    // Find the percentage display span
    const percentCall = mockH.mock.calls.find(
      (call) => call[0] === 'span' && typeof call[2] === 'string' && call[2].includes('%'),
    )
    if (percentCall) {
      expect(percentCall[2]).toBe('100%')
    }
  })

  it('should show label and value when props are set', async () => {
    const { Progress } = await import('../components/Progress.js')

    const renderFn = (Progress.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        value: 75,
        max: 100,
        size: 'md',
        color: 'primary',
        showValue: true,
        label: 'Upload',
        indeterminate: false,
        class: undefined,
      },
      {},
    )

    renderFn()
    // Should render label
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'span' && call[2] === 'Upload')
    expect(labelCall).toBeDefined()
    // Should render percentage
    const percentCall = mockH.mock.calls.find((call) => call[0] === 'span' && call[2] === '75%')
    expect(percentCall).toBeDefined()
  })
})

// ============================================================================
// Skeleton Component Tests
// ============================================================================

describe('Skeleton components', () => {
  it('should define Skeleton with correct name', async () => {
    const { Skeleton } = await import('../components/Skeleton.js')
    expect(Skeleton).toBeDefined()
    expect(Skeleton.name).toBe('MSkeleton')
  })

  it('should have correct props', async () => {
    const { Skeleton } = await import('../components/Skeleton.js')
    const props = Skeleton.props as Record<string, unknown>
    expect(props).toHaveProperty('width')
    expect(props).toHaveProperty('height')
    expect(props).toHaveProperty('circle')
    expect(props).toHaveProperty('borderRadius')
    expect(props).toHaveProperty('animation')
  })

  it('should have correct default animation', async () => {
    const { Skeleton } = await import('../components/Skeleton.js')
    const props = Skeleton.props as Record<string, { default?: unknown }>
    expect(props.animation.default).toBe('pulse')
  })

  it('should define SkeletonText with correct name', async () => {
    const { SkeletonText } = await import('../components/Skeleton.js')
    expect(SkeletonText).toBeDefined()
    expect(SkeletonText.name).toBe('MSkeletonText')
  })

  it('SkeletonText should default to 3 lines', async () => {
    const { SkeletonText } = await import('../components/Skeleton.js')
    const props = SkeletonText.props as Record<string, { default?: unknown }>
    expect(props.lines.default).toBe(3)
  })

  it('should define SkeletonCircle with correct name', async () => {
    const { SkeletonCircle } = await import('../components/Skeleton.js')
    expect(SkeletonCircle).toBeDefined()
    expect(SkeletonCircle.name).toBe('MSkeletonCircle')
  })

  it('SkeletonCircle should default to size 40', async () => {
    const { SkeletonCircle } = await import('../components/Skeleton.js')
    const props = SkeletonCircle.props as Record<string, { default?: unknown }>
    expect(props.size.default).toBe(40)
  })

  it('Skeleton setup should handle numeric dimensions', async () => {
    const { Skeleton } = await import('../components/Skeleton.js')

    const renderFn = (Skeleton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        width: 200,
        height: 100,
        circle: false,
        borderRadius: undefined,
        animation: 'pulse',
        class: undefined,
      },
      {},
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(divCall[1].style).toEqual(
      expect.objectContaining({
        width: '200px',
        height: '100px',
      }),
    )
  })

  it('Skeleton setup should handle string dimensions', async () => {
    const { Skeleton } = await import('../components/Skeleton.js')

    const renderFn = (Skeleton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        width: '50%',
        height: '2rem',
        circle: false,
        borderRadius: undefined,
        animation: 'pulse',
        class: undefined,
      },
      {},
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(divCall[1].style).toEqual(
      expect.objectContaining({
        width: '50%',
        height: '2rem',
      }),
    )
  })

  it('Skeleton setup should apply circle styles', async () => {
    const { Skeleton } = await import('../components/Skeleton.js')

    const renderFn = (Skeleton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        width: 40,
        height: undefined,
        circle: true,
        borderRadius: undefined,
        animation: 'pulse',
        class: undefined,
      },
      {},
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(divCall[1].style.borderRadius).toBe('9999px')
    // Circle with width but no height should set height = width
    expect(divCall[1].style.height).toBe('40px')
  })
})

// ============================================================================
// Modal Component Tests
// ============================================================================

describe('Modal component', () => {
  it('should be defined with correct name', async () => {
    const { Modal } = await import('../components/Modal.js')
    expect(Modal).toBeDefined()
    expect(Modal.name).toBe('MModal')
  })

  it('should have correct props', async () => {
    const { Modal } = await import('../components/Modal.js')
    const props = Modal.props as Record<string, unknown>
    expect(props).toHaveProperty('open')
    expect(props).toHaveProperty('title')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('showCloseButton')
    expect(props).toHaveProperty('closeOnOverlayClick')
    expect(props).toHaveProperty('closeOnEscape')
    expect(props).toHaveProperty('preventScroll')
  })

  it('should have correct defaults', async () => {
    const { Modal } = await import('../components/Modal.js')
    const props = Modal.props as Record<string, { default?: unknown }>
    expect(props.size.default).toBe('md')
    expect(props.showCloseButton.default).toBe(true)
    expect(props.closeOnOverlayClick.default).toBe(true)
    expect(props.closeOnEscape.default).toBe(true)
    expect(props.preventScroll.default).toBe(true)
  })

  it('should require open prop', async () => {
    const { Modal } = await import('../components/Modal.js')
    const props = Modal.props as Record<string, { required?: boolean }>
    expect(props.open.required).toBe(true)
  })

  it('should emit close event', async () => {
    const { Modal } = await import('../components/Modal.js')
    expect(Modal.emits).toContain('close')
  })
})

// ============================================================================
// Toast Component Tests
// ============================================================================

describe('Toast components', () => {
  it('should define Toast with correct name', async () => {
    const { Toast } = await import('../components/Toast.js')
    expect(Toast).toBeDefined()
    expect(Toast.name).toBe('MToast')
  })

  it('should have correct default props for Toast', async () => {
    const { Toast } = await import('../components/Toast.js')
    const props = Toast.props as Record<string, { default?: unknown }>
    expect(props.status.default).toBe('info')
    expect(props.duration.default).toBe(5000)
    expect(props.dismissible.default).toBe(true)
  })

  it('Toast should emit dismiss', async () => {
    const { Toast } = await import('../components/Toast.js')
    expect(Toast.emits).toContain('dismiss')
  })

  it('should define ToastContainer with correct name', async () => {
    const { ToastContainer } = await import('../components/Toast.js')
    expect(ToastContainer).toBeDefined()
    expect(ToastContainer.name).toBe('MToastContainer')
  })

  it('ToastContainer should default to bottom-right position', async () => {
    const { ToastContainer } = await import('../components/Toast.js')
    const props = ToastContainer.props as Record<string, { default?: unknown }>
    expect(props.position.default).toBe('bottom-right')
  })

  it('should define ToastProvider with correct name', async () => {
    const { ToastProvider } = await import('../components/Toast.js')
    expect(ToastProvider).toBeDefined()
    expect(ToastProvider.name).toBe('MToastProvider')
  })

  it('ToastProvider should default to bottom-right position', async () => {
    const { ToastProvider } = await import('../components/Toast.js')
    const props = ToastProvider.props as Record<string, { default?: unknown }>
    expect(props.position.default).toBe('bottom-right')
  })

  it('should export useToast function', async () => {
    const { useToast } = await import('../components/Toast.js')
    expect(typeof useToast).toBe('function')
  })

  it('useToast should throw when used outside ToastProvider', async () => {
    mockInject.mockReturnValueOnce(undefined)
    const { useToast } = await import('../components/Toast.js')
    expect(() => useToast()).toThrow('useToast must be used within a ToastProvider')
  })
})

// ============================================================================
// Form Component Tests
// ============================================================================

describe('Form components', () => {
  it('should define Form with correct name', async () => {
    const { Form } = await import('../components/Form.js')
    expect(Form).toBeDefined()
    expect(Form.name).toBe('MForm')
  })

  it('should have correct props for Form', async () => {
    const { Form } = await import('../components/Form.js')
    const props = Form.props as Record<string, unknown>
    expect(props).toHaveProperty('action')
    expect(props).toHaveProperty('method')
    expect(props).toHaveProperty('noValidate')
    expect(props).toHaveProperty('submitting')
  })

  it('Form should emit submit and formSubmit', async () => {
    const { Form } = await import('../components/Form.js')
    expect(Form.emits).toContain('submit')
    expect(Form.emits).toContain('formSubmit')
  })

  it('should define FormField with correct name', async () => {
    const { FormField } = await import('../components/Form.js')
    expect(FormField).toBeDefined()
    expect(FormField.name).toBe('MFormField')
  })

  it('FormField should have label, name, error, hint, required props', async () => {
    const { FormField } = await import('../components/Form.js')
    const props = FormField.props as Record<string, unknown>
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('name')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('hint')
    expect(props).toHaveProperty('required')
  })

  it('should define Label with correct name', async () => {
    const { Label } = await import('../components/Form.js')
    expect(Label).toBeDefined()
    expect(Label.name).toBe('MLabel')
  })

  it('Label should have for and required props', async () => {
    const { Label } = await import('../components/Form.js')
    const props = Label.props as Record<string, unknown>
    expect(props).toHaveProperty('for')
    expect(props).toHaveProperty('required')
  })
})

// ============================================================================
// Tabs Component Tests
// ============================================================================

describe('Tabs component', () => {
  it('should be defined with correct name', async () => {
    const { Tabs } = await import('../components/Tabs.js')
    expect(Tabs).toBeDefined()
    expect(Tabs.name).toBe('MTabs')
  })

  it('should have correct props', async () => {
    const { Tabs } = await import('../components/Tabs.js')
    const props = Tabs.props as Record<string, unknown>
    expect(props).toHaveProperty('modelValue')
    expect(props).toHaveProperty('items')
    expect(props).toHaveProperty('defaultValue')
    expect(props).toHaveProperty('variant')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('fitted')
  })

  it('should require items', async () => {
    const { Tabs } = await import('../components/Tabs.js')
    const props = Tabs.props as Record<string, { required?: boolean }>
    expect(props.items.required).toBe(true)
  })

  it('should emit update:modelValue', async () => {
    const { Tabs } = await import('../components/Tabs.js')
    expect(Tabs.emits).toContain('update:modelValue')
  })
})

// ============================================================================
// Table Component Tests
// ============================================================================

describe('Table component', () => {
  it('should be defined with correct name', async () => {
    const { Table } = await import('../components/Table.js')
    expect(Table).toBeDefined()
    expect(Table.name).toBe('MTable')
  })

  it('should have correct props', async () => {
    const { Table } = await import('../components/Table.js')
    const props = Table.props as Record<string, unknown>
    expect(props).toHaveProperty('data')
    expect(props).toHaveProperty('columns')
    expect(props).toHaveProperty('rowKey')
    expect(props).toHaveProperty('bordered')
    expect(props).toHaveProperty('striped')
    expect(props).toHaveProperty('hoverable')
    expect(props).toHaveProperty('emptyContent')
    expect(props).toHaveProperty('loading')
    expect(props).toHaveProperty('sort')
  })

  it('should require data and columns', async () => {
    const { Table } = await import('../components/Table.js')
    const props = Table.props as Record<string, { required?: boolean }>
    expect(props.data.required).toBe(true)
    expect(props.columns.required).toBe(true)
  })

  it('should default hoverable to true', async () => {
    const { Table } = await import('../components/Table.js')
    const props = Table.props as Record<string, { default?: unknown }>
    expect(props.hoverable.default).toBe(true)
  })

  it('should emit sort and row-click', async () => {
    const { Table } = await import('../components/Table.js')
    expect(Table.emits).toContain('sort')
    expect(Table.emits).toContain('row-click')
  })
})

// ============================================================================
// Tooltip Component Tests
// ============================================================================

describe('Tooltip component', () => {
  it('should be defined with correct name', async () => {
    const { Tooltip } = await import('../components/Tooltip.js')
    expect(Tooltip).toBeDefined()
    expect(Tooltip.name).toBe('MTooltip')
  })

  it('should have correct props', async () => {
    const { Tooltip } = await import('../components/Tooltip.js')
    const props = Tooltip.props as Record<string, unknown>
    expect(props).toHaveProperty('content')
    expect(props).toHaveProperty('placement')
    expect(props).toHaveProperty('delay')
    expect(props).toHaveProperty('hasArrow')
  })

  it('should require content', async () => {
    const { Tooltip } = await import('../components/Tooltip.js')
    const props = Tooltip.props as Record<string, { required?: boolean }>
    expect(props.content.required).toBe(true)
  })

  it('should have correct defaults', async () => {
    const { Tooltip } = await import('../components/Tooltip.js')
    const props = Tooltip.props as Record<string, { default?: unknown }>
    expect(props.placement.default).toBe('top')
    expect(props.delay.default).toBe(0)
  })
})

// ============================================================================
// Accordion Component Tests
// ============================================================================

describe('Accordion component', () => {
  it('should be defined with correct name', async () => {
    const { Accordion } = await import('../components/Accordion.js')
    expect(Accordion).toBeDefined()
    expect(Accordion.name).toBe('MAccordion')
  })

  it('should have correct props', async () => {
    const { Accordion } = await import('../components/Accordion.js')
    const props = Accordion.props as Record<string, unknown>
    expect(props).toHaveProperty('items')
    expect(props).toHaveProperty('modelValue')
    expect(props).toHaveProperty('defaultValue')
    expect(props).toHaveProperty('multiple')
    expect(props).toHaveProperty('collapsible')
  })

  it('should require items', async () => {
    const { Accordion } = await import('../components/Accordion.js')
    const props = Accordion.props as Record<string, { required?: boolean }>
    expect(props.items.required).toBe(true)
  })

  it('should have correct defaults', async () => {
    const { Accordion } = await import('../components/Accordion.js')
    const props = Accordion.props as Record<string, { default?: unknown }>
    expect(props.multiple.default).toBe(false)
    expect(props.collapsible.default).toBe(true)
  })

  it('should emit update:modelValue and change', async () => {
    const { Accordion } = await import('../components/Accordion.js')
    expect(Accordion.emits).toContain('update:modelValue')
    expect(Accordion.emits).toContain('change')
  })
})

// ============================================================================
// Pagination Component Tests
// ============================================================================

describe('Pagination component', () => {
  it('should be defined with correct name', async () => {
    const { Pagination } = await import('../components/Pagination.js')
    expect(Pagination).toBeDefined()
    expect(Pagination.name).toBe('MPagination')
  })

  it('should have correct props', async () => {
    const { Pagination } = await import('../components/Pagination.js')
    const props = Pagination.props as Record<string, unknown>
    expect(props).toHaveProperty('page')
    expect(props).toHaveProperty('totalPages')
    expect(props).toHaveProperty('siblings')
    expect(props).toHaveProperty('boundaries')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('showFirstLast')
    expect(props).toHaveProperty('showPrevNext')
    expect(props).toHaveProperty('disabled')
  })

  it('should require page and totalPages', async () => {
    const { Pagination } = await import('../components/Pagination.js')
    const props = Pagination.props as Record<string, { required?: boolean }>
    expect(props.page.required).toBe(true)
    expect(props.totalPages.required).toBe(true)
  })

  it('should have correct defaults', async () => {
    const { Pagination } = await import('../components/Pagination.js')
    const props = Pagination.props as Record<string, { default?: unknown }>
    expect(props.siblings.default).toBe(1)
    expect(props.boundaries.default).toBe(1)
    expect(props.size.default).toBe('md')
    expect(props.showFirstLast.default).toBe(false)
    expect(props.showPrevNext.default).toBe(true)
  })

  it('should emit update:page and change', async () => {
    const { Pagination } = await import('../components/Pagination.js')
    expect(Pagination.emits).toContain('update:page')
    expect(Pagination.emits).toContain('change')
  })
})

// ============================================================================
// Dropdown Component Tests
// ============================================================================

describe('Dropdown components', () => {
  it('should define Dropdown with correct name', async () => {
    const { Dropdown } = await import('../components/Dropdown.js')
    expect(Dropdown).toBeDefined()
    expect(Dropdown.name).toBe('MDropdown')
  })

  it('should have correct props for Dropdown', async () => {
    const { Dropdown } = await import('../components/Dropdown.js')
    const props = Dropdown.props as Record<string, unknown>
    expect(props).toHaveProperty('items')
    expect(props).toHaveProperty('placement')
    expect(props).toHaveProperty('open')
    expect(props).toHaveProperty('align')
    expect(props).toHaveProperty('width')
  })

  it('should require items', async () => {
    const { Dropdown } = await import('../components/Dropdown.js')
    const props = Dropdown.props as Record<string, { required?: boolean }>
    expect(props.items.required).toBe(true)
  })

  it('should have correct defaults', async () => {
    const { Dropdown } = await import('../components/Dropdown.js')
    const props = Dropdown.props as Record<string, { default?: unknown }>
    expect(props.placement.default).toBe('bottom-start')
    expect(props.align.default).toBe('start')
    expect(props.width.default).toBe('auto')
  })

  it('should emit select and update:open', async () => {
    const { Dropdown } = await import('../components/Dropdown.js')
    expect(Dropdown.emits).toContain('select')
    expect(Dropdown.emits).toContain('update:open')
  })

  it('should define DropdownLabel with correct name', async () => {
    const { DropdownLabel } = await import('../components/Dropdown.js')
    expect(DropdownLabel).toBeDefined()
    expect(DropdownLabel.name).toBe('MDropdownLabel')
  })

  it('should define DropdownSeparator with correct name', async () => {
    const { DropdownSeparator } = await import('../components/Dropdown.js')
    expect(DropdownSeparator).toBeDefined()
    expect(DropdownSeparator.name).toBe('MDropdownSeparator')
  })
})

// ============================================================================
// Layout Component Tests
// ============================================================================

describe('Layout components', () => {
  describe('Container', () => {
    it('should be defined with correct name', async () => {
      const { Container } = await import('../components/Layout.js')
      expect(Container).toBeDefined()
      expect(Container.name).toBe('MContainer')
    })

    it('should have correct defaults', async () => {
      const { Container } = await import('../components/Layout.js')
      const props = Container.props as Record<string, { default?: unknown }>
      expect(props.maxWidth.default).toBe('lg')
      expect(props.centered.default).toBe(true)
    })

    it('should render with max-width class for standard sizes', async () => {
      const { Container } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }

      const renderFn = (Container.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { maxWidth: 'lg', centered: true, paddingX: undefined, class: undefined },
        { slots: mockSlots },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('container-centered')
      expect(divCall[1].class).toContain('size-lg')
    })

    it('should use custom maxWidth as inline style', async () => {
      const { Container } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }

      const renderFn = (Container.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { maxWidth: '800px', centered: true, paddingX: undefined, class: undefined },
        { slots: mockSlots },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].style).toEqual({ maxWidth: '800px' })
    })
  })

  describe('Flex', () => {
    it('should be defined with correct name', async () => {
      const { Flex } = await import('../components/Layout.js')
      expect(Flex).toBeDefined()
      expect(Flex.name).toBe('MFlex')
    })

    it('should have correct default direction', async () => {
      const { Flex } = await import('../components/Layout.js')
      const props = Flex.props as Record<string, { default?: unknown }>
      expect(props.direction.default).toBe('row')
    })

    it('should emit click events', async () => {
      const { Flex } = await import('../components/Layout.js')
      expect(Flex.emits).toContain('click')
    })

    it('should render with correct direction class', async () => {
      const { Flex } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }
      const mockEmit = vi.fn()

      const renderFn = (Flex.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        {
          direction: 'column',
          justify: undefined,
          align: undefined,
          wrap: undefined,
          gap: undefined,
          class: undefined,
        },
        { slots: mockSlots, emit: mockEmit },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('flex-layout')
      expect(divCall[1].class).toContain('dir-col')
    })

    it('should apply justify and align classes', async () => {
      const { Flex } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }
      const mockEmit = vi.fn()

      const renderFn = (Flex.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        {
          direction: 'row',
          justify: 'center',
          align: 'center',
          wrap: undefined,
          gap: undefined,
          class: undefined,
        },
        { slots: mockSlots, emit: mockEmit },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('justify-center')
      expect(divCall[1].class).toContain('align-center')
    })

    it('should apply gap from Size enum', async () => {
      const { Flex } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }
      const mockEmit = vi.fn()

      const renderFn = (Flex.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        {
          direction: 'row',
          justify: undefined,
          align: undefined,
          wrap: undefined,
          gap: 'md',
          class: undefined,
        },
        { slots: mockSlots, emit: mockEmit },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('gap-md')
    })

    it('should apply numeric gap as arbitrary value', async () => {
      const { Flex } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }
      const mockEmit = vi.fn()

      const renderFn = (Flex.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        {
          direction: 'row',
          justify: undefined,
          align: undefined,
          wrap: undefined,
          gap: 16,
          class: undefined,
        },
        { slots: mockSlots, emit: mockEmit },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].style).toEqual({ gap: '16px' })
    })
  })

  describe('Grid', () => {
    it('should be defined with correct name', async () => {
      const { Grid } = await import('../components/Layout.js')
      expect(Grid).toBeDefined()
      expect(Grid.name).toBe('MGrid')
    })

    it('should have correct props', async () => {
      const { Grid } = await import('../components/Layout.js')
      const props = Grid.props as Record<string, unknown>
      expect(props).toHaveProperty('columns')
      expect(props).toHaveProperty('rows')
      expect(props).toHaveProperty('gap')
      expect(props).toHaveProperty('columnGap')
      expect(props).toHaveProperty('rowGap')
    })

    it('should render with grid class', async () => {
      const { Grid } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }

      const renderFn = (Grid.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        {
          columns: 3,
          rows: undefined,
          gap: undefined,
          columnGap: undefined,
          rowGap: undefined,
          class: undefined,
        },
        { slots: mockSlots },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('grid-layout')
      expect(divCall[1].class).toContain('cols-3')
    })

    it('should use string columns as gridTemplateColumns style', async () => {
      const { Grid } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }

      const renderFn = (Grid.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        {
          columns: '1fr 2fr 1fr',
          rows: undefined,
          gap: undefined,
          columnGap: undefined,
          rowGap: undefined,
          class: undefined,
        },
        { slots: mockSlots },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].style.gridTemplateColumns).toBe('1fr 2fr 1fr')
    })
  })

  describe('Spacer', () => {
    it('should be defined with correct name', async () => {
      const { Spacer } = await import('../components/Layout.js')
      expect(Spacer).toBeDefined()
      expect(Spacer.name).toBe('MSpacer')
    })

    it('should have correct defaults', async () => {
      const { Spacer } = await import('../components/Layout.js')
      const props = Spacer.props as Record<string, { default?: unknown }>
      expect(props.size.default).toBe('md')
    })

    it('should render vertical spacer by default', async () => {
      const { Spacer } = await import('../components/Layout.js')

      const renderFn = (Spacer.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { size: 'md', horizontal: false, class: undefined },
        {},
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('spacer-vertical')
    })

    it('should render horizontal spacer when horizontal is true', async () => {
      const { Spacer } = await import('../components/Layout.js')

      const renderFn = (Spacer.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { size: 'md', horizontal: true, class: undefined },
        {},
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('spacer-horizontal')
    })

    it('should handle numeric size', async () => {
      const { Spacer } = await import('../components/Layout.js')

      const renderFn = (Spacer.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { size: 24, horizontal: false, class: undefined },
        {},
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].style).toEqual({ height: '24px', width: '1px' })
    })

    it('should handle numeric size for horizontal spacer', async () => {
      const { Spacer } = await import('../components/Layout.js')

      const renderFn = (Spacer.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { size: 24, horizontal: true, class: undefined },
        {},
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].style).toEqual({ width: '24px', height: '1px' })
    })
  })
})
