/**
 * Tests for Vue UI components.
 *
 * Tests component definitions, variant maps, props configurations,
 * and setup function behavior using mocked Vue and ClassMap dependencies.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
const mockShallowRef = vi.fn((val: unknown) => ({ value: val }))
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
  shallowRef: (val: unknown) => mockShallowRef(val),
  computed: (fn: () => unknown) => mockComputed(fn),
  watch: (...args: unknown[]) => mockWatch(...args),
  onMounted: (fn: unknown) => mockOnMounted(fn),
  onUnmounted: (fn: unknown) => mockOnUnmounted(fn),
  provide: (...args: unknown[]) => mockProvide(...args),
  inject: (...args: unknown[]) => mockInject(...args),
  reactive: (obj: unknown) => mockReactive(obj),
  toRaw: (val: unknown) => val,
  Teleport: 'Teleport',
}))

// ============================================================================
// Mock @molecule/app-ui with getClassMap
// ============================================================================

const mockClassMap = {
  cn: vi.fn((...args: unknown[]) => args.filter(Boolean).join(' ')),
  stack: vi.fn((n: unknown) => `stack-${n}`),
  textSize: vi.fn((s: unknown) => `text-size-${s}`),
  fontWeight: vi.fn((w: unknown) => `font-weight-${w}`),
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
  tabsList: vi.fn(
    (opts?: Record<string, unknown>) =>
      `tabs-list-classes variant-${opts?.variant || 'enclosed'} size-${opts?.size || 'md'}`,
  ),
  tabsTrigger: vi.fn(
    (opts?: Record<string, unknown>) =>
      `tabs-trigger-classes variant-${opts?.variant || 'enclosed'} size-${opts?.size || 'md'}`,
  ),
  tabsContent: vi.fn(
    (opts?: Record<string, unknown>) =>
      `tabs-content-classes variant-${opts?.variant || 'enclosed'}`,
  ),
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
    expect(props).toHaveProperty('className')
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
      { attrs: {}, slots: mockSlots, emit: mockEmit },
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
      { attrs: {}, slots: mockSlots, emit: mockEmit },
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
      { attrs: {}, slots: mockSlots, emit: mockEmit },
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
      { attrs: {}, slots: mockSlots, emit: mockEmit },
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
      { attrs: {}, slots: mockSlots, emit: mockEmit },
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
      { attrs: {}, slots: mockSlots, emit: mockEmit },
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
      { attrs: {}, slots: mockSlots, emit: mockEmit },
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
      { attrs: {}, slots: mockSlots, emit: mockEmit },
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
      { attrs: {}, slots: mockSlots, emit: mockEmit },
    )
    renderFn()
    expect(mockClassMap.button).toHaveBeenCalledWith(expect.objectContaining({ size: 'xl' }))
  })
})

// ============================================================================
// Input Component Tests
// ============================================================================

describe('Input component', () => {
  beforeEach(() => {
    // Members this block's renders touch that the shared mock omits.
    Object.assign(mockClassMap, { textMuted: 'text-muted-classes' })
  })

  const setupInput = async (
    props: Record<string, unknown>,
    emit = vi.fn(),
  ): Promise<{ renderFn: () => unknown; mockEmit: ReturnType<typeof vi.fn> }> => {
    const { Input } = await import('../components/Input.js')
    const renderFn = (Input.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        type: 'text',
        size: 'md',
        align: undefined,
        label: undefined,
        error: undefined,
        hint: undefined,
        leftElement: undefined,
        rightElement: undefined,
        clearable: false,
        clearLabel: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        disabled: false,
        required: false,
        value: undefined,
        defaultValue: undefined,
        placeholder: undefined,
        name: 'test',
        id: undefined,
        ...props,
      },
      { attrs: {}, slots: {}, emit },
    )
    return { renderFn: renderFn as () => unknown, mockEmit: emit }
  }

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
    expect(props).toHaveProperty('align')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('placeholder')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('hint')
    expect(props).toHaveProperty('disabled')
    expect(props).toHaveProperty('required')
    expect(props).toHaveProperty('name')
    expect(props).toHaveProperty('id')
    expect(props).toHaveProperty('clearable')
    expect(props).toHaveProperty('value')
    expect(props).toHaveProperty('defaultValue')
    expect(props).toHaveProperty('leftElement')
    expect(props).toHaveProperty('rightElement')
  })

  it('should have correct default props', async () => {
    const { Input } = await import('../components/Input.js')
    const props = Input.props as Record<string, { default?: unknown }>
    expect(props.type.default).toBe('text')
    expect(props.size.default).toBe('md')
  })

  it('should emit correct events', async () => {
    const { Input } = await import('../components/Input.js')
    expect(Input.emits).toContain('change')
    expect(Input.emits).toContain('clear')
    expect(Input.emits).toContain('focus')
    expect(Input.emits).toContain('blur')
  })

  it('setup should return a render function', async () => {
    const { renderFn } = await setupInput({})
    expect(typeof renderFn).toBe('function')
  })

  it('render should include label when provided', async () => {
    const { renderFn } = await setupInput({ label: 'Email', name: 'email' })
    renderFn()
    // Should have called h with 'label' for the label element
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'label')
    expect(labelCall).toBeDefined()
  })

  it('render should include error message when error prop is set', async () => {
    const { renderFn } = await setupInput({ error: 'Required field' })
    renderFn()
    // Should have called h with 'p' for the error element
    const errorCall = mockH.mock.calls.find(
      (call) => call[0] === 'p' && call[2] === 'Required field',
    )
    expect(errorCall).toBeDefined()
  })

  it('render should include hint when provided and no error', async () => {
    const { renderFn } = await setupInput({ hint: 'Enter your email' })
    renderFn()
    const hintCall = mockH.mock.calls.find(
      (call) => call[0] === 'p' && call[2] === 'Enter your email',
    )
    expect(hintCall).toBeDefined()
  })

  it('render should use error flag when error is present', async () => {
    const { renderFn } = await setupInput({ error: 'error msg' })
    renderFn()
    expect(mockClassMap.input).toHaveBeenCalledWith(expect.objectContaining({ error: true }))
  })

  it('render should pass size to classMap', async () => {
    const { renderFn } = await setupInput({ size: 'xs' })
    renderFn()
    expect(mockClassMap.input).toHaveBeenCalledWith(expect.objectContaining({ size: 'xs' }))
  })

  it('emits change with the native input event like React onChange', async () => {
    const { renderFn, mockEmit } = await setupInput({})
    renderFn()
    const inputCall = mockH.mock.calls.find((call) => call[0] === 'input') as unknown[]
    const event = { type: 'input', target: { value: 'typed' } }
    ;(inputCall[1] as Record<string, unknown>).onInput(event)
    expect(mockEmit).toHaveBeenCalledWith('change', event)
  })

  it('restores a controlled value right after the change handler', async () => {
    const { renderFn } = await setupInput({ value: 'locked', name: 'notes' })
    renderFn()
    const inputCall = mockH.mock.calls.find((call) => call[0] === 'input') as unknown[]
    const target = { value: 'attempt' }
    ;(inputCall[1] as Record<string, unknown>).onInput({ type: 'input', target })
    expect(target.value).toBe('locked')
  })

  it('renders a clear button that emits clear with its click event', async () => {
    const { renderFn, mockEmit } = await setupInput({ clearable: true, value: 'typed text' })
    renderFn()
    const clearCall = mockH.mock.calls.find(
      (call) =>
        call[0] === 'button' && (call[1] as Record<string, unknown>)['aria-label'] === 'Clear',
    ) as unknown[]
    expect(clearCall).toBeDefined()
    const event = { type: 'click' }
    ;(clearCall[1] as Record<string, unknown>).onClick(event)
    expect(mockEmit).toHaveBeenCalledWith('clear', event)
  })
})

// ============================================================================
// Textarea Component Tests
// ============================================================================

describe('Textarea component', () => {
  const setupTextarea = async (
    props: Record<string, unknown>,
    emit = vi.fn(),
  ): Promise<{ renderFn: () => unknown; mockEmit: ReturnType<typeof vi.fn> }> => {
    const { Textarea } = await import('../components/Textarea.js')
    const renderFn = (Textarea.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        size: 'md',
        label: undefined,
        error: undefined,
        hint: undefined,
        autoResize: false,
        minRows: 3,
        maxRows: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        disabled: false,
        required: false,
        value: undefined,
        defaultValue: undefined,
        placeholder: undefined,
        name: 'test',
        id: undefined,
        rows: undefined,
        ...props,
      },
      { attrs: {}, emit },
    )
    return { renderFn: renderFn as () => unknown, mockEmit: emit }
  }

  it('should be defined with correct name', async () => {
    const { Textarea } = await import('../components/Textarea.js')
    expect(Textarea).toBeDefined()
    expect(Textarea.name).toBe('MTextarea')
  })

  it('should have correct props', async () => {
    const { Textarea } = await import('../components/Textarea.js')
    const props = Textarea.props as Record<string, unknown>
    expect(props).toHaveProperty('value')
    expect(props).toHaveProperty('defaultValue')
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
    expect(Textarea.emits).toContain('change')
    expect(Textarea.emits).toContain('focus')
    expect(Textarea.emits).toContain('blur')
  })

  it('renders the textarea with the rows fallback to minRows', async () => {
    const { renderFn } = await setupTextarea({})
    renderFn()
    const textareaCall = mockH.mock.calls.find((call) => call[0] === 'textarea') as unknown[]
    expect((textareaCall[1] as Record<string, unknown>).rows).toBe(3)
  })

  it('emits change with the native input event like React onChange', async () => {
    const { renderFn, mockEmit } = await setupTextarea({})
    renderFn()
    const textareaCall = mockH.mock.calls.find((call) => call[0] === 'textarea') as unknown[]
    const event = { type: 'input', target: { value: 'edited' } }
    ;(textareaCall[1] as Record<string, unknown>).onInput(event)
    expect(mockEmit).toHaveBeenCalledWith('change', event)
  })

  it('autoResize neutralizes the min-height floor inline', async () => {
    const { renderFn } = await setupTextarea({ autoResize: true })
    renderFn()
    const textareaCall = mockH.mock.calls.find((call) => call[0] === 'textarea') as unknown[]
    const style = (textareaCall[1] as Record<string, unknown>).style as Record<string, unknown>
    expect(style).toContainEqual({ minHeight: 0, resize: 'none' })
  })
})

// ============================================================================
// Select Component Tests
// ============================================================================

describe('Select component', () => {
  const baseProps = {
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B', group: 'Group 1' },
      { value: 'c', label: 'Option C', group: 'Group 1' },
    ],
    value: undefined,
    size: 'md',
    label: undefined,
    placeholder: undefined,
    error: undefined,
    hint: undefined,
    clearable: false,
    className: undefined,
    style: undefined,
    testId: undefined,
    disabled: false,
    required: false,
    name: undefined,
    id: undefined,
  }

  it('should be defined with correct name', async () => {
    const { Select } = await import('../components/Select.js')
    expect(Select).toBeDefined()
    expect(Select.name).toBe('MSelect')
  })

  it('should have correct props', async () => {
    const { Select } = await import('../components/Select.js')
    const props = Select.props as Record<string, unknown>
    expect(props).toHaveProperty('value')
    expect(props).toHaveProperty('options')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('placeholder')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('hint')
    expect(props).toHaveProperty('clearable')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('testId')
    expect(props).toHaveProperty('disabled')
    expect(props).toHaveProperty('required')
    expect(props).toHaveProperty('name')
    expect(props).toHaveProperty('id')
  })

  it('should have options as required', async () => {
    const { Select } = await import('../components/Select.js')
    const props = Select.props as Record<string, { required?: boolean }>
    expect(props.options.required).toBe(true)
  })

  it('should emit change and valueChange', async () => {
    const { Select } = await import('../components/Select.js')
    expect(Select.emits).toContain('change')
    expect(Select.emits).toContain('valueChange')
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
      { ...baseProps },
      { attrs: {}, emit: mockEmit },
    )

    expect(typeof renderFn).toBe('function')
    renderFn()
    // Should have rendered optgroup for grouped options
    const optgroupCall = mockH.mock.calls.find((call) => call[0] === 'optgroup')
    expect(optgroupCall).toBeDefined()
  })

  it('setup should wire the generated id into label and describedby', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, label: 'Plan', error: 'Required.' },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()

    const selectCall = mockH.mock.calls.find((call) => call[0] === 'select')
    expect(selectCall).toBeDefined()
    const selectId = selectCall![1].id as string
    expect(selectId).toContain('mol-select-')
    expect(selectCall![1]['aria-describedby']).toBe(`${selectId}-error`)
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'label')
    expect(labelCall![1].for).toBe(selectId)
  })

  it('setup should prefer id and name for the select id', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, name: 'plan', id: undefined },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()
    const selectCall = mockH.mock.calls.find((call) => call[0] === 'select')
    expect(selectCall![1].id).toBe('plan')

    const renderFn2 = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, name: 'plan', id: 'plan-field' },
      { attrs: {}, emit: mockEmit },
    )
    renderFn2()
    const selectCall2 = mockH.mock.calls.find(
      (call) => call[0] === 'select' && call[1].id === 'plan-field',
    )
    expect(selectCall2).toBeDefined()
  })

  it('setup should describe hint only without error', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, hint: 'You can switch later.' },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()
    const selectCall = mockH.mock.calls.find((call) => call[0] === 'select')
    expect(selectCall![1]['aria-describedby']).toBe(`${selectCall![1].id}-hint`)

    renderFn()
    const withError = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, hint: 'You can switch later.', error: 'Required.' },
      { attrs: {}, emit: mockEmit },
    )
    withError()
    const errorSelect = mockH.mock.calls
      .filter((call) => call[0] === 'select')
      .find((call) => call[1].name === undefined && call[1]['aria-invalid'] === true)
    expect(errorSelect).toBeDefined()
  })

  it('setup should suppress the clear option when a placeholder is shown', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, clearable: true, placeholder: 'Choose…' },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()
    const emptyValueOptions = mockH.mock.calls.filter(
      (call) => call[0] === 'option' && call[1]?.value === '',
    )
    expect(emptyValueOptions).toHaveLength(1)
    expect(emptyValueOptions[0]![1].disabled).toBe(true)
  })

  it('setup should render the clear option without a placeholder', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, clearable: true },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()
    const clearOption = mockH.mock.calls.find(
      (call) => call[0] === 'option' && call[1]?.value === '',
    )
    expect(clearOption).toBeDefined()
    expect(clearOption![2]).toBe('--')
  })

  it('change should emit the event and valueChange the selected value', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, value: 'free' },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()
    const selectCall = mockH.mock.calls.find((call) => call[0] === 'select')
    const handleChange = selectCall![1].onChange as (event: unknown) => void

    const event = { target: { value: 'pro' } }
    handleChange(event)
    expect(mockEmit).toHaveBeenNthCalledWith(1, 'change', event)
    expect(mockEmit).toHaveBeenNthCalledWith(2, 'valueChange', 'pro')
    // Controlled restore: the DOM goes back to the rendered `value` prop.
    expect((event.target as { value: string }).value).toBe('free')
  })

  it('uncontrolled change keeps the user selection', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, value: undefined },
      { attrs: { defaultValue: 'free' }, emit: mockEmit },
    )
    renderFn()
    const selectCall = mockH.mock.calls.find((call) => call[0] === 'select')
    const handleChange = selectCall![1].onChange as (event: unknown) => void

    const event = { target: { value: 'enterprise' } }
    handleChange(event)
    expect(mockEmit).toHaveBeenCalledWith('valueChange', 'enterprise')
    expect((event.target as { value: string }).value).toBe('enterprise')
    // The rest spread must not carry a defaultValue attribute.
    expect(selectCall![1].defaultValue).toBeUndefined()
  })

  it('setup should pass className and testId onto the select', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, className: 'parity-token', testId: 'plan' },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()
    const selectCall = mockH.mock.calls.find((call) => call[0] === 'select')
    expect(selectCall![1]['data-testid']).toBe('plan')
    expect(selectCall![1].class).toContain('parity-token')
    expect(selectCall![1].class).toContain('select-native')
    expect(selectCall![1].class).toContain('input-pad-right')
  })

  it('setup should spread the rest attrs onto the select', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps },
      {
        attrs: { 'aria-label': 'Subscription plan', 'data-mol-id': 'plan-select' },
        emit: mockEmit,
      },
    )
    renderFn()
    const selectCall = mockH.mock.calls.find((call) => call[0] === 'select')
    expect(selectCall![1]['aria-label']).toBe('Subscription plan')
    expect(selectCall![1]['data-mol-id']).toBe('plan-select')
    // The wrapper stays a plain ClassMap root.
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1].class).toBe('input-wrapper')
  })

  it('setup should not mark a controlled select with option selected attributes', async () => {
    const { Select } = await import('../components/Select.js')
    const mockEmit = vi.fn()

    const renderFn = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, value: 'free' },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()
    const optionCalls = mockH.mock.calls.filter((call) => call[0] === 'option')
    for (const call of optionCalls) {
      expect(call[1].selected).toBeUndefined()
    }

    // defaultValue (uncontrolled) selects its option via the attribute instead.
    renderFn()
    const uncontrolled = (Select.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, value: undefined },
      { attrs: { defaultValue: 'a' }, emit: mockEmit },
    )
    uncontrolled()
    const selected = mockH.mock.calls.find(
      (call) => call[0] === 'option' && call[1]?.selected === true,
    )
    expect(selected![1].value).toBe('a')
  })
})

// ============================================================================
// Checkbox Component Tests
// ============================================================================

describe('Checkbox component', () => {
  // Members this block's renders touch that the shared mock omits.
  beforeEach(() => {
    Object.assign(mockClassMap, {
      formFieldWrapper: 'form-field-wrapper-classes',
      sp: vi.fn((prop: string, n: number) => `${prop}-${n}`),
    })
  })

  const setupCheckbox = async (
    props: Record<string, unknown>,
    emit = vi.fn(),
  ): Promise<{ renderFn: () => unknown; mockEmit: ReturnType<typeof vi.fn> }> => {
    const { Checkbox } = await import('../components/Checkbox.js')
    const renderFn = (Checkbox.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        label: undefined,
        checked: undefined,
        indeterminate: undefined,
        size: undefined,
        error: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        disabled: false,
        name: 'agree',
        id: undefined,
        ...props,
      },
      { attrs: {}, slots: {}, emit },
    )
    return { renderFn: renderFn as () => unknown, mockEmit: emit }
  }

  it('should be defined with correct name', async () => {
    const { Checkbox } = await import('../components/Checkbox.js')
    expect(Checkbox).toBeDefined()
    expect(Checkbox.name).toBe('MCheckbox')
  })

  it('should have correct props', async () => {
    const { Checkbox } = await import('../components/Checkbox.js')
    const props = Checkbox.props as Record<string, unknown>
    expect(props).toHaveProperty('checked')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('indeterminate')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('disabled')
  })

  it('should emit change', async () => {
    const { Checkbox } = await import('../components/Checkbox.js')
    expect(Checkbox.emits).toContain('change')
  })

  it('renders the checkbox inside the control label', async () => {
    const { renderFn } = await setupCheckbox({ label: 'Accept terms' })
    renderFn()
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'label') as unknown[]
    expect(labelCall).toBeDefined()
    const inputCall = mockH.mock.calls.find((call) => call[0] === 'input') as unknown[]
    expect((inputCall[1] as Record<string, unknown>).type).toBe('checkbox')
    expect((inputCall[1] as Record<string, unknown>)['data-state']).toBe('unchecked')
  })

  it('marks the input invalid and describes the error', async () => {
    const { renderFn } = await setupCheckbox({ error: 'Required.' })
    renderFn()
    const inputCall = mockH.mock.calls.find((call) => call[0] === 'input') as unknown[]
    const attrs = inputCall[1] as Record<string, unknown>
    expect(attrs['aria-invalid']).toBe(true)
    expect(String(attrs['aria-describedby'])).toMatch(/-error$/)
  })

  it('emits change with the toggling click event like React onChange', async () => {
    const { renderFn, mockEmit } = await setupCheckbox({})
    renderFn()
    const inputCall = mockH.mock.calls.find((call) => call[0] === 'input') as unknown[]
    const event = { type: 'click', target: { checked: true } }
    ;(inputCall[1] as Record<string, unknown>).onClick(event)
    expect(mockEmit).toHaveBeenCalledWith('change', event)
  })

  it('restores a controlled checked right after the change handler', async () => {
    const { renderFn } = await setupCheckbox({ checked: true })
    renderFn()
    const inputCall = mockH.mock.calls.find((call) => call[0] === 'input') as unknown[]
    const target = { checked: false }
    ;(inputCall[1] as Record<string, unknown>).onClick({ type: 'click', target })
    expect(target.checked).toBe(true)
  })
})

// ============================================================================
// RadioGroup Component Tests
// ============================================================================

describe('RadioGroup component', () => {
  // The shared mock ClassMap has no `sp` token; the React port lays out the
  // label and the error line with `cm.sp('mb', 2)` / `cm.sp('mt', 1)`.
  beforeEach(() => {
    mockClassMap.sp = vi.fn((prop: string, n: number) => `${prop}-${n}`)
  })

  const baseProps = {
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ],
    value: undefined,
    size: undefined,
    label: undefined,
    name: 'flavor',
    direction: 'vertical',
    error: undefined,
    disabled: false,
    className: undefined,
    style: undefined,
    testId: undefined,
  }

  it('should be defined with correct name', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    expect(RadioGroup).toBeDefined()
    expect(RadioGroup.name).toBe('MRadioGroup')
  })

  it('should have correct props', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const props = RadioGroup.props as Record<string, unknown>
    expect(props).toHaveProperty('value')
    expect(props).toHaveProperty('options')
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('name')
    expect(props).toHaveProperty('direction')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('disabled')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('testId')
  })

  it('should have correct default direction', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const props = RadioGroup.props as Record<string, { default?: unknown }>
    expect(props.direction.default).toBe('vertical')
  })

  it('should emit change', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    expect(RadioGroup.emits).toContain('change')
  })

  it('should render with role radiogroup', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const mockEmit = vi.fn()

    const renderFn = (RadioGroup.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, label: 'Choose' },
      { attrs: {}, emit: mockEmit },
    )

    renderFn()
    // Last call to h should be the root div with role 'radiogroup'
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]).toHaveProperty('role', 'radiogroup')
    expect(rootCall[1]['aria-label']).toBe('Choose')
  })

  it('should fall back to a translated aria label', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const mockEmit = vi.fn()

    const renderFn = (RadioGroup.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, label: undefined },
      { attrs: {}, emit: mockEmit },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]['aria-label']).toBe('Radio group')
  })

  it('should wire the shared name and the error describedby', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const mockEmit = vi.fn()

    const renderFn = (RadioGroup.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, error: 'Pick one.' },
      { attrs: {}, emit: mockEmit },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]['aria-invalid']).toBe(true)
    expect(rootCall[1]['aria-describedby']).toBe('flavor-error')
    const inputs = mockH.mock.calls.filter((call) => call[0] === 'input')
    for (const call of inputs) {
      expect(call[1].name).toBe('flavor')
    }
    const errorLine = mockH.mock.calls.find((call) => call[0] === 'p')
    expect(errorLine![1].id).toBe('flavor-error')
  })

  it('change emits the option value and restores the controlled checked state', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const mockEmit = vi.fn()

    const renderFn = (RadioGroup.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, value: 'a' },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()
    const inputCalls = mockH.mock.calls.filter((call) => call[0] === 'input')
    expect(inputCalls).toHaveLength(2)
    const handleChange = inputCalls[1]![1].onChange as (event: unknown) => void

    // The second input's handler; the fake target reports the radios Vue
    // would find from `closest('[role="radiogroup"]')`.
    const radios = [
      { value: 'a', checked: true },
      { value: 'b', checked: true },
    ]
    handleChange({ target: { closest: () => ({ querySelectorAll: () => radios }) } })
    expect(mockEmit).toHaveBeenCalledWith('change', 'b')
    // Controlled restore: every radio returns to the rendered `value` prop.
    expect(radios[0]!.checked).toBe(true)
    expect(radios[1]!.checked).toBe(false)
  })

  it('renders className, testId and style on the group root', async () => {
    const { RadioGroup } = await import('../components/RadioGroup.js')
    const mockEmit = vi.fn()

    const renderFn = (RadioGroup.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, className: 'parity-token', testId: 'flavors', style: { marginTop: '4px' } },
      { attrs: {}, emit: mockEmit },
    )
    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]['data-testid']).toBe('flavors')
    expect(rootCall[1].class).toEqual(['parity-token'])
    expect(rootCall[1].style).toEqual({ marginTop: '4px' })
  })
})

// ============================================================================
// Switch Component Tests
// ============================================================================

describe('Switch component', () => {
  const setupSwitch = async (
    props: Record<string, unknown>,
    emit = vi.fn(),
  ): Promise<{ renderFn: () => unknown; mockEmit: ReturnType<typeof vi.fn> }> => {
    const { Switch } = await import('../components/Switch.js')
    const renderFn = (Switch.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        label: undefined,
        checked: undefined,
        size: 'md',
        color: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        disabled: false,
        ...props,
      },
      { attrs: {}, slots: {}, emit },
    )
    return { renderFn: renderFn as () => unknown, mockEmit: emit }
  }

  it('should be defined with correct name', async () => {
    const { Switch } = await import('../components/Switch.js')
    expect(Switch).toBeDefined()
    expect(Switch.name).toBe('MSwitch')
  })

  it('should have correct props', async () => {
    const { Switch } = await import('../components/Switch.js')
    const props = Switch.props as Record<string, unknown>
    expect(props).toHaveProperty('checked')
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

  it('should emit change and click', async () => {
    const { Switch } = await import('../components/Switch.js')
    expect(Switch.emits).toContain('change')
    expect(Switch.emits).toContain('click')
  })

  it('setup should return render function that creates a switch button', async () => {
    const { renderFn } = await setupSwitch({ checked: false, label: 'Toggle' })
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
    const { renderFn } = await setupSwitch({ checked: true, label: 'Toggle' })
    renderFn()
    const buttonCall = mockH.mock.calls.find(
      (call) => call[0] === 'button' && call[1]?.role === 'switch',
    )
    expect(buttonCall![1]['aria-checked']).toBe(true)
    expect(buttonCall![1]['data-state']).toBe('checked')
  })

  it('renders the hidden native checkbox before the label', async () => {
    const { renderFn } = await setupSwitch({})
    renderFn()
    const first = mockH.mock.calls.find((call) => call[0] === 'input') as unknown[]
    expect((first[1] as Record<string, unknown>).type).toBe('checkbox')
    expect((first[1] as Record<string, unknown>)['aria-hidden']).toBe('true')
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'label') as unknown[]
    expect(labelCall).toBeDefined()
  })

  it('emits click first, then toggles the hidden checkbox unless disabled or vetoed', async () => {
    const { renderFn, mockEmit } = await setupSwitch({})
    renderFn()
    const buttonCall = mockH.mock.calls.find(
      (call) => call[0] === 'button' && call[1]?.role === 'switch',
    ) as unknown[]
    const event = { type: 'click', defaultPrevented: false }
    ;(buttonCall[1] as Record<string, unknown>).onClick(event)
    expect(mockEmit).toHaveBeenCalledWith('click', event)
  })

  it('does not toggle when disabled', async () => {
    const { renderFn, mockEmit } = await setupSwitch({ disabled: true })
    renderFn()
    const buttonCall = mockH.mock.calls.find(
      (call) => call[0] === 'button' && call[1]?.role === 'switch',
    ) as unknown[]
    ;(buttonCall[1] as Record<string, unknown>).onClick({ type: 'click', defaultPrevented: false })
    expect(mockEmit).toHaveBeenCalledTimes(1)
    expect(mockEmit).toHaveBeenCalledWith('click', expect.anything())
    expect(mockEmit).not.toHaveBeenCalledWith('change', expect.anything())
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
      { size: 'md', color: undefined, label: undefined },
      { attrs: {} },
    )

    renderFn()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div' && call[1]?.role === 'status')
    expect(divCall).toBeDefined()
    expect(divCall![1]['aria-label']).toBe('Loading')
  })

  it('should use custom label', async () => {
    const { Spinner } = await import('../components/Spinner.js')

    const renderFn = (Spinner.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { size: 'md', color: undefined, label: 'Processing' },
      { attrs: {} },
    )

    renderFn()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div' && call[1]?.role === 'status')
    expect(divCall![1]['aria-label']).toBe('Processing')
  })

  it('should apply custom color style for non-standard colors', async () => {
    const { Spinner } = await import('../components/Spinner.js')

    const renderFn = (Spinner.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { size: 'md', color: '#ff0000', label: undefined },
      { attrs: {} },
    )

    renderFn()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div' && call[1]?.role === 'status')
    expect(divCall![1].style).toEqual({ borderColor: '#ff0000', borderTopColor: 'transparent' })
  })

  it('should not apply custom color style for standard color names', async () => {
    const { Spinner } = await import('../components/Spinner.js')

    const renderFn = (Spinner.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { size: 'md', color: 'primary', label: undefined },
      { attrs: {} },
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
      { color: 'primary', variant: 'solid', size: undefined, rounded: true, className: undefined },
      { attrs: {}, slots: mockSlots },
    )

    renderFn()
    const spanCall = mockH.mock.calls.find((call) => call[0] === 'span')
    expect(spanCall).toBeDefined()
  })

  it('should pass color as badge variant to classMap', async () => {
    const { Badge } = await import('../components/Badge.js')
    const mockSlots = { default: () => 'Badge text' }

    const renderFn = (Badge.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        color: 'primary',
        variant: 'outline',
        size: undefined,
        rounded: true,
        className: undefined,
      },
      { attrs: {}, slots: mockSlots },
    )

    renderFn()
    expect(mockClassMap.badge).toHaveBeenCalledWith(expect.objectContaining({ variant: 'primary' }))
  })

  it('should map success color to success variant', async () => {
    const { Badge } = await import('../components/Badge.js')
    const mockSlots = { default: () => 'Badge text' }

    const renderFn = (Badge.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { color: 'success', variant: 'solid', size: undefined, rounded: true, className: undefined },
      { attrs: {}, slots: mockSlots },
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
    expect(props).toHaveProperty('live')
    expect(props).toHaveProperty('dismissible')
    expect(props).toHaveProperty('icon')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('testId')
  })

  it('should have correct default status and live', async () => {
    const { Alert } = await import('../components/Alert.js')
    const props = Alert.props as Record<string, { default?: unknown }>
    expect(props.status.default).toBe('info')
    expect(props.live.default).toBe(true)
    expect(props.dismissible.default).toBe(false)
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
        live: true,
        dismissible: false,
        className: undefined,
      },
      { emit: mockEmit, slots: mockSlots, attrs: {} },
    )

    renderFn()
    // Root div should have role='alert'
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]).toHaveProperty('role', 'alert')
  })

  it('should render politely (role status) when live is false', async () => {
    const { Alert } = await import('../components/Alert.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Static banner' }

    const renderFn = (Alert.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: undefined,
        status: 'info',
        variant: undefined,
        live: false,
        dismissible: false,
        className: undefined,
      },
      { emit: mockEmit, slots: mockSlots, attrs: {} },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]).toHaveProperty('role', 'status')
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
        live: true,
        dismissible: false,
        className: undefined,
      },
      { emit: mockEmit, slots: mockSlots, attrs: {} },
    )

    renderFn()
    expect(mockClassMap.alert).toHaveBeenCalledWith(expect.objectContaining({ variant: 'error' }))
  })

  it('should apply testId to the root element', async () => {
    const { Alert } = await import('../components/Alert.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Body text' }

    const renderFn = (Alert.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: undefined,
        status: 'info',
        variant: undefined,
        live: true,
        dismissible: false,
        className: undefined,
        testId: 'save-alert',
      },
      { emit: mockEmit, slots: mockSlots, attrs: {} },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]).toHaveProperty('data-testid', 'save-alert')
  })

  it('should emit dismiss with the click event from the dismiss button', async () => {
    const { Alert } = await import('../components/Alert.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Body text' }

    const renderFn = (Alert.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: undefined,
        status: 'info',
        variant: undefined,
        live: true,
        dismissible: true,
        className: undefined,
      },
      { emit: mockEmit, slots: mockSlots, attrs: {} },
    )

    renderFn()
    // The dismiss button is the last button rendered by the component.
    const buttonCall = mockH.mock.calls.find((call) => call[0] === 'button')
    expect(buttonCall).toBeDefined()
    const dismissEvent = { type: 'click' }
    ;(buttonCall![1] as { onClick: (event: unknown) => void }).onClick(dismissEvent)
    expect(mockEmit).toHaveBeenCalledWith('dismiss', dismissEvent)
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
      { variant: 'outlined', padding: 'md', interactive: false, className: undefined },
      { attrs: {}, emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    expect(mockClassMap.card).toHaveBeenCalledWith(expect.objectContaining({ variant: 'outline' }))
  })

  it('Card setup should set interactive attributes', async () => {
    const { Card } = await import('../components/Card.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'content' }

    const renderFn = (Card.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { variant: 'elevated', padding: 'md', interactive: true, className: undefined },
      { attrs: {}, emit: mockEmit, slots: mockSlots },
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
      { variant: 'elevated', padding: 'none', interactive: false, className: undefined },
      { attrs: {}, emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    // padding 'none' should result in no padding class (empty string filtered by cn)
    expect(rootCall[1].class).not.toContain('card-padding-classes')
  })

  it('Card render should merge the className prop into the class list', async () => {
    const { Card } = await import('../components/Card.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'content' }

    const renderFn = (Card.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { variant: 'elevated', padding: 'md', interactive: false, className: 'parity-token' },
      { attrs: {}, emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[0]).toBe('div')
    expect(rootCall[1].class).toContain('card-classes variant-elevated')
    expect(rootCall[1].class).toContain('card-padding-classes')
    expect(rootCall[1].class).toContain('parity-token')
  })

  it('Card render should map testId to data-testid and apply the style prop', async () => {
    const { Card } = await import('../components/Card.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'content' }

    const renderFn = (Card.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        variant: 'elevated',
        padding: 'md',
        interactive: false,
        testId: 'billing-card',
        style: { marginTop: '4px' },
      },
      { attrs: {}, emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]).toHaveProperty('data-testid', 'billing-card')
    expect(rootCall[1].style).toEqual({ marginTop: '4px' })
  })

  it('Card render should forward data and aria attributes and drop the rest', async () => {
    const { Card } = await import('../components/Card.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'content' }

    const renderFn = (Card.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { variant: 'elevated', padding: 'md', interactive: false },
      {
        attrs: { 'data-mol-id': 'billing-card', 'aria-label': 'Billing summary', id: 'dropped' },
        emit: mockEmit,
        slots: mockSlots,
      },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[1]).toHaveProperty('data-mol-id', 'billing-card')
    expect(rootCall[1]).toHaveProperty('aria-label', 'Billing summary')
    expect(rootCall[1]).not.toHaveProperty('id')
  })

  it('Card render should emit click with the original DOM event', async () => {
    const { Card } = await import('../components/Card.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'content' }

    const renderFn = (Card.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { variant: 'elevated', padding: 'md', interactive: true },
      { attrs: {}, emit: mockEmit, slots: mockSlots },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    const event = { type: 'click' } as unknown as MouseEvent
    ;(rootCall[1].onClick as (event: MouseEvent) => void)(event)
    expect(mockEmit).toHaveBeenCalledWith('click', event)
  })

  it('CardHeader render should merge className, spread rest attrs and emit click', async () => {
    const { CardHeader } = await import('../components/Card.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'Header' }

    const renderFn = (CardHeader.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { className: 'parity-token', style: { marginBottom: '4px' } },
      {
        attrs: { id: 'card-header', 'aria-label': 'Card header', 'data-mol-id': 'header' },
        emit: mockEmit,
        slots: mockSlots,
      },
    )

    renderFn()
    const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(rootCall[0]).toBe('div')
    expect(rootCall[1].class).toContain('card-header-classes')
    expect(rootCall[1].class).toContain('parity-token')
    expect(rootCall[1].style).toEqual({ marginBottom: '4px' })
    expect(rootCall[1]).toHaveProperty('id', 'card-header')
    expect(rootCall[1]).toHaveProperty('aria-label', 'Card header')
    expect(rootCall[1]).toHaveProperty('data-mol-id', 'header')
    const event = { type: 'click' } as unknown as MouseEvent
    ;(rootCall[1].onClick as (event: MouseEvent) => void)(event)
    expect(mockEmit).toHaveBeenCalledWith('click', event)
  })

  it('Card parts should render their own element with their ClassMap token', async () => {
    const { CardTitle, CardDescription, CardContent, CardFooter } =
      await import('../components/Card.js')
    const parts = [
      { component: CardTitle, tag: 'h3', token: 'card-title-classes' },
      { component: CardDescription, tag: 'p', token: 'card-description-classes' },
      { component: CardContent, tag: 'div', token: 'card-content-classes' },
      { component: CardFooter, tag: 'div', token: 'card-footer-classes' },
    ]
    for (const { component, tag, token } of parts) {
      const renderFn = (
        (component as Record<string, unknown>).setup as (
          ...args: unknown[]
        ) => (...args: unknown[]) => unknown
      )(
        { className: undefined, style: undefined },
        { attrs: {}, emit: vi.fn(), slots: { default: () => 'Text' } },
      )
      renderFn()
      const rootCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(rootCall[0]).toBe(tag)
      expect(rootCall[1].class).toContain(token)
    }
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
      { orientation: 'horizontal', decorative: true },
      { attrs: {} },
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(divCall[1]).toHaveProperty('role', 'none')
    expect(divCall[1]['aria-orientation']).toBeUndefined()
  })

  it('should render non-decorative separator with role separator', async () => {
    const { Separator } = await import('../components/Separator.js')

    const renderFn = (Separator.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { orientation: 'vertical', decorative: false },
      { attrs: {} },
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
        className: undefined,
      },
      { attrs: {} },
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
        className: undefined,
      },
      { attrs: {} },
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
        className: undefined,
      },
      { attrs: {} },
    )

    renderFn()
    // Should render label
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'span' && call[2] === 'Upload')
    expect(labelCall).toBeDefined()
    // Should render percentage (children [75, '%'], like React's {Math.round(percentage)}%)
    const percentCall = mockH.mock.calls.find(
      (call) =>
        call[0] === 'span' && Array.isArray(call[2]) && call[2][0] === 75 && call[2][1] === '%',
    )
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
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('style')
    expect(props).toHaveProperty('testId')
  })

  it('should have correct default animation', async () => {
    const { Skeleton } = await import('../components/Skeleton.js')
    const props = Skeleton.props as Record<string, { default?: unknown }>
    expect(props.animation.default).toBe('pulse')
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
        className: undefined,
        style: undefined,
        testId: undefined,
      },
      { attrs: {} },
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(divCall[0]).toBe('div')
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
        className: undefined,
        style: undefined,
        testId: undefined,
      },
      { attrs: {} },
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
        className: undefined,
        style: undefined,
        testId: undefined,
      },
      { attrs: {} },
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(divCall[1].style.borderRadius).toBe('9999px')
    // Circle with width but no height should set height = width
    expect(divCall[1].style.height).toBe('40px')
  })

  it('Skeleton setup should apply className and testId', async () => {
    const { Skeleton } = await import('../components/Skeleton.js')

    const renderFn = (Skeleton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        width: 100,
        height: 20,
        circle: false,
        borderRadius: undefined,
        animation: 'wave',
        className: 'extra',
        style: undefined,
        testId: 'bone',
      },
      { attrs: {} },
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(divCall[1].class).toContain('skeleton-classes')
    expect(divCall[1].class).toContain('skeleton-wave')
    expect(divCall[1].class).toContain('extra')
    expect(divCall[1]['data-testid']).toBe('bone')
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

  it('SkeletonText should render tapered skeleton lines', async () => {
    const { SkeletonText, Skeleton } = await import('../components/Skeleton.js')

    const renderFn = (
      SkeletonText.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ lines: 3, className: undefined }, { attrs: {} })

    renderFn()
    const lines = mockH.mock.calls.filter((call) => call[0] === Skeleton)
    expect(lines).toHaveLength(3)
    expect(lines[0][1]).toEqual(expect.objectContaining({ height: 16, width: '100%' }))
    expect(lines[2][1]).toEqual(expect.objectContaining({ height: 16, width: '60%' }))
    const container = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(container[0]).toBe('div')
    expect(container[1].class).toContain('skeleton-text-container')
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

  it('SkeletonCircle should render a circular Skeleton', async () => {
    const { SkeletonCircle, Skeleton } = await import('../components/Skeleton.js')

    const renderFn = (
      SkeletonCircle.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ size: 24, className: 'avatar' }, { attrs: {} })

    renderFn()
    const circleCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(circleCall[0]).toBe(Skeleton)
    expect(circleCall[1]).toEqual(
      expect.objectContaining({ circle: true, width: 24, height: 24, className: 'avatar' }),
    )
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
    expect(props).toHaveProperty('footer')
    expect(props).toHaveProperty('centered')
    expect(props).toHaveProperty('preventScroll')
    expect(props).toHaveProperty('closeLabel')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('style')
    expect(props).toHaveProperty('testId')
  })

  it('should have correct defaults', async () => {
    const { Modal } = await import('../components/Modal.js')
    const props = Modal.props as Record<string, { default?: unknown }>
    expect(props.size.default).toBe('md')
    expect(props.showCloseButton.default).toBe(true)
    expect(props.closeOnOverlayClick.default).toBe(true)
    expect(props.closeOnEscape.default).toBe(true)
    expect(props.centered.default).toBe(true)
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

  const modalBaseProps = {
    open: true,
    title: undefined,
    size: 'md',
    showCloseButton: true,
    closeOnOverlayClick: true,
    closeOnEscape: true,
    preventScroll: true,
    closeLabel: undefined,
    className: undefined,
    style: undefined,
    testId: undefined,
  }

  const renderModal = async (
    extraProps: Record<string, unknown>,
    attrs: Record<string, unknown> = {},
  ) => {
    const { Modal } = await import('../components/Modal.js')
    const mockEmit = vi.fn()
    const mockSlots = { default: () => 'body' }
    const renderFn = (Modal.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...modalBaseProps, ...extraProps },
      { attrs, emit: mockEmit, slots: mockSlots },
    )
    mockH.mockClear()
    mockEmit.mockClear()
    renderFn()
    return { mockEmit }
  }

  it('renders nothing when open is false', async () => {
    const { mockEmit } = await renderModal({ open: false, title: 'Hidden' })
    expect(mockH).not.toHaveBeenCalled()
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('renders into a body Teleport', async () => {
    await renderModal({ title: 'Portaled' })
    const teleportCall = mockH.mock.calls.find((call) => call[0] === 'Teleport')
    expect(teleportCall).toBeDefined()
    expect(teleportCall![1]).toEqual({ to: 'body' })
  })

  it('centered (default true): the wrapper renders with no inline style', async () => {
    await renderModal({ centered: true })
    const wrapperCall = mockH.mock.calls.find((call) => call[1]?.class === 'dialog-wrapper-classes')
    expect(wrapperCall).toBeDefined()
    expect(wrapperCall![1].style).toBeUndefined()
  })

  it('centered=false: the wrapper top-anchors via an inline style', async () => {
    await renderModal({ centered: false })
    const wrapperCall = mockH.mock.calls.find((call) => call[1]?.class === 'dialog-wrapper-classes')
    expect(wrapperCall).toBeDefined()
    expect(wrapperCall![1].style).toEqual({ alignItems: 'flex-start' })
  })

  it('overlay click on the wrapper calls onClose without arguments', async () => {
    const { mockEmit } = await renderModal({ title: 'Overlay' })
    const wrapperCall = mockH.mock.calls.find((call) => call[1]?.class === 'dialog-wrapper-classes')
    const onClick = wrapperCall![1].onClick as (e: unknown) => void
    const fake = { target: 'self', currentTarget: 'self' }
    onClick(fake)
    expect(mockEmit).toHaveBeenCalledTimes(1)
    expect(mockEmit.mock.calls[0]).toEqual(['close'])
  })

  it('overlay click on an inner element does not call onClose', async () => {
    const { mockEmit } = await renderModal({ title: 'Overlay' })
    const wrapperCall = mockH.mock.calls.find((call) => call[1]?.class === 'dialog-wrapper-classes')
    const onClick = wrapperCall![1].onClick as (e: unknown) => void
    onClick({ target: 'inner', currentTarget: 'self' })
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('closeOnOverlayClick=false ignores overlay clicks', async () => {
    const { mockEmit } = await renderModal({ title: 'Sticky', closeOnOverlayClick: false })
    const wrapperCall = mockH.mock.calls.find((call) => call[1]?.class === 'dialog-wrapper-classes')
    const onClick = wrapperCall![1].onClick as (e: unknown) => void
    onClick({ target: 'self', currentTarget: 'self' })
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('close button click calls onClose with the click event', async () => {
    const { mockEmit } = await renderModal({ title: 'Chrome' })
    const buttonCall = mockH.mock.calls.find(
      (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'modal-close',
    )
    expect(buttonCall).toBeDefined()
    const event = { type: 'click' }
    ;(buttonCall![1].onClick as (e: unknown) => void)(event)
    expect(mockEmit).toHaveBeenCalledTimes(1)
    expect(mockEmit.mock.calls[0]).toEqual(['close', event])
  })

  it('close button uses the custom closeLabel', async () => {
    await renderModal({ title: 'Chrome', closeLabel: 'Dismiss dialog' })
    const buttonCall = mockH.mock.calls.find(
      (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'modal-close',
    )
    expect(buttonCall).toBeDefined()
    expect(buttonCall![1]['aria-label']).toBe('Dismiss dialog')
  })

  it('showCloseButton=false renders no close button', async () => {
    await renderModal({ title: 'No chrome', showCloseButton: false })
    const buttonCall = mockH.mock.calls.find(
      (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'modal-close',
    )
    expect(buttonCall).toBeUndefined()
  })

  it('a title gets an id and aria-labelledby on the dialog', async () => {
    await renderModal({ title: 'Labelled' })
    const dialogCall = mockH.mock.calls.find((call) => call[1]?.role === 'dialog')
    expect(dialogCall).toBeDefined()
    const h2Call = mockH.mock.calls.find((call) => call[0] === 'h2')
    expect(h2Call).toBeDefined()
    expect(dialogCall![1]['aria-labelledby']).toBe(h2Call![1].id)
  })

  it('without a title there is no header and no aria-labelledby', async () => {
    await renderModal({ title: undefined })
    const dialogCall = mockH.mock.calls.find((call) => call[1]?.role === 'dialog')
    expect(dialogCall![1]['aria-labelledby']).toBeUndefined()
    const h2Call = mockH.mock.calls.find((call) => call[0] === 'h2')
    expect(h2Call).toBeUndefined()
  })

  it('forwards data-* and aria-* attrs to the dialog and drops the rest', async () => {
    await renderModal(
      { title: 'Passthrough' },
      { 'aria-label': 'Confirm deletion', 'data-mol-id': 'delete-modal', id: 'dropped' },
    )
    const dialogCall = mockH.mock.calls.find((call) => call[1]?.role === 'dialog')
    expect(dialogCall![1]['aria-label']).toBe('Confirm deletion')
    expect(dialogCall![1]['data-mol-id']).toBe('delete-modal')
    expect(dialogCall![1].id).toBeUndefined()
  })

  it('applies className, style and testId on the dialog', async () => {
    await renderModal({
      title: 'Tokens',
      className: 'parity-token',
      style: { marginTop: '4px' },
      testId: 'confirm-modal',
    })
    const dialogCall = mockH.mock.calls.find((call) => call[1]?.role === 'dialog')
    expect(dialogCall![1]['data-testid']).toBe('confirm-modal')
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
  // Members this block's renders touch that the shared mock omits.
  beforeEach(() => {
    Object.assign(mockClassMap, {
      sp: vi.fn((prop: string, n: number) => `${prop}-${n}`),
      formFieldsetContents: 'form-fieldset-contents',
      floatingInputWrapper: 'floating-input-wrapper-classes',
      floatingInput: 'floating-input-classes',
      floatingLabel: 'floating-label-classes',
    })
  })

  const setupForm = async (
    props: Record<string, unknown>,
    attrs: Record<string, unknown> = {},
  ): Promise<{ renderFn: () => unknown; slots: Record<string, () => unknown> }> => {
    const { Form } = await import('../components/Form.js')
    const slots = { default: () => ['field'] }
    const renderFn = (Form.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        action: undefined,
        method: undefined,
        noValidate: false,
        submitting: false,
        submitError: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        ...props,
      },
      { attrs, slots },
    )
    return { renderFn, slots }
  }

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
    expect(props).toHaveProperty('submitError')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('style')
    expect(props).toHaveProperty('testId')
  })

  it('should read onSubmit and onFormSubmit handlers from attrs, not declared emits', async () => {
    const { Form } = await import('../components/Form.js')
    // React branches on whether the named handlers exist, so the raw handlers
    // are read from the incoming `on*` attrs instead of declared emits.
    expect(Form.emits).toBeUndefined()
    const { renderFn } = await setupForm({}, { onSubmit: vi.fn(), onFormSubmit: vi.fn() })
    renderFn()
    const formCall = mockH.mock.calls.find((call) => call[0] === 'form')
    expect(formCall).toBeDefined()
    expect(typeof formCall![1].onSubmit).toBe('function')
    expect(formCall![1]).not.toHaveProperty('onFormSubmit')
  })

  it('should render form attributes, class, style, testId and forward rest events natively', async () => {
    const { renderFn } = await setupForm(
      {
        action: '/submit',
        method: 'post',
        noValidate: true,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'signup',
      },
      { onReset: vi.fn() },
    )
    renderFn()
    const formCall = mockH.mock.calls.find((call) => call[0] === 'form')
    expect(formCall![1].action).toBe('/submit')
    expect(formCall![1].method).toBe('post')
    expect(formCall![1].noValidate).toBe(true)
    expect(formCall![1].class).toBe('parity-token')
    expect(formCall![1].style).toEqual({ marginTop: '4px' })
    expect(formCall![1]['data-testid']).toBe('signup')
    // React's rest spread carries `onReset` verbatim; Vue needs the native
    // event spelling (`onreset`), not `onReset` (an event nothing dispatches).
    expect(typeof formCall![1].onreset).toBe('function')
  })

  it('should wrap children in a fieldset with the contents class', async () => {
    const { renderFn } = await setupForm({ submitting: true })
    renderFn()
    const fieldsetCall = mockH.mock.calls.find((call) => call[0] === 'fieldset')
    expect(fieldsetCall).toBeDefined()
    expect(fieldsetCall![1].disabled).toBe(true)
    expect(fieldsetCall![1].class).toBe('form-fieldset-contents')
    expect(fieldsetCall![2]).toEqual(['field'])
  })

  it('should call both handlers on submit: onFormSubmit with collected data, onSubmit with the event', async () => {
    class FakeFormData {
      forEach(cb: (value: string, key: string) => void): void {
        cb('ada@example.com', 'email')
        cb('2', 'count')
      }
    }
    vi.stubGlobal('FormData', FakeFormData)
    try {
      const onFormSubmit = vi.fn()
      const onSubmit = vi.fn()
      const { renderFn } = await setupForm({}, { onFormSubmit, onSubmit })
      renderFn()
      const formCall = mockH.mock.calls.find((call) => call[0] === 'form')
      const handler = formCall![1].onSubmit as (e: unknown) => Promise<void>
      const event = { preventDefault: vi.fn(), currentTarget: {} }
      await handler(event)
      expect(onFormSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', count: '2' })
      expect(onSubmit).toHaveBeenCalledWith(event)
      expect(event.preventDefault).toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('should ignore submits with neither handler', async () => {
    let constructed = 0
    class FakeFormData {
      constructor() {
        constructed++
      }
      forEach(_cb: (value: string, key: string) => void): void {}
    }
    vi.stubGlobal('FormData', FakeFormData)
    try {
      const { renderFn } = await setupForm({})
      renderFn()
      const formCall = mockH.mock.calls.find((call) => call[0] === 'form')
      const handler = formCall![1].onSubmit as (e: unknown) => Promise<void>
      const event = { preventDefault: vi.fn(), currentTarget: {} }
      await handler(event)
      expect(constructed).toBe(0)
      expect(event.preventDefault).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('should render a server-error list for a submitError prop', async () => {
    const { renderFn } = await setupForm({ submitError: 'boom' })
    renderFn()
    const ulCall = mockH.mock.calls.find((call) => call[0] === 'ul')
    expect(ulCall).toBeDefined()
    expect(ulCall![1].role).toBe('alert')
    expect(ulCall![1].class).toBe('form-error-classes')
    expect(ulCall![2]).toEqual([expect.objectContaining({ type: 'li', children: 'boom' })])
    // The fieldset still renders after the error list.
    const fieldsetCall = mockH.mock.calls.find((call) => call[0] === 'fieldset')
    expect(fieldsetCall).toBeDefined()
  })

  it('should render no error list without a submitError or a rejected submission', async () => {
    const { renderFn } = await setupForm({})
    renderFn()
    expect(mockH.mock.calls.find((call) => call[0] === 'ul')).toBeUndefined()
  })

  it('should define FormField with correct name', async () => {
    const { FormField } = await import('../components/Form.js')
    expect(FormField).toBeDefined()
    expect(FormField.name).toBe('MFormField')
  })

  it('FormField should have label, name, error, hint, required, className, style, testId props', async () => {
    const { FormField } = await import('../components/Form.js')
    const props = FormField.props as Record<string, unknown>
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('name')
    expect(props).toHaveProperty('error')
    expect(props).toHaveProperty('hint')
    expect(props).toHaveProperty('required')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('style')
    expect(props).toHaveProperty('testId')
  })

  const setupFormField = async (props: Record<string, unknown>): Promise<() => unknown> => {
    const { FormField } = await import('../components/Form.js')
    // Two children: the single-real-element injection path clones the child,
    // which the mocked vue module does not implement (that path is covered by
    // the conformance kit against real Vue).
    const slots = { default: () => [{ type: 'input' }, { type: 'input' }] }
    const renderFn = (FormField.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        label: undefined,
        name: undefined,
        error: undefined,
        hint: undefined,
        required: false,
        className: undefined,
        style: undefined,
        testId: undefined,
        ...props,
      },
      { attrs: {}, slots },
    )
    return () => renderFn()
  }

  it('FormField should render the wrapper, label and hint/error notes', async () => {
    const render = await setupFormField({ label: 'Email address', name: 'email', hint: 'Help.' })
    render()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div')
    expect(divCall![1].class).toBe('input-wrapper mb-4')
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'label')
    expect(labelCall![1].for).toBe('email')
    expect(labelCall![1].class).toBe('label-classes required-false label-block')
    expect(labelCall![2]).toBe('Email address')
    const hintCall = mockH.mock.calls.find(
      (call) => call[0] === 'p' && call[1]?.id === 'email-hint',
    )
    expect(hintCall).toBeDefined()
    expect(hintCall![1].class).toBe('form-hint-classes')
    expect(hintCall![2]).toBe('Help.')
  })

  it('FormField error wins over hint and carries the error id and class', async () => {
    const render = await setupFormField({
      label: 'Email',
      name: 'email',
      error: 'Invalid.',
      hint: 'Help.',
    })
    render()
    expect(
      mockH.mock.calls.find((call) => call[0] === 'p' && call[1]?.id === 'email-hint'),
    ).toBeUndefined()
    const errorCall = mockH.mock.calls.find(
      (call) => call[0] === 'p' && call[1]?.id === 'email-error',
    )
    expect(errorCall).toBeDefined()
    expect(errorCall![1].class).toBe('form-error-classes')
    expect(errorCall![2]).toBe('Invalid.')
  })

  it('FormField without a label renders no label element', async () => {
    const render = await setupFormField({ name: 'email' })
    render()
    expect(mockH.mock.calls.find((call) => call[0] === 'label')).toBeUndefined()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div')
    expect(divCall![1]['data-testid']).toBeUndefined()
  })

  it('FormField passes className, style and testId onto the wrapper', async () => {
    const render = await setupFormField({
      label: 'Email',
      name: 'email',
      className: 'parity-token',
      style: { marginTop: '4px' },
      testId: 'field',
    })
    render()
    const divCall = mockH.mock.calls.find((call) => call[0] === 'div')
    expect(divCall![1].class).toBe('input-wrapper mb-4 parity-token')
    expect(divCall![1].style).toEqual({ marginTop: '4px' })
    expect(divCall![1]['data-testid']).toBe('field')
  })

  it('should define Label with correct name and props', async () => {
    const { Label } = await import('../components/Form.js')
    expect(Label).toBeDefined()
    expect(Label.name).toBe('MLabel')
    const props = Label.props as Record<string, unknown>
    expect(props).toHaveProperty('required')
    expect(props).toHaveProperty('className')
    // React's Label keeps every other attribute (htmlFor, aria-*, …) in its
    // rest spread, so no `for` prop is declared here.
    expect(props).not.toHaveProperty('for')
  })

  it('Label should apply the label classes with the required marker and className', async () => {
    const { Label } = await import('../components/Form.js')
    const renderFn = (Label.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { required: true, className: 'parity-token' },
      {
        attrs: { htmlFor: 'email-field' },
        slots: { default: () => ['Email'] },
      },
    )
    renderFn()
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'label')
    expect(labelCall).toBeDefined()
    expect(labelCall![1].class).toBe('label-classes required-true parity-token')
    expect(mockClassMap.label).toHaveBeenCalledWith({ required: true })
    expect(labelCall![2]).toEqual(['Email'])
  })

  it('Label should forward htmlFor and other rest attributes verbatim', async () => {
    const { Label } = await import('../components/Form.js')
    const renderFn = (Label.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { required: false, className: undefined },
      {
        attrs: { htmlFor: 'email-field', 'aria-label': 'Email address' },
        slots: { default: () => ['Email'] },
      },
    )
    renderFn()
    const labelCall = mockH.mock.calls.find((call) => call[0] === 'label')
    expect(labelCall![1].htmlFor).toBe('email-field')
    expect(labelCall![1]['aria-label']).toBe('Email address')
  })
})

describe('FloatingInput component', () => {
  // Members this block's renders touch that the shared mock omits.
  beforeEach(() => {
    Object.assign(mockClassMap, {
      floatingInputWrapper: 'floating-input-wrapper-classes',
      floatingInput: 'floating-input-classes',
      floatingLabel: 'floating-label-classes',
    })
  })

  const setupFloatingInput = async (
    props: Record<string, unknown>,
    attrs: Record<string, unknown> = {},
  ): Promise<{
    renderFn: () => unknown
    mockEmit: ReturnType<typeof vi.fn>
  }> => {
    const { FloatingInput } = await import('../components/FloatingInput.js')
    const mockEmit = vi.fn()
    const renderFn = (
      FloatingInput.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      {
        placeholder: undefined,
        className: undefined,
        value: undefined,
        defaultValue: undefined,
        id: undefined,
        ...props,
      },
      { attrs, emit: mockEmit },
    )
    return { renderFn, mockEmit }
  }

  const inputCall = (): { props: Record<string, unknown>; children: unknown } | undefined => {
    // The latest render: some tests render twice around an input event.
    const call = mockH.mock.calls.findLast(
      (c) => c[0] === 'input' && typeof c[1]?.onInput === 'function',
    )
    return call ? { props: call[1], children: call[2] } : undefined
  }

  it('should be defined with correct name, props and emits', async () => {
    const { FloatingInput } = await import('../components/FloatingInput.js')
    expect(FloatingInput).toBeDefined()
    expect(FloatingInput.name).toBe('MFloatingInput')
    const props = FloatingInput.props as Record<string, unknown>
    expect(props).toHaveProperty('placeholder')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('value')
    expect(props).toHaveProperty('defaultValue')
    expect(props).toHaveProperty('id')
    expect(FloatingInput.emits).toEqual(['change', 'focus', 'blur'])
  })

  it('should render the wrapper, the input and a floating label for the placeholder', async () => {
    const { renderFn } = await setupFloatingInput({ placeholder: 'Email address' })
    renderFn()
    const spanCall = mockH.mock.calls.find((call) => call[0] === 'span')
    expect(spanCall).toBeDefined()
    expect(spanCall![1].class).toBe('floating-input-wrapper-classes')
    const input = inputCall()
    expect(input).toBeDefined()
    expect(input!.props.class).toContain('input-classes')
    expect(input!.props.class).toContain('floating-input-classes')
    expect(input!.props.placeholder).toBe('Email address')
    expect(input!.props.value).toBe('')
    expect(mockH.mock.calls.find((call) => call[0] === 'label')).toBeDefined()
  })

  it('should render no floating label without a placeholder', async () => {
    const { renderFn } = await setupFloatingInput({})
    renderFn()
    expect(mockH.mock.calls.find((call) => call[0] === 'label')).toBeUndefined()
    expect(inputCall()!.props.placeholder).toBeUndefined()
  })

  it('should associate the floating label with the generated or explicit id', async () => {
    const { renderFn } = await setupFloatingInput({
      placeholder: 'Email address',
      id: 'floating-email',
    })
    renderFn()
    const label = mockH.mock.calls.find((call) => call[0] === 'label')
    expect(label![1].for).toBe('floating-email')
    expect(inputCall()!.props.id).toBe('floating-email')
  })

  it('should seed uncontrolled state from defaultValue and update it on input', async () => {
    const { renderFn, mockEmit } = await setupFloatingInput({ defaultValue: 'seed' })
    renderFn()
    expect(inputCall()!.props.value).toBe('seed')
    const event = { target: { value: 'typed more' } }
    ;(inputCall()!.props.onInput as (e: unknown) => void)(event)
    renderFn()
    expect(inputCall()!.props.value).toBe('typed more')
    expect(mockEmit).toHaveBeenCalledWith('change', event)
    expect(event.target.value).toBe('typed more')
  })

  it('should keep a controlled value and restore the DOM property after input', async () => {
    const { renderFn, mockEmit } = await setupFloatingInput({ value: 'locked@x.io' })
    renderFn()
    expect(inputCall()!.props.value).toBe('locked@x.io')
    const event = { target: { value: 'attempt@x.io' } }
    ;(inputCall()!.props.onInput as (e: unknown) => void)(event)
    renderFn()
    expect(inputCall()!.props.value).toBe('locked@x.io')
    expect(mockEmit).toHaveBeenCalledWith('change', event)
    expect(event.target.value).toBe('locked@x.io')
  })

  it('should emit focus and blur from the bubbling focus events', async () => {
    const { renderFn, mockEmit } = await setupFloatingInput({ placeholder: 'Email address' })
    renderFn()
    const input = inputCall()
    const focusEvent = { type: 'focusin' }
    const blurEvent = { type: 'focusout' }
    ;(input!.props.onFocusin as (e: unknown) => void)(focusEvent)
    ;(input!.props.onFocusout as (e: unknown) => void)(blurEvent)
    expect(mockEmit).toHaveBeenCalledWith('focus', focusEvent)
    expect(mockEmit).toHaveBeenCalledWith('blur', blurEvent)
  })

  it('should forward rest attributes and className onto the input', async () => {
    const { renderFn } = await setupFloatingInput(
      { placeholder: 'Email address', className: 'parity-token' },
      { 'data-testid': 'floating', type: 'email', name: 'email' },
    )
    renderFn()
    const input = inputCall()
    expect(input!.props['data-testid']).toBe('floating')
    expect(input!.props.type).toBe('email')
    expect(input!.props.name).toBe('email')
    expect(input!.props.class).toContain('parity-token')
  })
})

// ============================================================================
// Tabs Component Tests
// ============================================================================

describe('Tabs component', () => {
  const ITEMS = [
    { value: 'account', label: 'Account', content: 'Account settings' },
    { value: 'profile', label: 'Profile', content: 'Profile settings' },
    { value: 'billing', label: 'Billing', content: 'Billing settings' },
  ]

  /** Renders Tabs once through its setup and returns the render function. */
  const renderTabs = async (props: Record<string, unknown>, emit = vi.fn()) => {
    const { Tabs } = await import('../components/Tabs.js')
    const renderFn = (Tabs.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      props,
      { attrs: {}, emit },
    )
    renderFn()
    return { emit, renderFn }
  }

  /** The tab buttons of the MOST RECENT render, in item order. */
  const lastTabButtons = (): Record<string, unknown>[] => {
    const calls = mockH.mock.calls.filter((call) => call[0] === 'button' && call[1]?.role === 'tab')
    return calls.slice(-ITEMS.length).map((call) => call[1] as Record<string, unknown>)
  }

  /** The tablist element props of the most recent render. */
  const lastTabList = (): Record<string, unknown> => {
    const calls = mockH.mock.calls.filter(
      (call) => call[0] === 'div' && call[1]?.role === 'tablist',
    )
    return calls[calls.length - 1][1] as Record<string, unknown>
  }

  /** The active tabpanel element props of the most recent render, if any. */
  const lastPanel = (): Record<string, unknown> | undefined => {
    const calls = mockH.mock.calls.filter(
      (call) => call[0] === 'div' && call[1]?.role === 'tabpanel',
    )
    return calls.length ? (calls[calls.length - 1][1] as Record<string, unknown>) : undefined
  }

  it('should be defined with correct name', async () => {
    const { Tabs } = await import('../components/Tabs.js')
    expect(Tabs).toBeDefined()
    expect(Tabs.name).toBe('MTabs')
  })

  it('should have correct props', async () => {
    const { Tabs } = await import('../components/Tabs.js')
    const props = Tabs.props as Record<string, unknown>
    expect(props).toHaveProperty('items')
    expect(props).toHaveProperty('value')
    expect(props).toHaveProperty('defaultValue')
    expect(props).toHaveProperty('variant')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('fitted')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('style')
    expect(props).toHaveProperty('testId')
  })

  it('should require items', async () => {
    const { Tabs } = await import('../components/Tabs.js')
    const props = Tabs.props as Record<string, { required?: boolean }>
    expect(props.items.required).toBe(true)
  })

  it('should emit change (React onChange)', async () => {
    const { Tabs } = await import('../components/Tabs.js')
    expect(Tabs.emits).toContain('change')
  })

  it('should render the first item as the active tab by default', async () => {
    await renderTabs({ items: ITEMS })

    const buttons = lastTabButtons()
    expect(buttons).toHaveLength(3)
    expect(buttons[0]['aria-selected']).toBe(true)
    expect(buttons[0]['data-state']).toBe('active')
    expect(buttons[0].tabindex).toBe(0)
    expect(buttons[1]['aria-selected']).toBe(false)
    expect(buttons[1]['data-state']).toBe('inactive')
    expect(buttons[1].tabindex).toBe(-1)
    expect(buttons[0].type).toBe('button')
    expect(lastPanel()).toBeDefined()
    expect(lastPanel()!['aria-labelledby']).toBe(buttons[0].id)
  })

  it('should wire each tab id to its panel through the per-instance prefix', async () => {
    await renderTabs({ items: ITEMS })

    const buttons = lastTabButtons()
    const panel = lastPanel()!
    expect(String(buttons[0].id)).toMatch(/^mol-tabs-\d+-tab-account$/)
    expect(String(buttons[1].id)).toMatch(/^mol-tabs-\d+-tab-profile$/)
    expect(buttons[1]['aria-controls']).toBe(String(buttons[1].id).replace(/-tab-/, '-tabpanel-'))
    expect(panel.id).toMatch(/^mol-tabs-\d+-tabpanel-account$/)
  })

  it('should select the defaultValue tab', async () => {
    await renderTabs({ items: ITEMS, defaultValue: 'profile' })

    const buttons = lastTabButtons()
    expect(buttons[1]['aria-selected']).toBe(true)
    expect(buttons[0]['aria-selected']).toBe(false)
    expect(lastPanel()!['aria-labelledby']).toBe(buttons[1].id)
  })

  it('should honor a controlled value', async () => {
    await renderTabs({ items: ITEMS, value: 'billing' })

    const buttons = lastTabButtons()
    expect(buttons[2]['aria-selected']).toBe(true)
    expect(buttons[2].tabindex).toBe(0)
  })

  it('should render no panel when the active item has no content', async () => {
    await renderTabs({
      items: [
        { value: 'a', label: 'A', content: 'A body' },
        { value: 'b', label: 'B' },
      ],
      value: 'b',
    })

    expect(lastPanel()).toBeUndefined()
  })

  it('should render no panel when no item has content', async () => {
    await renderTabs({ items: ITEMS.map(({ value, label }) => ({ value, label })) })

    expect(lastPanel()).toBeUndefined()
  })

  it('should disable a disabled tab', async () => {
    await renderTabs({
      items: [
        { value: 'a', label: 'A', content: 'A body' },
        { value: 'b', label: 'B', content: 'B body', disabled: true },
      ],
    })

    const buttons = lastTabButtons()
    expect(buttons[1].disabled).toBe(true)
    // React's `disabled={item.disabled}` with undefined renders no attribute.
    expect(buttons[0].disabled).toBeFalsy()
  })

  it('should render an item icon inside a tabTriggerIcon span', async () => {
    const icon = { __vnode: true, type: 'svg' }
    await renderTabs({
      items: [
        { value: 'a', label: 'A', content: 'A body', icon },
        { value: 'b', label: 'B', content: 'B body' },
      ],
    })

    const spanCall = mockH.mock.calls.find(
      (call) => call[0] === 'span' && call[1]?.class === 'tab-trigger-icon',
    )
    expect(spanCall).toBeDefined()
    expect(spanCall![2]).toBe(icon)
  })

  it('should pass className, style and testId to the root div', async () => {
    await renderTabs({
      items: ITEMS,
      className: 'parity-token',
      style: { marginTop: '4px' },
      testId: 'settings-tabs',
    })

    const rootCall = mockH.mock.calls.find((call) => call[0] === 'div' && call[1]?.['data-testid'])
    expect(rootCall).toBeDefined()
    expect(rootCall![1].class).toBe('parity-token')
    expect(rootCall![1].style).toEqual({ marginTop: '4px' })
    expect(rootCall![1]['data-testid']).toBe('settings-tabs')
  })

  it('should pass variant, size and fitted to the ClassMap calls', async () => {
    await renderTabs({ items: ITEMS, variant: 'line', size: 'lg', fitted: true })

    expect(mockClassMap.tabsList).toHaveBeenCalledWith({ variant: 'line', size: 'lg' })
    expect(mockClassMap.tabsTrigger).toHaveBeenCalledWith({ variant: 'line', size: 'lg' })
    expect(mockClassMap.tabsContent).toHaveBeenCalledWith({ variant: 'line', size: 'lg' })
  })

  it('should emit change with the value when a tab is clicked', async () => {
    const { emit, renderFn } = await renderTabs({ items: ITEMS })

    const buttons = mockH.mock.calls.filter((call) => call[0] === 'button')
    const onClick = (buttons[2][1] as Record<string, unknown>).onClick as () => void
    onClick()

    expect(emit).toHaveBeenCalledWith('change', 'billing')
    renderFn()
    expect(lastTabButtons()[2]['aria-selected']).toBe(true)
  })

  it('should keep the controlled value on click while still emitting change', async () => {
    const { emit, renderFn } = await renderTabs({ items: ITEMS, value: 'account' })

    const buttons = mockH.mock.calls.filter((call) => call[0] === 'button')
    const onClick = (buttons[1][1] as Record<string, unknown>).onClick as () => void
    onClick()

    expect(emit).toHaveBeenCalledWith('change', 'profile')
    renderFn()
    expect(lastTabButtons()[0]['aria-selected']).toBe(true)
    expect(lastTabButtons()[1]['aria-selected']).toBe(false)
  })

  it('should move the selection to the next enabled tab on ArrowRight', async () => {
    const { emit, renderFn } = await renderTabs({ items: ITEMS })

    const preventDefault = vi.fn()
    const keydown = lastTabList().onKeydown as (event: {
      key: string
      preventDefault: () => void
    }) => void
    keydown({ key: 'ArrowRight', preventDefault })

    expect(preventDefault).toHaveBeenCalled()
    expect(emit).toHaveBeenCalledWith('change', 'profile')
    renderFn()
    expect(lastTabButtons()[1]['aria-selected']).toBe(true)
  })

  it('should wrap from the first to the last tab on ArrowLeft', async () => {
    const { emit, renderFn } = await renderTabs({ items: ITEMS })

    ;(lastTabList().onKeydown as (event: { key: string; preventDefault: () => void }) => void)({
      key: 'ArrowLeft',
      preventDefault: vi.fn(),
    })

    expect(emit).toHaveBeenCalledWith('change', 'billing')
    renderFn()
    expect(lastTabButtons()[2]['aria-selected']).toBe(true)
  })

  it('should jump to the ends on Home and End', async () => {
    const { emit, renderFn } = await renderTabs({ items: ITEMS, defaultValue: 'profile' })
    const keydown = lastTabList().onKeydown as (event: {
      key: string
      preventDefault: () => void
    }) => void

    keydown({ key: 'End', preventDefault: vi.fn() })
    expect(emit).toHaveBeenLastCalledWith('change', 'billing')
    renderFn()
    expect(lastTabButtons()[2]['aria-selected']).toBe(true)

    keydown({ key: 'Home', preventDefault: vi.fn() })
    expect(emit).toHaveBeenLastCalledWith('change', 'account')
    renderFn()
    expect(lastTabButtons()[0]['aria-selected']).toBe(true)
  })

  it('should skip disabled tabs on ArrowRight', async () => {
    const { emit, renderFn } = await renderTabs({
      items: [
        { value: 'a', label: 'A', content: 'A body' },
        { value: 'b', label: 'B', content: 'B body', disabled: true },
        { value: 'c', label: 'C', content: 'C body' },
      ],
    })

    ;(lastTabList().onKeydown as (event: { key: string; preventDefault: () => void }) => void)({
      key: 'ArrowRight',
      preventDefault: vi.fn(),
    })

    expect(emit).toHaveBeenCalledWith('change', 'c')
    renderFn()
    expect(lastTabButtons()[2]['aria-selected']).toBe(true)
  })

  it('should ignore keys other than the navigation keys', async () => {
    const { emit } = await renderTabs({ items: ITEMS })

    ;(lastTabList().onKeydown as (event: { key: string; preventDefault: () => void }) => void)({
      key: 'a',
      preventDefault: vi.fn(),
    })

    expect(emit).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Table Component Tests
// ============================================================================

describe('Table component', () => {
  const DATA = [
    { id: 'r1', name: 'Ada Lovelace', role: 'admin' },
    { id: 'r2', name: 'Grace Hopper', role: 'editor' },
  ]
  const COLUMNS = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'role', header: 'Role' },
  ]

  /** Renders Table once through its setup with the given attrs and returns the render function. */
  const renderTable = async (
    props: Record<string, unknown>,
    attrs: Record<string, unknown> = {},
  ) => {
    const { Table } = await import('../components/Table.js')
    const renderFn = (Table.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      props,
      { attrs, slots: {} },
    )
    renderFn()
    return { renderFn }
  }

  /** The first `h()` call matching a predicate. */
  const callOf = (tag: string, match: (props: Record<string, unknown>) => boolean) => {
    const call = mockH.mock.calls.find(
      (c) => c[0] === tag && match((c[1] ?? {}) as Record<string, unknown>),
    )
    return call ? (call[1] as Record<string, unknown>) : undefined
  }

  /** The body-row `h()` calls of the most recent render (they carry a row key; the header row does not). */
  const lastBodyRows = (): Record<string, unknown>[] => {
    const calls = mockH.mock.calls.filter(
      (c) => c[0] === 'tr' && (c[1] as Record<string, unknown>).key !== undefined,
    )
    return calls.slice(-2).map((c) => c[1] as Record<string, unknown>)
  }

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
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('emptyContent')
    expect(props).toHaveProperty('loading')
    expect(props).toHaveProperty('sort')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('style')
    expect(props).toHaveProperty('testId')
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

  it('should declare no emits: onSort and onRowClick are attrs (React props)', async () => {
    const { Table } = await import('../components/Table.js')
    expect(Table.emits).toBeUndefined()
  })

  it('should render the wrapper, table, header and body', async () => {
    await renderTable({ data: DATA, columns: COLUMNS })

    const wrapper = mockH.mock.calls.find((c) => c[0] === 'div' && c[1]?.class === 'table-wrapper')
    expect(wrapper).toBeDefined()
    const table = callOf('table', () => true)
    expect(table!.class).toContain('table-classes')
    expect(callOf('thead', () => true)).toBeDefined()
    expect(callOf('tbody', () => true)).toBeDefined()
    expect(mockH.mock.calls.filter((c) => c[0] === 'th')).toHaveLength(2)
    expect(mockH.mock.calls.filter((c) => c[0] === 'td')).toHaveLength(4)
  })

  it('should add the bordered class only when bordered', async () => {
    await renderTable({ data: DATA, columns: COLUMNS, bordered: true })

    const table = callOf('table', () => true)!
    expect(table.class).toContain('table-classes')
    expect(table.class).toContain('table-bordered')
  })

  it('should put className, style and testId on the table element', async () => {
    await renderTable({
      data: DATA,
      columns: COLUMNS,
      className: 'parity-token',
      style: { marginTop: '4px' },
      testId: 'users',
    })

    const table = callOf('table', () => true)!
    expect(table.class).toContain('parity-token')
    expect(table.style).toEqual({ marginTop: '4px' })
    expect(table['data-testid']).toBe('users')
  })

  it('should announce the sort state through aria-sort', async () => {
    await renderTable({ data: DATA, columns: COLUMNS, sort: { key: 'name', direction: 'asc' } })
    const ths = mockH.mock.calls
      .filter((c) => c[0] === 'th')
      .map((c) => c[1] as Record<string, unknown>)

    expect(ths).toHaveLength(2)
    expect(ths[0]['aria-sort']).toBe('ascending')
    expect(ths[0].class).toContain('table-head-sortable')
    expect(ths[1]['aria-sort']).toBeUndefined()
    expect(ths[1].class).not.toContain('table-head-sortable')

    await renderTable({ data: DATA, columns: COLUMNS, sort: { key: 'name', direction: 'desc' } })
    const descThs = mockH.mock.calls
      .filter((c) => c[0] === 'th')
      .map((c) => c[1] as Record<string, unknown>)
      .slice(-2)
    expect(descThs[0]['aria-sort']).toBe('descending')

    await renderTable({ data: DATA, columns: COLUMNS, sort: { key: 'role', direction: 'asc' } })
    const idleThs = mockH.mock.calls
      .filter((c) => c[0] === 'th')
      .map((c) => c[1] as Record<string, unknown>)
      .slice(-2)
    expect(idleThs[0]['aria-sort']).toBe('none')
  })

  it('should call the onSort attr with the key and next direction on a sortable header click', async () => {
    const onSort = vi.fn()
    await renderTable({ data: DATA, columns: COLUMNS }, { onSort })

    const ths = mockH.mock.calls.filter((c) => c[0] === 'th')
    const sortableProps = ths[0][1] as Record<string, unknown>
    const plainProps = ths[1][1] as Record<string, unknown>
    ;(sortableProps.onClick as () => void)()
    expect(onSort).toHaveBeenCalledWith('name', 'asc')

    ;(plainProps.onClick as () => void)()
    expect(onSort).toHaveBeenCalledTimes(1)
  })

  it('should flip the direction when the column is already sorted', async () => {
    const onSort = vi.fn()
    await renderTable(
      { data: DATA, columns: COLUMNS, sort: { key: 'name', direction: 'asc' } },
      { onSort },
    )

    const th = mockH.mock.calls.filter((c) => c[0] === 'th').slice(-2)[0][1] as Record<
      string,
      unknown
    >
    ;(th.onClick as () => void)()
    expect(onSort).toHaveBeenCalledWith('name', 'desc')
  })

  it('should render the sort icon only for the sorted column', async () => {
    await renderTable({ data: DATA, columns: COLUMNS, sort: { key: 'name', direction: 'asc' } })

    const iconSpans = mockH.mock.calls.filter(
      (c) => c[0] === 'span' && c[1]?.class === 'table-sort-icon',
    )
    expect(iconSpans).toHaveLength(1)
    // renderIcon builds an aria-hidden svg (the chevron pointing up)
    const svgCall = mockH.mock.calls.find((c) => c[0] === 'svg')
    expect(svgCall).toBeDefined()
    expect(svgCall![1]['aria-hidden']).toBe(true)
    const paths = svgCall![2] as { props: { d: string } }[]
    expect(paths[0].props.d).toBe('mock-path-chevron-up')
  })

  it('should set the column width inline on the th', async () => {
    await renderTable({
      data: DATA,
      columns: [
        { key: 'name', header: 'Name', width: '30%' },
        { key: 'role', header: 'Role' },
      ],
    })

    const ths = mockH.mock.calls
      .filter((c) => c[0] === 'th')
      .map((c) => c[1] as Record<string, unknown>)
    expect(ths[0].style).toEqual({ width: '30%' })
    expect(ths[1].style).toEqual({ width: undefined })
  })

  it('should align cells with the column align prop', async () => {
    await renderTable({
      data: DATA,
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'role', header: 'Role', align: 'right' },
      ],
    })

    const tds = mockH.mock.calls
      .filter((c) => c[0] === 'td')
      .map((c) => c[1] as Record<string, unknown>)
    expect(tds[1].class).toContain('mock-text-right')
    expect(tds[0].class).not.toContain('mock-text-right')
  })

  it('should fill cells from the row field or the render function', async () => {
    const render = vi.fn((value: unknown, row: Record<string, unknown>, index: number) =>
      value ? `${row['name']}#${index}` : '',
    )
    await renderTable({
      data: DATA,
      columns: [
        { key: 'name', header: 'Name', render },
        { key: 'role', header: 'Role' },
      ],
    })

    const tds = mockH.mock.calls.filter((c) => c[0] === 'td').map((c) => c[2] as unknown)
    expect(tds[0]).toBe('Ada Lovelace#0')
    expect(tds[1]).toBe('admin')
    expect(render).toHaveBeenCalledWith('Ada Lovelace', DATA[0], 0)
  })

  it('should style rows as striped, hoverable and clickable per props', async () => {
    const onRowClick = vi.fn()
    await renderTable(
      { data: DATA, columns: COLUMNS, striped: true, hoverable: true },
      { onRowClick },
    )

    const trs = lastBodyRows()
    expect(trs).toHaveLength(2)
    expect(trs[0].class).toContain('table-row-classes')
    expect(trs[0].class).not.toContain('table-row-striped')
    expect(trs[1].class).toContain('table-row-striped')
    expect(trs[0].class).toContain('table-row-hoverable')
    expect(trs[0].class).toContain('table-row-clickable')
  })

  it('should call the onRowClick attr with the row and index on a row click', async () => {
    const onRowClick = vi.fn()
    await renderTable({ data: DATA, columns: COLUMNS }, { onRowClick })

    const tr = lastBodyRows()[1]
    ;(tr.onClick as () => void)()
    expect(onRowClick).toHaveBeenCalledWith(DATA[1], 1)
  })

  it('should not style rows as clickable without an onRowClick attr', async () => {
    await renderTable({ data: DATA, columns: COLUMNS })

    const tr = lastBodyRows()[0]
    expect(tr.class).not.toContain('table-row-clickable')
  })

  it('should not be hoverable when hoverable is false', async () => {
    await renderTable({ data: DATA, columns: COLUMNS, hoverable: false })

    const tr = lastBodyRows()[0]
    expect(tr.class).not.toContain('table-row-hoverable')
  })

  it('should key rows by the rowKey function', async () => {
    await renderTable({
      data: DATA,
      columns: COLUMNS,
      rowKey: (row: Record<string, unknown>) => `key-${row['id']}`,
    })

    expect(lastBodyRows().map((tr) => tr.key)).toEqual(['key-r1', 'key-r2'])
  })

  it('should key rows by a data field when rowKey names one', async () => {
    await renderTable({ data: DATA, columns: COLUMNS, rowKey: 'id' })

    expect(lastBodyRows().map((tr) => tr.key)).toEqual(['r1', 'r2'])
  })

  it('should key rows by index without rowKey', async () => {
    await renderTable({ data: DATA, columns: COLUMNS })

    expect(lastBodyRows().map((tr) => tr.key)).toEqual([0, 1])
  })

  it('should show the localized empty message in a full-width cell', async () => {
    await renderTable({ data: [], columns: COLUMNS })

    const td = callOf('td', () => true)!
    expect(td.colspan).toBe(2)
    expect(td.class).toBe('table-empty-cell')
    expect(mockH.mock.calls.filter((c) => c[0] === 'td')).toHaveLength(1)
  })

  it('should render the emptyContent prop node instead of the message', async () => {
    const emptyContent = { __vnode: true, type: 'strong' }
    await renderTable({ data: [], columns: COLUMNS, emptyContent })

    const tdCall = mockH.mock.calls.find((c) => c[0] === 'td')
    expect(tdCall![2]).toBe(emptyContent)
  })

  it('should render the emptyContent slot instead of the message', async () => {
    const { Table } = await import('../components/Table.js')
    const emptyContent = { __vnode: true, type: 'strong' }
    const renderFn = (Table.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { data: [], columns: COLUMNS },
      { attrs: {}, slots: { emptyContent: () => [emptyContent] } },
    )
    renderFn()

    const tdCall = mockH.mock.calls.find((c) => c[0] === 'td')
    expect(tdCall![2]).toEqual([emptyContent])
  })

  it('should render a loading overlay with a large Spinner', async () => {
    await renderTable({ data: DATA, columns: COLUMNS, loading: true })

    const overlay = callOf('div', (p) => p.class === 'table-loading-overlay')
    expect(overlay).toBeDefined()
    const spinnerCall = mockH.mock.calls.find((c) => c[0]?.name === 'MSpinner')
    expect(spinnerCall).toBeDefined()
    expect(spinnerCall![1]).toEqual({ size: 'lg' })
  })

  it('should render no overlay when not loading', async () => {
    await renderTable({ data: DATA, columns: COLUMNS })

    expect(callOf('div', (p) => p.class === 'table-loading-overlay')).toBeUndefined()
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

  // The Tooltip render function captured from setup, plus helpers that drive
  // the trigger's own handlers the way the conformance kit's DOM steps do.
  let currentRender: (() => unknown) | null = null

  const renderTooltip = async (
    extraProps: Record<string, unknown>,
    triggerChildren?: unknown[],
  ): Promise<void> => {
    const { Tooltip } = await import('../components/Tooltip.js')
    const mockSlots: Record<string, () => unknown> = {
      default: () =>
        triggerChildren
          ? triggerChildren.length === 1
            ? triggerChildren[0]
            : triggerChildren
          : 'trigger',
    }
    const renderFn = (Tooltip.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        placement: 'top',
        delay: 0,
        hasArrow: false,
        className: undefined,
        style: undefined,
        testId: undefined,
        ...extraProps,
      },
      { attrs: {}, slots: mockSlots },
    )
    currentRender = renderFn as () => unknown
    mockH.mockClear()
    renderFn()
  }

  const currentTrigger = (): { [key: string]: unknown } => {
    const triggerCall = mockH.mock.calls.find((call) => call[1]?.class === 'tooltip-trigger')
    expect(triggerCall).toBeDefined()
    return triggerCall![1] as { [key: string]: unknown }
  }

  const showTooltip = (): void => {
    ;(currentTrigger().onMouseover as (e: unknown) => void)({ relatedTarget: null })
  }

  const hideTooltip = (): void => {
    ;(currentTrigger().onFocusout as (e: unknown) => void)({})
  }

  const renderCurrent = (): void => {
    currentRender?.()
  }

  it('does not render an arrow element when hasArrow is false, even while visible', async () => {
    await renderTooltip({ content: 'Hi', placement: 'top', delay: 0, hasArrow: false })
    showTooltip()
    renderCurrent()

    const spanCall = mockH.mock.calls.find((call) => call[0] === 'span')
    expect(spanCall).toBeUndefined()
  })

  it('renders a themed arrow element at the resolved placement when hasArrow is true and visible', async () => {
    await renderTooltip({ content: 'Hi', placement: 'bottom', delay: 0, hasArrow: true })
    showTooltip()
    renderCurrent()

    const spanCall = mockH.mock.calls.find((call) => call[0] === 'span')
    expect(spanCall).toBeDefined()
    const arrowProps = spanCall![1] as { 'aria-hidden': string; style: Record<string, string> }
    expect(arrowProps['aria-hidden']).toBe('true')
    expect(arrowProps.style.background).toBe('var(--color-surface)')
    expect(arrowProps.style.border).toBe('1px solid var(--color-border)')
    // 'bottom' placement: the arrow sits at the TOP edge of the tooltip box.
    expect(arrowProps.style.top).toBe('-4px')
  })

  it('does not render an arrow element while the tooltip is hidden', async () => {
    await renderTooltip({ content: 'Hi', placement: 'top', delay: 0, hasArrow: true })
    renderCurrent()

    const spanCall = mockH.mock.calls.find((call) => call[0] === 'span')
    expect(spanCall).toBeUndefined()
  })

  it('renders the visible tooltip into a body Teleport with role and placement style', async () => {
    await renderTooltip({ content: 'Hi', placement: 'top', delay: 0 })
    showTooltip()
    renderCurrent()

    const teleportCall = mockH.mock.calls.find((call) => call[0] === 'Teleport')
    expect(teleportCall).toBeDefined()
    expect(teleportCall![1]).toEqual({ to: 'body' })
    const tooltipCall = mockH.mock.calls.find((call) => call[1]?.role === 'tooltip')
    expect(tooltipCall).toBeDefined()
    expect(tooltipCall![1].id).toMatch(/^mol-tooltip-/)
    const wrapperCall = mockH.mock.calls.find(
      (call) => call[0] === 'div' && call[1]?.style?.position === 'absolute',
    )
    expect(wrapperCall).toBeDefined()
    expect(wrapperCall![1].style.zIndex).toBe(9999)
  })

  it('hides the tooltip and drops the Teleport when the trigger blurs', async () => {
    await renderTooltip({ content: 'Hi', placement: 'top', delay: 0 })
    showTooltip()
    renderCurrent()
    hideTooltip()
    mockH.mockClear()
    renderCurrent()

    expect(mockH.mock.calls.find((call) => call[0] === 'Teleport')).toBeUndefined()
    expect(mockH.mock.calls.find((call) => call[1]?.class === 'tooltip-trigger')).toBeDefined()
  })

  it('injects aria-describedby on a single-element trigger while visible', async () => {
    await renderTooltip({ content: 'Hi', placement: 'top', delay: 0 }, [
      mockH('button', { type: 'button' }, 'Hover me'),
    ])
    renderCurrent()
    const buttonBefore = mockH.mock.calls.filter((call) => call[0] === 'button')
    expect(buttonBefore).toHaveLength(0) // hidden: the trigger child passes through uncloned

    showTooltip()
    renderCurrent()
    const cloned = mockH.mock.calls.find(
      (call) => call[0] === 'button' && call[1]?.['aria-describedby'],
    )
    expect(cloned).toBeDefined()
    expect(cloned![1].type).toBe('button')
    const tooltipCall = mockH.mock.calls.find((call) => call[1]?.role === 'tooltip')
    expect(cloned![1]['aria-describedby']).toBe(tooltipCall![1].id)
  })

  it('does not inject aria-describedby for a text trigger', async () => {
    await renderTooltip({ content: 'Hi', placement: 'top', delay: 0 })
    showTooltip()
    renderCurrent()

    const triggerCall = mockH.mock.calls.find((call) => call[1]?.class === 'tooltip-trigger')
    expect(triggerCall![2]).toBe('trigger')
  })

  it('does not inject aria-describedby with multiple trigger children', async () => {
    await renderTooltip({ content: 'Hi', placement: 'top', delay: 0 }, [
      mockH('span', null, 'One'),
      mockH('span', null, 'Two'),
    ])
    showTooltip()
    renderCurrent()

    const clones = mockH.mock.calls.filter((call) => call[1]?.['aria-describedby'])
    expect(clones).toHaveLength(0)
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
    expect(props).toHaveProperty('value')
    expect(props).toHaveProperty('defaultValue')
    expect(props).toHaveProperty('multiple')
    expect(props).toHaveProperty('collapsible')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('testId')
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

  it('should emit change (React onChange)', async () => {
    const { Accordion } = await import('../components/Accordion.js')
    expect(Accordion.emits).toContain('change')
  })
})

// ============================================================================
// LoadErrorBanner Component Tests
// ============================================================================

describe('LoadErrorBanner component', () => {
  it('should be defined with correct name', async () => {
    const { LoadErrorBanner } = await import('../components/LoadErrorBanner.js')
    expect(LoadErrorBanner).toBeDefined()
    expect(LoadErrorBanner.name).toBe('MLoadErrorBanner')
  })

  it('should have correct props', async () => {
    const { LoadErrorBanner } = await import('../components/LoadErrorBanner.js')
    const props = LoadErrorBanner.props as Record<string, unknown>
    expect(props).toHaveProperty('message')
    expect(props).toHaveProperty('detail')
    expect(props).toHaveProperty('onRetry')
    expect(props).toHaveProperty('retryLabel')
    expect(props).toHaveProperty('retryMolId')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('style')
  })

  it('should default retryMolId to load-error-retry', async () => {
    const { LoadErrorBanner } = await import('../components/LoadErrorBanner.js')
    const props = LoadErrorBanner.props as Record<string, { default?: unknown }>
    expect(props.retryMolId.default).toBe('load-error-retry')
  })

  it('should declare no emits (onRetry is a prop, not an emit)', async () => {
    const { LoadErrorBanner } = await import('../components/LoadErrorBanner.js')
    // The pending state is driven by the promise the listener RETURNS, so
    // onRetry must arrive as a callable prop, not pass through `emit`.
    expect(LoadErrorBanner.emits).toBeUndefined()
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

  it('should emit change', async () => {
    const { Pagination } = await import('../components/Pagination.js')
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
    // React's Dropdown has no width default (undefined); the menu sizes itself.
    expect(props.width.default).toBeUndefined()
  })

  it('should emit select and openChange', async () => {
    const { Dropdown } = await import('../components/Dropdown.js')
    expect(Dropdown.emits).toContain('select')
    expect(Dropdown.emits).toContain('openChange')
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

    it('should declare the React-named passthrough props', async () => {
      const { Container } = await import('../components/Layout.js')
      const props = Container.props as Record<string, unknown>
      expect(props).toHaveProperty('paddingX')
      expect(props).toHaveProperty('className')
      expect(props).toHaveProperty('style')
      expect(props).toHaveProperty('testId')
      expect(Container.emits).toContain('click')
    })

    it('should render container classes for standard sizes', async () => {
      const { Container } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }

      const renderFn = (Container.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        {
          maxWidth: 'lg',
          centered: true,
          paddingX: undefined,
          className: undefined,
          style: undefined,
          testId: undefined,
        },
        { attrs: {}, slots: mockSlots, emit: vi.fn() },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('container-centered')
      expect(divCall[1].class).toContain('size-lg')
      expect(divCall[1].class).toContain('center-horizontal')
    })

    it('should resolve an arbitrary maxWidth through the ClassMap, not an inline style', async () => {
      const { Container } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }

      const renderFn = (Container.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        {
          maxWidth: '800px',
          centered: true,
          paddingX: 'lg',
          className: undefined,
          style: undefined,
          testId: undefined,
        },
        { attrs: {}, slots: mockSlots, emit: vi.fn() },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('size-800px')
      expect(divCall[1].style).toBeUndefined()
    })

    it('should apply className, testId and rest attrs', async () => {
      const { Container } = await import('../components/Layout.js')
      const mockSlots = { default: () => 'content' }

      const renderFn = (Container.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        {
          maxWidth: 'lg',
          centered: false,
          paddingX: undefined,
          className: 'page',
          style: undefined,
          testId: 'page-container',
        },
        { attrs: { id: 'container', role: 'region' }, slots: mockSlots, emit: vi.fn() },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('page')
      expect(divCall[1].class).not.toContain('center-horizontal')
      expect(divCall[1]['data-testid']).toBe('page-container')
      expect(divCall[1].id).toBe('container')
      expect(divCall[1].role).toBe('region')
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
        { attrs: {}, slots: mockSlots, emit: mockEmit },
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
        { attrs: {}, slots: mockSlots, emit: mockEmit },
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
        { attrs: {}, slots: mockSlots, emit: mockEmit },
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
        { attrs: {}, slots: mockSlots, emit: mockEmit },
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
          className: undefined,
        },
        { attrs: {}, slots: mockSlots },
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
          className: undefined,
        },
        { attrs: {}, slots: mockSlots },
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
        { size: 'md', horizontal: false },
        { attrs: {} },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('spacer-vertical')
    })

    it('should render horizontal spacer when horizontal is true', async () => {
      const { Spacer } = await import('../components/Layout.js')

      const renderFn = (Spacer.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { size: 'md', horizontal: true },
        { attrs: {} },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].class).toContain('spacer-horizontal')
    })

    it('should handle numeric size', async () => {
      const { Spacer } = await import('../components/Layout.js')

      const renderFn = (Spacer.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { size: 24, horizontal: false },
        { attrs: {} },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].style).toEqual({ height: '24px', width: '1px' })
    })

    it('should handle numeric size for horizontal spacer', async () => {
      const { Spacer } = await import('../components/Layout.js')

      const renderFn = (Spacer.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { size: 24, horizontal: true },
        { attrs: {} },
      )

      renderFn()
      const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
      expect(divCall[1].style).toEqual({ width: '24px', height: '1px' })
    })
  })
})

// ============================================================================
// PageHeader Component Tests
// ============================================================================

describe('PageHeader component', () => {
  it('should be defined with correct name', async () => {
    const { PageHeader } = await import('../components/PageHeader.js')
    expect(PageHeader).toBeDefined()
    expect(PageHeader.name).toBe('MPageHeader')
  })

  it('should have correct props', async () => {
    const { PageHeader } = await import('../components/PageHeader.js')
    const props = PageHeader.props as Record<string, unknown>
    expect(props).toHaveProperty('title')
    expect(props).toHaveProperty('description')
    expect(props).toHaveProperty('actions')
    expect(props).toHaveProperty('breadcrumbs')
    expect(props).toHaveProperty('automationId')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('style')
    expect(props).toHaveProperty('testId')
  })

  it('should require the title', async () => {
    const { PageHeader } = await import('../components/PageHeader.js')
    const props = PageHeader.props as Record<string, { required?: boolean }>
    expect(props.title.required).toBe(true)
  })

  it('should render the title in an h1 inside the between/center row', async () => {
    const { PageHeader } = await import('../components/PageHeader.js')

    const renderFn = (PageHeader.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: 'Dashboard',
        description: undefined,
        actions: undefined,
        breadcrumbs: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    const h1Call = mockH.mock.calls.find((call) => call[0] === 'h1')
    expect(h1Call).toBeDefined()
    expect(h1Call![2]).toBe('Dashboard')
    const rowCall = mockH.mock.calls.find(
      (call) =>
        call[0] === 'div' &&
        call[1]?.class !== undefined &&
        String(call[1].class).includes('justify-between'),
    )
    expect(rowCall).toBeDefined()
    expect(String(rowCall![1].class)).toContain('align-center')
  })

  it('should render the description under the title', async () => {
    const { PageHeader } = await import('../components/PageHeader.js')

    const renderFn = (PageHeader.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: 'Dashboard',
        description: 'Traffic over the last 30 days.',
        actions: undefined,
        breadcrumbs: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    const pCall = mockH.mock.calls.find((call) => call[0] === 'p')
    expect(pCall).toBeDefined()
    expect(pCall![2]).toBe('Traffic over the last 30 days.')
  })

  it('should render actions from the prop or the slot', async () => {
    const { PageHeader } = await import('../components/PageHeader.js')
    const action = { __vnode: true, type: 'span', props: null, children: 'Save' }

    const renderFn = (PageHeader.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: 'Projects',
        description: undefined,
        actions: action,
        breadcrumbs: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    const actionsDivCall = mockH.mock.calls.find(
      (call) => call[0] === 'div' && Array.isArray(call[2]) && call[2][0] === action,
    )
    expect(actionsDivCall).toBeDefined()
  })

  it('should render breadcrumbs with separators, links and plain labels', async () => {
    const { PageHeader } = await import('../components/PageHeader.js')

    const renderFn = (PageHeader.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: 'Q3 revenue',
        description: undefined,
        actions: undefined,
        breadcrumbs: [
          { label: 'Home', href: '/' },
          { label: 'Reports', href: '/reports' },
          { label: 'Q3 revenue' },
        ],
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    const navCall = mockH.mock.calls.find((call) => call[0] === 'nav')
    expect(navCall).toBeDefined()
    expect(navCall![1]['aria-label']).toBe('Breadcrumb')
    const separators = mockH.mock.calls.filter(
      (call) => call[0] === 'span' && call[1]?.['aria-hidden'] === 'true' && call[2] === '/',
    )
    expect(separators).toHaveLength(2)
    const links = mockH.mock.calls.filter((call) => call[0] === 'a')
    expect(links).toHaveLength(2)
    expect(links[0]![1].href).toBe('/')
    expect(links[1]![1].href).toBe('/reports')
    const plain = mockH.mock.calls.filter((call) => call[0] === 'span' && call[2] === 'Q3 revenue')
    expect(plain).toHaveLength(1)
  })

  it('should render no nav for empty breadcrumbs', async () => {
    const { PageHeader } = await import('../components/PageHeader.js')

    const renderFn = (PageHeader.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: 'Settings',
        description: undefined,
        actions: undefined,
        breadcrumbs: [],
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    expect(mockH.mock.calls.find((call) => call[0] === 'nav')).toBeUndefined()
  })

  it('should apply automationId, className, style and testId', async () => {
    const { PageHeader } = await import('../components/PageHeader.js')

    const renderFn = (PageHeader.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        title: 'Billing',
        description: undefined,
        actions: undefined,
        breadcrumbs: undefined,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'billing-header',
        automationId: 'billing-header',
      },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(String(divCall[1].class)).toContain('parity-token')
    expect(divCall[1]['data-mol-id']).toBe('billing-header')
    expect(divCall[1]['data-testid']).toBe('billing-header')
    expect(divCall[1].style).toEqual({ marginTop: '4px' })
  })
})

// ============================================================================
// PageShell Component Tests
// ============================================================================

describe('PageShell component', () => {
  it('should be defined with correct name', async () => {
    const { PageShell } = await import('../components/PageShell.js')
    expect(PageShell).toBeDefined()
    expect(PageShell.name).toBe('MPageShell')
  })

  it('should have correct props', async () => {
    const { PageShell } = await import('../components/PageShell.js')
    const props = PageShell.props as Record<string, unknown>
    expect(props).toHaveProperty('sidebar')
    expect(props).toHaveProperty('topbar')
    expect(props).toHaveProperty('sidebarCollapsed')
    expect(props).toHaveProperty('onSidebarToggle')
    expect(props).toHaveProperty('automationId')
    expect(props).toHaveProperty('className')
    expect(props).toHaveProperty('style')
    expect(props).toHaveProperty('testId')
  })

  it('should render the default slot as the main content', async () => {
    const { PageShell } = await import('../components/PageShell.js')

    const renderFn = (PageShell.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        sidebar: undefined,
        topbar: undefined,
        sidebarCollapsed: false,
        onSidebarToggle: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: { default: () => ['Main content'] }, emit: vi.fn() },
    )

    renderFn()
    const mainCall = mockH.mock.calls.find((call) => call[0] === 'main')
    expect(mainCall).toBeDefined()
    expect(mainCall![2]).toEqual(['Main content'])
    expect(mockH.mock.calls.find((call) => call[0] === 'aside')).toBeUndefined()
    expect(mockH.mock.calls.find((call) => call[0] === 'header')).toBeUndefined()
  })

  it('should render the sidebar with a toggle button when onSidebarToggle is provided', async () => {
    const { PageShell } = await import('../components/PageShell.js')
    const onToggle = vi.fn()

    const renderFn = (PageShell.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        sidebar: ['nav'],
        topbar: undefined,
        sidebarCollapsed: false,
        onSidebarToggle: onToggle,
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: { default: () => ['Main content'] }, emit: vi.fn() },
    )

    renderFn()
    expect(mockH.mock.calls.find((call) => call[0] === 'aside')).toBeDefined()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === 'button')
    expect(buttonCall).toBeDefined()
    expect(buttonCall![1].type).toBe('button')
    expect(buttonCall![1]['aria-label']).toBe('Collapse sidebar')
    expect(buttonCall![2]).toBe('◀')

    buttonCall![1].onClick({ type: 'click' })
    expect(onToggle).toHaveBeenCalledWith({ type: 'click' })
  })

  it('should label the toggle Expand and render the right glyph when collapsed', async () => {
    const { PageShell } = await import('../components/PageShell.js')
    const onToggle = vi.fn()

    const renderFn = (PageShell.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        sidebar: ['nav'],
        topbar: undefined,
        sidebarCollapsed: true,
        onSidebarToggle: onToggle,
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: { default: () => ['Main content'] }, emit: vi.fn() },
    )

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === 'button')
    expect(buttonCall).toBeDefined()
    expect(buttonCall![1]['aria-label']).toBe('Expand sidebar')
    expect(buttonCall![2]).toBe('▶')
  })

  it('should render no toggle button without onSidebarToggle', async () => {
    const { PageShell } = await import('../components/PageShell.js')

    const renderFn = (PageShell.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        sidebar: ['nav'],
        topbar: undefined,
        sidebarCollapsed: true,
        onSidebarToggle: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: { default: () => ['Main content'] }, emit: vi.fn() },
    )

    renderFn()
    expect(mockH.mock.calls.find((call) => call[0] === 'aside')).toBeDefined()
    expect(mockH.mock.calls.find((call) => call[0] === 'button')).toBeUndefined()
  })

  it('should render the topbar as a header', async () => {
    const { PageShell } = await import('../components/PageShell.js')

    const renderFn = (PageShell.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        sidebar: undefined,
        topbar: ['Timetrack'],
        sidebarCollapsed: false,
        onSidebarToggle: undefined,
        className: undefined,
        style: undefined,
        testId: undefined,
        automationId: undefined,
      },
      { attrs: {}, slots: { default: () => ['Main content'] }, emit: vi.fn() },
    )

    renderFn()
    const headerCall = mockH.mock.calls.find((call) => call[0] === 'header')
    expect(headerCall).toBeDefined()
    expect(headerCall![2]).toEqual([['Timetrack']])
  })

  it('should apply automationId, className, style and testId', async () => {
    const { PageShell } = await import('../components/PageShell.js')

    const renderFn = (PageShell.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      {
        sidebar: undefined,
        topbar: undefined,
        sidebarCollapsed: false,
        onSidebarToggle: undefined,
        className: 'parity-token',
        style: { minHeight: '100vh' },
        testId: 'app-shell',
        automationId: 'app-shell',
      },
      { attrs: {}, slots: { default: () => ['Main content'] }, emit: vi.fn() },
    )

    renderFn()
    const divCall = mockH.mock.calls[mockH.mock.calls.length - 1]
    expect(String(divCall[1].class)).toContain('parity-token')
    expect(divCall[1]['data-mol-id']).toBe('app-shell')
    expect(divCall[1]['data-testid']).toBe('app-shell')
    expect(divCall[1].style).toEqual({ minHeight: '100vh' })
  })
})

// ============================================================================
// OptimisticToggleButton Component Tests
// ============================================================================

describe('OptimisticToggleButton component', () => {
  // Drains the save chain: all pending microtasks, then one macrotask turn.
  const drain = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  const baseProps = {
    value: false,
    commit: undefined,
    activeLabel: 'Unstar',
    inactiveLabel: 'Star',
    variant: 'solid',
    color: 'primary',
    size: 'md',
    fullWidth: false,
    disabled: false,
    leftIcon: undefined,
    rightIcon: undefined,
    className: undefined,
    style: undefined,
    testId: undefined,
  }

  it('should be defined with correct name', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    expect(OptimisticToggleButton).toBeDefined()
    expect(OptimisticToggleButton.name).toBe('MOptimisticToggleButton')
  })

  it('should have correct props and the error emit', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const props = OptimisticToggleButton.props as Record<string, unknown>
    expect(props).toHaveProperty('value')
    expect(props).toHaveProperty('commit')
    expect(props).toHaveProperty('activeLabel')
    expect(props).toHaveProperty('inactiveLabel')
    expect(props).toHaveProperty('variant')
    expect(props).toHaveProperty('color')
    expect(props).toHaveProperty('size')
    expect(props).toHaveProperty('fullWidth')
    expect(props).toHaveProperty('disabled')
    expect(OptimisticToggleButton.emits).toContain('error')
  })

  it('should require the server value', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const props = OptimisticToggleButton.props as Record<string, { required?: boolean }>
    expect(props.value.required).toBe(true)
  })

  it('should render a Button marked optimistic-toggle with the inactive label and idle state', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps }, { attrs: {}, slots: {}, emit: vi.fn() })

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    expect(buttonCall).toBeDefined()
    expect(buttonCall![1]['data-mol-id']).toBe('optimistic-toggle')
    expect(buttonCall![1].type).toBe('button')
    expect(buttonCall![1]['aria-pressed']).toBe(false)
    expect(buttonCall![1]['aria-busy']).toBe(false)
    expect(buttonCall![2].default()).toBe('Star')
  })

  it('should show the active label and pressed state when the value is true', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps, value: true }, { attrs: {}, slots: {}, emit: vi.fn() })

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    expect(buttonCall![1]['aria-pressed']).toBe(true)
    expect(buttonCall![2].default()).toBe('Unstar')
  })

  it('should fall back to the activeLabel/inactiveLabel slots', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')
    const strong = { __vnode: true, type: 'strong', props: null, children: ['Following'] }

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      { ...baseProps, activeLabel: undefined, inactiveLabel: undefined },
      {
        attrs: {},
        slots: { activeLabel: () => [strong], inactiveLabel: () => ['Follow me'] },
        emit: vi.fn(),
      },
    )

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    expect(buttonCall![2].default()).toEqual(['Follow me'])

    // The active-value render takes the activeLabel slot instead.
    const activeRenderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      { ...baseProps, value: true, activeLabel: undefined, inactiveLabel: undefined },
      {
        attrs: {},
        slots: { activeLabel: () => [strong], inactiveLabel: () => ['Follow me'] },
        emit: vi.fn(),
      },
    )
    activeRenderFn()
    const activeButtonCall = mockH.mock.calls.filter((call) => call[0] === Button).pop()
    expect(activeButtonCall![2].default()).toEqual([strong])
  })

  it('should pass the variant, size, disabled and passthrough props to the Button', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      {
        ...baseProps,
        variant: 'outline',
        color: 'secondary',
        size: 'sm',
        disabled: true,
        fullWidth: true,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'star-button',
      },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    expect(buttonCall![1].variant).toBe('outline')
    expect(buttonCall![1].color).toBe('secondary')
    expect(buttonCall![1].size).toBe('sm')
    expect(buttonCall![1].fullWidth).toBe(true)
    expect(buttonCall![1].disabled).toBe(true)
    expect(buttonCall![1].className).toBe('parity-token')
    expect(buttonCall![1].style).toEqual({ marginTop: '4px' })
    expect(buttonCall![1].testId).toBe('star-button')
  })

  it('should forward rest attrs to the Button', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps }, { attrs: { name: 'star', 'data-extra': '1' }, slots: {}, emit: vi.fn() })

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    expect(buttonCall![1].name).toBe('star')
    expect(buttonCall![1]['data-extra']).toBe('1')
  })

  it('should flip optimistically on click and commit the desired value', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')
    const commit = vi.fn(async () => true)
    const emit = vi.fn()

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps, commit }, { attrs: {}, slots: {}, emit })

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    buttonCall![1].onClick({ type: 'click' })

    expect(commit).toHaveBeenCalledWith(true)
    // The optimistic flip renders immediately.
    renderFn()
    const rendered = mockH.mock.calls.filter((call) => call[0] === Button).pop()
    expect(rendered![1]['aria-pressed']).toBe(true)
    expect(rendered![2].default()).toBe('Unstar')

    await drain()
    // The save settles; the confirmed value stays.
    renderFn()
    const settled = mockH.mock.calls.filter((call) => call[0] === Button).pop()
    expect(settled![1]['aria-pressed']).toBe(true)
    expect(settled![1]['aria-busy']).toBe(false)
    expect(emit).not.toHaveBeenCalled()
  })

  it('should commit both desired values in order across two clicks', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')
    const commit = vi.fn(async () => undefined)

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps, commit }, { attrs: {}, slots: {}, emit: vi.fn() })

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    buttonCall![1].onClick({ type: 'click' })
    buttonCall![1].onClick({ type: 'click' })

    await drain()
    expect(commit).toHaveBeenCalledTimes(2)
    expect(commit).toHaveBeenNthCalledWith(1, true)
    expect(commit).toHaveBeenNthCalledWith(2, false)
  })

  it('should pass the disabled state through to the Button', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')
    const commit = vi.fn(async () => true)

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps, commit, disabled: true }, { attrs: {}, slots: {}, emit: vi.fn() })

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    // A native disabled button never delivers the click, so like React's the
    // port prevents commits through the browser, not its own handler.
    expect(buttonCall![1].disabled).toBe(true)
  })

  it('should roll back and emit error when the commit rejects', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')
    const failure = new Error('save failed')
    const commit = vi.fn(async () => {
      throw failure
    })
    const emit = vi.fn()

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps, commit }, { attrs: {}, slots: {}, emit })

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    buttonCall![1].onClick({ type: 'click' })
    await drain()

    expect(emit).toHaveBeenCalledWith('error', failure)
    renderFn()
    const settled = mockH.mock.calls.filter((call) => call[0] === Button).pop()
    expect(settled![1]['aria-pressed']).toBe(false)
    expect(settled![2].default()).toBe('Star')
  })

  it('should show the busy state while the commit is in flight', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')
    let release: (value: boolean) => void = () => {}
    const commit = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve
        }),
    )

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps, commit }, { attrs: {}, slots: {}, emit: vi.fn() })

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    buttonCall![1].onClick({ type: 'click' })
    await Promise.resolve()

    renderFn()
    const pending = mockH.mock.calls.filter((call) => call[0] === Button).pop()
    expect(pending![1]['aria-busy']).toBe(true)
    expect(pending![1]['aria-pressed']).toBe(true)
    expect(pending![2].default()).toBe('Unstar')

    release(false)
    await drain()
    // The server confirmed false — a different value than the optimistic
    // true — so the shown label settles back to the server's value.
    renderFn()
    const settled = mockH.mock.calls.filter((call) => call[0] === Button).pop()
    expect(settled![1]['aria-busy']).toBe(false)
    expect(settled![1]['aria-pressed']).toBe(false)
    expect(settled![2].default()).toBe('Star')
  })

  it('should keep the optimistic value when the server confirms it', async () => {
    const { OptimisticToggleButton } = await import('../components/OptimisticToggleButton.js')
    const { Button } = await import('../components/Button.js')
    let release: (value: boolean) => void = () => {}
    const commit = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve
        }),
    )

    const renderFn = (
      OptimisticToggleButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps, commit }, { attrs: {}, slots: {}, emit: vi.fn() })

    renderFn()
    const buttonCall = mockH.mock.calls.find((call) => call[0] === Button)
    buttonCall![1].onClick({ type: 'click' })
    release(true)
    await drain()

    renderFn()
    const settled = mockH.mock.calls.filter((call) => call[0] === Button).pop()
    expect(settled![1]['aria-pressed']).toBe(true)
    expect(settled![2].default()).toBe('Unstar')
  })
})

// ============================================================================
// PanelClose Component Tests
// ============================================================================

describe('PanelCloseProvider component', () => {
  beforeEach(() => {
    // Mimic real `inject` semantics for these tests: a function default is
    // called as a factory, exactly what `usePanelClose` relies on.
    mockInject.mockImplementation((_key: unknown, defaultValue?: unknown) =>
      typeof defaultValue === 'function' ? (defaultValue as () => unknown)() : defaultValue,
    )
  })

  it('should be defined via defineComponent with correct name', async () => {
    const { PanelCloseProvider } = await import('../components/PanelClose.js')
    expect(PanelCloseProvider).toBeDefined()
    expect(PanelCloseProvider.name).toBe('MPanelCloseProvider')
  })

  it('should declare a function close prop', async () => {
    const { PanelCloseProvider } = await import('../components/PanelClose.js')
    const props = PanelCloseProvider.props as Record<string, { type?: unknown }>
    expect(props.close.type).toBe(Function)
  })

  it('should render its default slot with no wrapper element', async () => {
    const { PanelCloseProvider } = await import('../components/PanelClose.js')
    const slots = { default: () => ['Panel body'] }
    const renderFn = (
      PanelCloseProvider.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ close: vi.fn() }, { slots })
    expect(renderFn()).toEqual(['Panel body'])
  })

  it('should provide a close callback that calls through to the prop', async () => {
    const { PanelCloseProvider } = await import('../components/PanelClose.js')
    const close = vi.fn()
    ;(PanelCloseProvider.setup as (...args: unknown[]) => unknown)({ close }, { slots: {} })
    expect(mockProvide).toHaveBeenCalledTimes(1)
    const [key, provided] = mockProvide.mock.calls[0] as [unknown, () => void]
    expect(typeof key).toBe('symbol')
    expect(typeof provided).toBe('function')
    expect(close).not.toHaveBeenCalled()
    provided()
    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe('usePanelClose', () => {
  it('should return the injected close callback', async () => {
    const { usePanelClose } = await import('../components/PanelClose.js')
    const close = vi.fn()
    mockInject.mockImplementation(() => close)
    expect(usePanelClose()).toBe(close)
  })

  it('should return a safe no-op without a provider', async () => {
    const { usePanelClose } = await import('../components/PanelClose.js')
    mockInject.mockImplementation((_key: unknown, defaultValue?: unknown) =>
      typeof defaultValue === 'function' ? (defaultValue as () => unknown)() : defaultValue,
    )
    const close = usePanelClose()
    expect(typeof close).toBe('function')
    expect(() => close()).not.toThrow()
  })
})

// ============================================================================
// UserMenu Component Tests
// ============================================================================

describe('UserMenu component', () => {
  beforeEach(async () => {
    const { I18nKey, RouterKey } = await import('@molecule/app-vue')
    const cm = mockClassMap as unknown as Record<string, unknown>
    cm.minH = vi.fn((n: number) => `min-height-${n}`)
    cm.minW = vi.fn((n: number) => `min-width-${n}`)
    cm.drawer = 'drawer-classes'
    cm.drawerLeft = 'drawer-left-classes'
    const i18n = {
      getLocale: () => 'en',
      onLocaleChange: () => () => {},
      t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
      getLocales: () => [],
      getDirection: () => 'ltr',
      formatNumber: () => '',
      formatDate: () => '',
    }
    const router = {
      getLocation: () => ({ pathname: '/', search: '' }),
      getParams: () => ({}),
      getQuery: () => ({}),
      subscribe: () => () => {},
      navigate: () => {},
    }
    mockInject.mockImplementation((key: unknown) => {
      if (key === I18nKey) return i18n
      if (key === RouterKey) return router
      return undefined
    })
  })

  const baseProps = {
    ariaLabelKey: 'userMenu.open',
    ariaLabelDefault: 'Open user menu',
    triggerIcon: 'user',
    triggerIconSize: 20,
    dataMolId: 'user-menu',
    className: undefined,
    disabled: undefined,
    onClick: undefined,
    side: 'right',
  }

  it('should be defined via defineComponent with correct name', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    expect(UserMenu).toBeDefined()
    expect(UserMenu.name).toBe('MUserMenu')
  })

  it('should have correct default props', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const props = UserMenu.props as Record<string, { default?: unknown }>
    expect(props.ariaLabelKey.default).toBe('userMenu.open')
    expect(props.ariaLabelDefault.default).toBe('Open user menu')
    expect(props.triggerIcon.default).toBe('user')
    expect(props.triggerIconSize.default).toBe(20)
    expect(props.dataMolId.default).toBe('user-menu')
    expect(props.side.default).toBe('right')
  })

  it('should render a ghost small Button trigger with the translated aria-label', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const { Button } = await import('../components/Button.js')
    const renderFn = (UserMenu.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      baseProps,
      { attrs: {}, slots: {}, emit: vi.fn() },
    )
    const result = renderFn() as unknown[]
    expect(Array.isArray(result)).toBe(true)

    const trigger = mockH.mock.calls.find((call) => call[0] === Button) as unknown[]
    expect(trigger).toBeDefined()
    expect(trigger[1]).toEqual(
      expect.objectContaining({
        variant: 'ghost',
        size: 'sm',
        'aria-label': 'Open user menu',
        'data-mol-id': 'user-menu',
        className: 'min-height-10 min-width-10',
      }),
    )
  })

  it('should honor custom aria label key and default', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const { Button } = await import('../components/Button.js')
    const renderFn = (UserMenu.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, ariaLabelKey: 'nav.account', ariaLabelDefault: 'Open account' },
      {
        attrs: {},
        slots: {},
        emit: vi.fn(),
      },
    )
    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === Button) as unknown[]
    expect(trigger[1]['aria-label']).toBe('Open account')
  })

  it('should render the trigger icon with the given name and size', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const { Button } = await import('../components/Button.js')
    const { Icon } = await import('../components/Icon.js')
    const renderFn = (UserMenu.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, triggerIcon: 'gear', triggerIconSize: 24 },
      {
        attrs: {},
        slots: {},
        emit: vi.fn(),
      },
    )
    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === Button) as unknown[]
    const iconVNode = (
      trigger[2] as { default: () => { type: unknown; props: Record<string, unknown> }[] }
    ).default()[0]
    expect(iconVNode.type).toBe(Icon)
    expect(iconVNode.props).toEqual(expect.objectContaining({ name: 'gear', size: 24 }))
  })

  it('should pass disabled through to the trigger Button', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const { Button } = await import('../components/Button.js')
    const renderFn = (UserMenu.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, disabled: true },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )
    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === Button) as unknown[]
    expect(trigger[1].disabled).toBe(true)
  })

  it('should render the drawer on the configured side with a named dialog', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const { Modal } = await import('../components/Modal.js')
    const setup = UserMenu.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    setup(baseProps, { attrs: {}, slots: {}, emit: vi.fn() })()
    const right = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    expect(right[1].className).toBe('drawer-classes')
    expect(right[1]['aria-label']).toBe('Account menu')

    setup({ ...baseProps, side: 'left' }, { attrs: {}, slots: {}, emit: vi.fn() })()
    const left = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    expect(left[1].className).toBe('drawer-classes drawer-left-classes')
  })

  it('should open the drawer when the trigger is clicked', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const { Button } = await import('../components/Button.js')
    const { Modal } = await import('../components/Modal.js')
    const renderFn = (UserMenu.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      baseProps,
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === Button) as unknown[]
    ;(trigger[1] as { onClick: () => void }).onClick()

    renderFn()
    const modal = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    expect(modal[1].open).toBe(true)
  })

  it('should intercept the click with a custom onClick instead of opening', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const { Button } = await import('../components/Button.js')
    const { Modal } = await import('../components/Modal.js')
    const onClick = vi.fn()
    const renderFn = (UserMenu.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { ...baseProps, onClick },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === Button) as unknown[]
    expect((trigger[1] as { onClick?: () => void }).onClick).toBe(onClick)
    ;(trigger[1] as { onClick: (event: unknown) => void }).onClick({ type: 'click' })
    expect(onClick).toHaveBeenCalledTimes(1)

    renderFn()
    const modal = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    expect(modal[1].open).toBe(false)
  })

  it('should close the drawer when the route changes', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const { Button } = await import('../components/Button.js')
    const { Modal } = await import('../components/Modal.js')
    const renderFn = (UserMenu.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      baseProps,
      { attrs: {}, slots: {}, emit: vi.fn() },
    )

    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === Button) as unknown[]
    ;(trigger[1] as { onClick: () => void }).onClick()
    const routeWatcher = mockWatch.mock.calls.find(
      (call) => typeof call[0] === 'function',
    ) as unknown[]
    ;(routeWatcher[1] as () => void)()

    renderFn()
    const modal = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    expect(modal[1].open).toBe(false)
  })

  it('should wrap panel content in PanelCloseProvider and close through it', async () => {
    const { UserMenu } = await import('../components/UserMenu.js')
    const { Button } = await import('../components/Button.js')
    const { Modal } = await import('../components/Modal.js')
    const { PanelCloseProvider } = await import('../components/PanelClose.js')
    const slots = { default: () => ['Panel body'] }
    const renderFn = (UserMenu.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      baseProps,
      { attrs: {}, slots, emit: vi.fn() },
    )

    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === Button) as unknown[]
    ;(trigger[1] as { onClick: () => void }).onClick()

    renderFn()
    const modal = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    const providerVNode = (
      modal[2] as {
        default: () => { type: unknown; props: { close: () => void }; children: unknown }[]
      }
    ).default()[0]
    expect(providerVNode.type).toBe(PanelCloseProvider)
    // The panel slot content flows through the provider unchanged.
    expect((providerVNode.children as { default: () => unknown }).default()).toEqual(['Panel body'])

    providerVNode.props.close()

    renderFn()
    const closed = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    expect(closed[1].open).toBe(false)
  })
})

// ============================================================================
// SidebarUserCard Component Tests
// ============================================================================

describe('SidebarUserCard component', () => {
  let authState: Record<string, unknown>

  beforeEach(async () => {
    const { AuthKey, I18nKey, RouterKey } = await import('@molecule/app-vue')
    const cm = mockClassMap as unknown as Record<string, unknown>
    cm.sp = vi.fn((axis: string, n: number) => `spacing-${axis}-${n}`)
    cm.h = vi.fn((n: number) => `height-${n}`)
    cm.minW = vi.fn((n: number) => `min-width-${n}`)
    cm.flex1 = 'flex-one-classes'
    cm.textSize = vi.fn((s: string) => `text-size-${s}`)
    cm.fontWeight = vi.fn((w: string) => `font-weight-${w}`)
    cm.textTruncate = 'text-truncate-classes'
    cm.textMuted = 'text-muted-classes'
    cm.roundedFull = 'rounded-full-classes'
    cm.shrink0 = 'shrink-zero-classes'
    cm.objectCover = 'object-cover-classes'
    cm.sidebarUserCardTrigger = 'sidebar-user-card-trigger-classes'
    cm.drawer = 'drawer-classes'
    authState = {
      status: 'authenticated',
      authenticated: true,
      loading: false,
      initialized: true,
      user: { name: 'Ada Lovelace', email: 'ada@example.com', avatarUrl: null },
    }
    const authClient = { getState: () => authState, onAuthChange: () => () => {} }
    const i18n = {
      getLocale: () => 'en',
      onLocaleChange: () => () => {},
      t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
      getLocales: () => [],
      getDirection: () => 'ltr',
      formatNumber: () => '',
      formatDate: () => '',
    }
    const router = {
      getLocation: () => ({ pathname: '/', search: '' }),
      getParams: () => ({}),
      getQuery: () => ({}),
      subscribe: () => () => {},
      navigate: () => {},
    }
    mockInject.mockImplementation((key: unknown) => {
      if (key === AuthKey) return authClient
      if (key === I18nKey) return i18n
      if (key === RouterKey) return router
      return undefined
    })
  })

  const baseProps = {
    name: undefined,
    secondaryLine: undefined,
    avatarUrl: undefined,
    ariaLabelKey: 'sidebarUserCard.open',
    ariaLabelDefault: 'Open account menu',
    dataMolId: 'sidebar-user-card',
    className: undefined,
  }

  it('should be defined via defineComponent with correct name', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    expect(SidebarUserCard).toBeDefined()
    expect(SidebarUserCard.name).toBe('MSidebarUserCard')
  })

  it('should have correct default props', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    const props = SidebarUserCard.props as Record<string, { default?: unknown }>
    expect(props.ariaLabelKey.default).toBe('sidebarUserCard.open')
    expect(props.ariaLabelDefault.default).toBe('Open account menu')
    expect(props.dataMolId.default).toBe('sidebar-user-card')
  })

  it('should render the trigger button with identity from auth', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    const renderFn = (
      SidebarUserCard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(baseProps, { attrs: {}, slots: { default: () => ['Panel body'] }, emit: vi.fn() })
    const result = renderFn() as unknown[]
    expect(Array.isArray(result)).toBe(true)

    const trigger = mockH.mock.calls.find((call) => call[0] === 'button') as unknown[]
    expect(trigger[1]).toEqual(
      expect.objectContaining({
        type: 'button',
        'aria-label': 'Open account menu',
        'data-mol-id': 'sidebar-user-card',
      }),
    )
    const texts = mockH.mock.calls
      .filter((call) => typeof call[2] === 'string')
      .map((call) => call[2])
    expect(texts.sort()).toEqual(['AL', 'Ada Lovelace', 'ada@example.com'])
    const initials = mockH.mock.calls.find((call) => call[2] === 'AL') as unknown[]
    expect((initials[1] as Record<string, unknown>)['aria-hidden']).toBe('true')
  })

  it('should prefer explicit name and secondaryLine over auth', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    const renderFn = (
      SidebarUserCard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      { ...baseProps, name: 'Grace Hopper', secondaryLine: 'Premium member' },
      {
        attrs: {},
        slots: {},
        emit: vi.fn(),
      },
    )
    renderFn()
    const texts = mockH.mock.calls
      .filter((call) => typeof call[2] === 'string')
      .map((call) => call[2])
    expect(texts.sort()).toEqual(['GH', 'Grace Hopper', 'Premium member'])
  })

  it('should render the avatar image when one is available', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    const renderFn = (
      SidebarUserCard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      { ...baseProps, avatarUrl: 'data:image/png;base64,AAAA' },
      {
        attrs: {},
        slots: {},
        emit: vi.fn(),
      },
    )
    renderFn()
    const img = mockH.mock.calls.find((call) => call[0] === 'img') as unknown[]
    expect(img).toBeDefined()
    expect((img[1] as Record<string, unknown>).src).toBe('data:image/png;base64,AAAA')
    expect((img[1] as Record<string, unknown>).alt).toBe('')
  })

  it('should fall back to the guest label for unauthenticated users', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    authState = { status: 'unauthenticated', authenticated: false, loading: false, user: null }
    const renderFn = (
      SidebarUserCard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(baseProps, { attrs: {}, slots: {}, emit: vi.fn() })
    renderFn()
    const texts = mockH.mock.calls
      .filter((call) => typeof call[2] === 'string')
      .map((call) => call[2])
    expect(texts.sort()).toEqual(['G', 'Guest'])
  })

  it('should hide the secondary line when the user has no email', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    authState = {
      status: 'authenticated',
      authenticated: true,
      loading: false,
      user: { name: 'Alan' },
    }
    const renderFn = (
      SidebarUserCard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(baseProps, { attrs: {}, slots: {}, emit: vi.fn() })
    renderFn()
    const texts = mockH.mock.calls
      .filter((call) => typeof call[2] === 'string')
      .map((call) => call[2])
    expect(texts.sort()).toEqual(['A', 'Alan'])
  })

  it('should spread extra button attributes onto the trigger', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    const renderFn = (
      SidebarUserCard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(baseProps, {
      attrs: { title: 'Account', 'data-track': 'account-card' },
      slots: {},
      emit: vi.fn(),
    })
    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === 'button') as unknown[]
    expect(trigger[1]).toEqual(
      expect.objectContaining({ title: 'Account', 'data-track': 'account-card' }),
    )
  })

  it('should merge className into the trigger classes', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    const renderFn = (
      SidebarUserCard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ ...baseProps, className: 'parity-token' }, { attrs: {}, slots: {}, emit: vi.fn() })
    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === 'button') as unknown[]
    expect((trigger[1] as Record<string, unknown>).class).toBe(
      'flex-layout align-center gap-sm spacing-px-3 spacing-py-3 sidebar-user-card-trigger-classes parity-token',
    )
  })

  it('should open the drawer on trigger click and close it through usePanelClose', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    const { Modal } = await import('../components/Modal.js')
    const { PanelCloseProvider } = await import('../components/PanelClose.js')
    const renderFn = (
      SidebarUserCard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(baseProps, { attrs: {}, slots: { default: () => ['Panel body'] }, emit: vi.fn() })

    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === 'button') as unknown[]
    ;(trigger[1] as { onClick: () => void }).onClick()

    renderFn()
    const modal = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    expect(modal[1].open).toBe(true)
    expect(modal[1].className).toBe('drawer-classes')

    const providerVNode = (
      modal[2] as { default: () => { type: unknown; props: { close: () => void } }[] }
    ).default()[0]
    expect(providerVNode.type).toBe(PanelCloseProvider)
    providerVNode.props.close()

    renderFn()
    const closed = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    expect(closed[1].open).toBe(false)
  })

  it('should close the drawer when the route changes', async () => {
    const { SidebarUserCard } = await import('../components/SidebarUserCard.js')
    const { Modal } = await import('../components/Modal.js')
    const renderFn = (
      SidebarUserCard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(baseProps, { attrs: {}, slots: {}, emit: vi.fn() })

    renderFn()
    const trigger = mockH.mock.calls.find((call) => call[0] === 'button') as unknown[]
    ;(trigger[1] as { onClick: () => void }).onClick()
    const routeWatcher = mockWatch.mock.calls.find(
      (call) => typeof call[0] === 'function',
    ) as unknown[]
    ;(routeWatcher[1] as () => void)()

    renderFn()
    const modal = mockH.mock.calls.filter((call) => call[0] === Modal).pop() as unknown[]
    expect(modal[1].open).toBe(false)
  })
})

// ============================================================================
// ConfirmDialog Component Tests
// ============================================================================

/** An i18n provider stand-in for the internal useTranslation hook (t falls back to defaultValue). */
const dialogsI18nProvider = {
  t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? key,
  getLocale: () => 'en',
  onLocaleChange: () => () => {},
  setLocale: () => {},
  getLocales: () => [],
  getDirection: () => 'ltr' as const,
  formatNumber: (value: number) => String(value),
  formatDate: (value: Date | number | string) => String(value),
}

describe('ConfirmDialog component', () => {
  beforeEach(() => {
    mockInject.mockReturnValue(dialogsI18nProvider)
  })

  afterEach(() => {
    mockInject.mockReset()
  })

  it('should be defined with correct name', async () => {
    const { ConfirmDialog } = await import('../components/ConfirmDialog.js')
    expect(ConfirmDialog).toBeDefined()
    expect(ConfirmDialog.name).toBe('MConfirmDialog')
  })

  it('should have correct props and defaults', async () => {
    const { ConfirmDialog } = await import('../components/ConfirmDialog.js')
    const props = ConfirmDialog.props as Record<string, { default?: unknown }>
    expect(props).toHaveProperty('open')
    expect(props).toHaveProperty('title')
    expect(props).toHaveProperty('description')
    expect(props).toHaveProperty('confirmLabel')
    expect(props).toHaveProperty('cancelLabel')
    expect(props.destructive.default).toBe(true)
    expect(props.loading.default).toBe(false)
  })

  it('should emit close and confirm', async () => {
    const { ConfirmDialog } = await import('../components/ConfirmDialog.js')
    expect(ConfirmDialog.emits).toContain('close')
    expect(ConfirmDialog.emits).toContain('confirm')
  })

  it('should forward open to Modal and emit close/confirm from the footer buttons', async () => {
    const { ConfirmDialog } = await import('../components/ConfirmDialog.js')
    const { Modal } = await import('../components/Modal.js')
    const { Button } = await import('../components/Button.js')
    const mockEmit = vi.fn()

    const renderFn = (
      ConfirmDialog.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      { open: true, destructive: true, loading: false, title: 'Delete?' },
      { emit: mockEmit, slots: {}, attrs: {} },
    )
    renderFn()

    const modalCall = mockH.mock.calls.find((call) => call[0] === Modal)
    expect(modalCall![1]).toMatchObject({ open: true })
    // The footer buttons live in Modal's default slot; render it so their
    // vnodes exist (the mocked Modal does not render slots itself).
    ;(modalCall![2] as { default: () => unknown }).default()

    const buttons = mockH.mock.calls.filter((call) => call[0] === Button)
    expect(buttons).toHaveLength(2)
    // Cancel forwards the click event, like React's onClick={onClose}.
    const clickEvent = { type: 'click' }
    buttons[0]![1].onClick(clickEvent)
    expect(mockEmit).toHaveBeenCalledWith('close', clickEvent)
    // Confirm fires with no arguments, like React's () => void onConfirm().
    buttons[1]![1].onClick()
    expect(mockEmit).toHaveBeenCalledWith('confirm')
  })
})

// ============================================================================
// PromptDialog Component Tests
// ============================================================================

describe('PromptDialog component', () => {
  beforeEach(() => {
    mockInject.mockReturnValue(dialogsI18nProvider)
  })

  afterEach(() => {
    mockInject.mockReset()
  })

  it('should be defined with correct name', async () => {
    const { PromptDialog } = await import('../components/PromptDialog.js')
    expect(PromptDialog).toBeDefined()
    expect(PromptDialog.name).toBe('MPromptDialog')
  })

  it('should have correct props and defaults', async () => {
    const { PromptDialog } = await import('../components/PromptDialog.js')
    const props = PromptDialog.props as Record<string, { default?: unknown; required?: boolean }>
    expect(props).toHaveProperty('open')
    expect(props).toHaveProperty('title')
    expect(props).toHaveProperty('description')
    expect(props).toHaveProperty('placeholder')
    expect(props).toHaveProperty('inputMolId')
    expect(props.onSubmit).toBeDefined()
    expect(props.initialValue.default).toBe('')
    expect(props.destructive.default).toBe(false)
  })

  it('should emit close only', async () => {
    const { PromptDialog } = await import('../components/PromptDialog.js')
    expect(PromptDialog.emits).toEqual(['close'])
  })

  it('should submit the typed value and close once the promise resolves', async () => {
    const { PromptDialog } = await import('../components/PromptDialog.js')
    const mockEmit = vi.fn()
    const onSubmit = vi.fn(() => Promise.resolve())

    const renderFn = (
      PromptDialog.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      { open: true, title: 'Rename', initialValue: '', onSubmit },
      { emit: mockEmit, slots: {}, attrs: {} },
    )
    renderFn()

    // The form lives in Modal's default slot; render it so its vnode exists
    // (the mocked Modal does not render slots itself).
    const modalCall = mockH.mock.calls.find((call) => call[0]?.name === 'MModal')
    ;(modalCall![2] as { default: () => unknown }).default()
    const formCall = mockH.mock.calls.find((call) => call[0] === 'form')
    const fakeEvent = { preventDefault: vi.fn() }
    formCall![1].onSubmit(fakeEvent)
    expect(fakeEvent.preventDefault).toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledWith('')
    await Promise.resolve()
    await Promise.resolve()
    expect(mockEmit).toHaveBeenCalledWith('close')
  })
})

// ============================================================================
// ConfirmButton Component Tests
// ============================================================================

describe('ConfirmButton component', () => {
  beforeEach(() => {
    mockInject.mockReturnValue(dialogsI18nProvider)
  })

  afterEach(() => {
    mockInject.mockReset()
  })

  it('should be defined with correct name', async () => {
    const { ConfirmButton } = await import('../components/ConfirmButton.js')
    expect(ConfirmButton).toBeDefined()
    expect(ConfirmButton.name).toBe('MConfirmButton')
  })

  it('should have correct props and defaults', async () => {
    const { ConfirmButton } = await import('../components/ConfirmButton.js')
    const props = ConfirmButton.props as Record<string, { default?: unknown; required?: boolean }>
    expect(props).toHaveProperty('label')
    expect(props).toHaveProperty('confirmLabel')
    expect(props).toHaveProperty('pendingLabel')
    expect(props.onConfirm.required).toBe(true)
    expect(props.disarmSeconds.default).toBe(4)
    expect(props.disabled.default).toBe(false)
    expect(props).toHaveProperty('testId')
  })

  it('should arm on first click, commit on second, and return to idle', async () => {
    const { ConfirmButton } = await import('../components/ConfirmButton.js')
    const onConfirm = vi.fn(() => Promise.resolve())
    const mockEmit = vi.fn()

    const renderFn = (
      ConfirmButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      { onConfirm, disarmSeconds: 0, disabled: false },
      { attrs: {}, slots: { label: () => 'Delete' }, emit: mockEmit },
    )

    const buttonCalls = () => mockH.mock.calls.filter((call) => call[0] === 'button')
    renderFn()
    expect(buttonCalls().at(-1)![1]).toMatchObject({ 'data-state': 'idle', 'aria-live': 'polite' })

    buttonCalls().at(-1)![1].onClick()
    renderFn()
    expect(buttonCalls().at(-1)![1]).toMatchObject({ 'data-state': 'armed' })
    expect(buttonCalls().at(-1)![1].class).toContain('color-error')

    buttonCalls().at(-1)![1].onClick()
    renderFn()
    expect(buttonCalls().at(-1)![1]).toMatchObject({ 'data-state': 'pending', disabled: true })

    await Promise.resolve()
    await Promise.resolve()
    renderFn()
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(buttonCalls().at(-1)![1]).toMatchObject({ 'data-state': 'idle', disabled: false })
  })

  it('should fall back to localized arm and pending labels', async () => {
    const { ConfirmButton } = await import('../components/ConfirmButton.js')
    const renderFn = (
      ConfirmButton.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      { onConfirm: () => Promise.resolve(), disarmSeconds: 0, disabled: false },
      { attrs: {}, slots: { label: () => 'Delete' }, emit: vi.fn() },
    )
    renderFn()
    const buttonCalls = () => mockH.mock.calls.filter((call) => call[0] === 'button')
    expect(buttonCalls().at(-1)![2]).toEqual(['Delete'])
    buttonCalls().at(-1)![1].onClick()
    renderFn()
    expect(buttonCalls().at(-1)![2]).toEqual(['Confirm?'])
  })
})

// ============================================================================
// UserMenuPopover Component Tests
// ============================================================================

/** Installs the service fakes the popover family's hooks read through inject. */
const installPopoverServices = async (authState: Record<string, unknown>): Promise<void> => {
  const { AuthKey, RouterKey } = await import('@molecule/app-vue')
  const authClient = { getState: () => authState, onAuthChange: () => () => {} }
  const router = {
    getLocation: () => ({ pathname: '/', search: '', hash: '' }),
    getParams: () => ({}),
    getQuery: () => ({}),
    subscribe: () => () => {},
    navigate: () => {},
  }
  mockInject.mockImplementation((key: unknown) => {
    if (key === AuthKey) return authClient
    if (key === RouterKey) return router
    return dialogsI18nProvider
  })
}

describe('UserMenuPopover component', () => {
  beforeEach(() => {
    const cm = mockClassMap as unknown as Record<string, unknown>
    cm.position = vi.fn((p: string) => `position-${p}`)
    cm.sp = vi.fn((axis: string, n: number) => `spacing-${axis}-${n}`)
  })

  afterEach(() => {
    mockInject.mockReset()
  })

  const authenticated = {
    status: 'authenticated',
    authenticated: true,
    loading: false,
    user: { name: 'Ada Lovelace', email: 'ada@example.com' },
  }

  it('should be defined via defineComponent with correct name', async () => {
    const { UserMenuPopover } = await import('../components/UserMenuPopover.js')
    expect(UserMenuPopover).toBeDefined()
    expect(UserMenuPopover.name).toBe('MUserMenuPopover')
  })

  it('should declare the guestName and className props', async () => {
    const { UserMenuPopover } = await import('../components/UserMenuPopover.js')
    const props = UserMenuPopover.props as Record<string, unknown>
    expect(props).toHaveProperty('guestName')
    expect(props).toHaveProperty('className')
  })

  it('should render a relative container that merges className and hosts the slot', async () => {
    const { UserMenuPopover } = await import('../components/UserMenuPopover.js')
    await installPopoverServices(authenticated)
    const renderFn = (
      UserMenuPopover.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({ className: 'parity-token' }, { attrs: {}, slots: { default: () => ['Menu body'] } })
    const container = renderFn() as { type: string; props: Record<string, unknown> }
    expect(container.type).toBe('div')
    expect(container.props.class).toBe('position-relative parity-token')
  })

  it('should provide the resolved identity for an authenticated user', async () => {
    const { UserMenuPopover } = await import('../components/UserMenuPopover.js')
    await installPopoverServices(authenticated)
    const setup = UserMenuPopover.setup as (...args: unknown[]) => unknown
    setup({}, { attrs: {}, slots: {} })
    const provided = mockProvide.mock.calls[0]![1] as {
      open: { value: boolean }
      displayName: { value: string }
      email: { value: string | undefined }
      panelId: string
    }
    expect(provided.open.value).toBe(false)
    expect(provided.displayName.value).toBe('Ada Lovelace')
    expect(provided.email.value).toBe('ada@example.com')
    expect(typeof provided.panelId).toBe('string')
  })

  it('should fall back to the Account label and honor a custom guest name', async () => {
    const { UserMenuPopover } = await import('../components/UserMenuPopover.js')
    const setup = UserMenuPopover.setup as (...args: unknown[]) => unknown
    await installPopoverServices({ status: 'unauthenticated', authenticated: false, user: null })
    setup({}, { attrs: {}, slots: {} })
    const guest = mockProvide.mock.calls.at(-1)![1] as { displayName: { value: string } }
    expect(guest.displayName.value).toBe('Account')

    setup({ guestName: 'Analyst' }, { attrs: {}, slots: {} })
    const named = mockProvide.mock.calls.at(-1)![1] as { displayName: { value: string } }
    expect(named.displayName.value).toBe('Analyst')
  })

  it('should use the email as the display name when the user has only one', async () => {
    const { UserMenuPopover } = await import('../components/UserMenuPopover.js')
    await installPopoverServices({
      status: 'authenticated',
      authenticated: true,
      user: { email: 'grace@example.com' },
    })
    const setup = UserMenuPopover.setup as (...args: unknown[]) => unknown
    setup({}, { attrs: {}, slots: {} })
    const provided = mockProvide.mock.calls[0]![1] as {
      displayName: { value: string }
      email: { value: string | undefined }
    }
    expect(provided.displayName.value).toBe('grace@example.com')
    expect(provided.email.value).toBe('grace@example.com')
  })

  it('should close the open panel when the route changes', async () => {
    const { UserMenuPopover } = await import('../components/UserMenuPopover.js')
    await installPopoverServices(authenticated)
    const setup = UserMenuPopover.setup as (...args: unknown[]) => unknown
    setup({}, { attrs: {}, slots: {} })
    const provided = mockProvide.mock.calls[0]![1] as {
      open: { value: boolean }
      setOpen: (value: boolean) => void
    }
    provided.setOpen(true)
    expect(provided.open.value).toBe(true)

    const routeWatcher = mockWatch.mock.calls.find(
      (call) => typeof call[0] === 'function',
    ) as unknown[]
    ;(routeWatcher[1] as () => void)()
    expect(provided.open.value).toBe(false)
  })

  it('should listen for popstate while mounted and stop on unmount', async () => {
    const { UserMenuPopover } = await import('../components/UserMenuPopover.js')
    await installPopoverServices(authenticated)
    // This suite runs in the node environment (no `window`/`document`);
    // stub the listener hooks the component (and its unmount hooks) touch.
    const windowAdd = vi.fn()
    const windowRemove = vi.fn()
    vi.stubGlobal('window', { addEventListener: windowAdd, removeEventListener: windowRemove })
    vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
    try {
      const setup = UserMenuPopover.setup as (...args: unknown[]) => unknown
      setup({}, { attrs: {}, slots: {} })
      ;(mockOnMounted.mock.calls.at(-1)![0] as () => void)()
      expect(windowAdd).toHaveBeenCalledWith('popstate', expect.any(Function))
      // The component registers several onUnmounted hooks (the i18n/auth
      // subscriptions and the popstate remover); run them all and require the
      // popstate listener to be among the removed.
      for (const [unmount] of mockOnUnmounted.mock.calls) (unmount as () => void)()
      expect(windowRemove).toHaveBeenCalledWith('popstate', expect.any(Function))
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('should add outside-mousedown and Escape listeners while open and remove them when closed', async () => {
    const { UserMenuPopover } = await import('../components/UserMenuPopover.js')
    await installPopoverServices(authenticated)
    // This suite runs in the node environment (no `document`); stub the two
    // listener hooks the component uses and assert against them directly.
    const documentAdd = vi.fn()
    const documentRemove = vi.fn()
    vi.stubGlobal('document', {
      addEventListener: documentAdd,
      removeEventListener: documentRemove,
      contains: () => true,
    })
    try {
      const setup = UserMenuPopover.setup as (...args: unknown[]) => unknown
      setup({}, { attrs: {}, slots: {} })
      const openWatcher = mockWatch.mock.calls.find(
        (call) => typeof call[0] === 'object',
      ) as unknown[]
      ;(openWatcher[1] as (value: boolean) => void)(true)
      expect(documentAdd).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(documentAdd).toHaveBeenCalledWith('keydown', expect.any(Function))

      ;(openWatcher[1] as (value: boolean) => void)(false)
      expect(documentRemove).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(documentRemove).toHaveBeenCalledWith('keydown', expect.any(Function))
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

/** A popover context stand-in for exercising the sub-components standalone. */
const popoverContext = () => ({
  open: { value: false },
  setOpen: vi.fn(),
  displayName: { value: 'Ada Lovelace' },
  email: { value: 'ada@example.com' },
  panelId: 'panel-1',
})

/**
 * A sub-component's own prop defaults as a setup props object — the mocked
 * `defineComponent` hands `setup` through untouched, so the defaults a real
 * mount would resolve must be passed explicitly.
 */
const propDefaults = (component: { props: unknown }): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(component.props as Record<string, { default?: unknown }>)
      .filter(([, def]) => typeof def === 'object' && def !== null && 'default' in def)
      .map(([name, def]) => [name, def.default]),
  )

describe('UserMenuPopoverTrigger component', () => {
  let context: ReturnType<typeof popoverContext>

  beforeEach(async () => {
    const cm = mockClassMap as unknown as Record<string, unknown>
    cm.sp = vi.fn((axis: string, n: number) => `spacing-${axis}-${n}`)
    cm.h = vi.fn((n: number) => `height-${n}`)
    cm.minW = vi.fn((n: number) => `min-width-${n}`)
    cm.flex1 = 'flex-one-classes'
    cm.roundedFull = 'rounded-full-classes'
    cm.shrink0 = 'shrink-zero-classes'
    cm.textTruncate = 'text-truncate-classes'
    cm.textMuted = 'text-muted-classes'
    cm.userMenuPopoverTrigger = 'user-menu-popover-trigger-classes'
    context = popoverContext()
    // The trigger's hooks inject by key: i18n for `t`, everything else reads
    // the popover context (its key is module-local to UserMenuPopover.ts).
    const { I18nKey } = await import('@molecule/app-vue')
    mockInject.mockImplementation((key: unknown) =>
      key === I18nKey ? dialogsI18nProvider : context,
    )
  })

  afterEach(() => {
    mockInject.mockReset()
  })

  it('should be defined via defineComponent with correct name and defaults', async () => {
    const { UserMenuPopoverTrigger } = await import('../components/UserMenuPopover.js')
    expect(UserMenuPopoverTrigger).toBeDefined()
    expect(UserMenuPopoverTrigger.name).toBe('MUserMenuPopoverTrigger')
    const props = UserMenuPopoverTrigger.props as Record<string, { default?: unknown }>
    expect(props.ariaLabelKey.default).toBe('userMenu.open')
    expect(props.ariaLabelDefault.default).toBe('Open user menu')
    expect(props.dataMolId.default).toBe('user-menu')
  })

  it('should render the disclosure trigger with identity from the context', async () => {
    const { UserMenuPopoverTrigger } = await import('../components/UserMenuPopover.js')
    const renderFn = (
      UserMenuPopoverTrigger.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(propDefaults(UserMenuPopoverTrigger), { attrs: {}, slots: {} })
    const button = renderFn() as { props: Record<string, unknown> }
    expect(button.props).toEqual(
      expect.objectContaining({
        type: 'button',
        'aria-expanded': false,
        'aria-controls': 'panel-1',
        'aria-label': 'Open user menu',
        'data-mol-id': 'user-menu',
      }),
    )
    const texts = mockH.mock.calls
      .filter((call) => typeof call[2] === 'string')
      .map((call) => call[2])
    expect(texts.sort()).toEqual(['AL', 'Ada Lovelace', 'ada@example.com'])
  })

  it('should hide the email line when the context has no email', async () => {
    const { UserMenuPopoverTrigger } = await import('../components/UserMenuPopover.js')
    context.email.value = undefined
    const renderFn = (
      UserMenuPopoverTrigger.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({}, { attrs: {}, slots: {} })
    renderFn()
    const texts = mockH.mock.calls
      .filter((call) => typeof call[2] === 'string')
      .map((call) => call[2])
    expect(texts.sort()).toEqual(['AL', 'Ada Lovelace'])
  })

  it('should toggle the popover through the context on click', async () => {
    const { UserMenuPopoverTrigger } = await import('../components/UserMenuPopover.js')
    const renderFn = (
      UserMenuPopoverTrigger.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({}, { attrs: {}, slots: {} })
    const button = renderFn() as { props: { onClick: () => void } }
    button.props.onClick()
    expect(context.setOpen).toHaveBeenCalledWith(true)

    context.open.value = true
    const toggled = renderFn() as { props: { onClick: () => void; 'aria-expanded': boolean } }
    expect(toggled.props['aria-expanded']).toBe(true)
    toggled.props.onClick()
    expect(context.setOpen).toHaveBeenCalledWith(false)
  })

  it('should honor aria label, id and className overrides', async () => {
    const { UserMenuPopoverTrigger } = await import('../components/UserMenuPopover.js')
    const renderFn = (
      UserMenuPopoverTrigger.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      {
        ariaLabelKey: 'nav.account',
        ariaLabelDefault: 'Open account',
        dataMolId: 'account-trigger',
        className: 'parity-token',
      },
      { attrs: {}, slots: {} },
    )
    const button = renderFn() as { props: Record<string, unknown> }
    expect(button.props['aria-label']).toBe('Open account')
    expect(button.props['data-mol-id']).toBe('account-trigger')
    expect(button.props.class).toBe(
      'flex-layout align-center gap-sm spacing-px-3 spacing-py-3 user-menu-popover-trigger-classes parity-token',
    )
  })
})

describe('UserMenuPopoverPanel component', () => {
  let context: ReturnType<typeof popoverContext>

  beforeEach(async () => {
    const cm = mockClassMap as unknown as Record<string, unknown>
    cm.sp = vi.fn((axis: string, n: number) => `spacing-${axis}-${n}`)
    cm.userMenuPopoverPanel = 'user-menu-popover-panel-classes'
    cm.userMenuPopoverHeader = 'user-menu-popover-header-classes'
    context = popoverContext()
    // Same key dispatch as the trigger: i18n for `t`, the popover context for
    // the module-local popover key.
    const { I18nKey } = await import('@molecule/app-vue')
    mockInject.mockImplementation((key: unknown) =>
      key === I18nKey ? dialogsI18nProvider : context,
    )
  })

  afterEach(() => {
    mockInject.mockReset()
  })

  it('should be defined via defineComponent with correct name and defaults', async () => {
    const { UserMenuPopoverPanel } = await import('../components/UserMenuPopover.js')
    expect(UserMenuPopoverPanel).toBeDefined()
    expect(UserMenuPopoverPanel.name).toBe('MUserMenuPopoverPanel')
    const props = UserMenuPopoverPanel.props as Record<string, { default?: unknown }>
    expect(props.ariaLabelKey.default).toBe('userMenu.panelLabel')
    expect(props.ariaLabelDefault.default).toBe('Account menu')
    expect(props.dataMolId.default).toBe('user-menu-panel')
  })

  it('should render nothing while the popover is closed', async () => {
    const { UserMenuPopoverPanel } = await import('../components/UserMenuPopover.js')
    const renderFn = (
      UserMenuPopoverPanel.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({}, { attrs: {}, slots: {} })
    expect(renderFn()).toBeNull()
  })

  it('should render the identity header and the nav with its children while open', async () => {
    const { UserMenuPopoverPanel } = await import('../components/UserMenuPopover.js')
    context.open.value = true
    const renderFn = (
      UserMenuPopoverPanel.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      { ...propDefaults(UserMenuPopoverPanel), className: 'parity-token' },
      { attrs: {}, slots: { default: () => ['Settings'] } },
    )
    const panel = renderFn() as {
      type: string
      props: Record<string, unknown>
      children: { type: unknown; props: Record<string, unknown> }[]
    }
    expect(panel.type).toBe('div')
    expect(panel.props).toEqual(
      expect.objectContaining({ id: 'panel-1', 'data-mol-id': 'user-menu-panel' }),
    )
    expect(panel.props.class).toBe('user-menu-popover-panel-classes parity-token')

    const header = panel.children[0] as {
      props: Record<string, unknown>
      children: { props: Record<string, unknown>; children: unknown }[]
    }
    expect(header.children.map((line) => line.children)).toEqual([
      'Ada Lovelace',
      'ada@example.com',
    ])

    const nav = panel.children[1] as { type: string; props: Record<string, unknown> }
    expect(nav.type).toBe('nav')
    expect(nav.props['aria-label']).toBe('Account menu')
    expect(nav.props.class).toBe('spacing-mt-4 stack-1')
  })

  it('should skip the email line when the context has no email', async () => {
    const { UserMenuPopoverPanel } = await import('../components/UserMenuPopover.js')
    context.open.value = true
    context.email.value = undefined
    const renderFn = (
      UserMenuPopoverPanel.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({}, { attrs: {}, slots: {} })
    const panel = renderFn() as {
      children: { children: { children: unknown }[] }[]
    }
    expect(panel.children[0].children.map((line) => line.children)).toEqual(['Ada Lovelace'])
  })

  it('should honor aria label, id and className overrides', async () => {
    const { UserMenuPopoverPanel } = await import('../components/UserMenuPopover.js')
    context.open.value = true
    const renderFn = (
      UserMenuPopoverPanel.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      {
        ariaLabelKey: 'nav.menu',
        ariaLabelDefault: 'Account links',
        dataMolId: 'account-panel',
      },
      { attrs: {}, slots: {} },
    )
    const panel = renderFn() as {
      props: Record<string, unknown>
      children: { props: Record<string, unknown> }[]
    }
    expect(panel.props['data-mol-id']).toBe('account-panel')
    expect(panel.children[1].props['aria-label']).toBe('Account links')
  })
})

describe('UserMenuPopoverSignOut component', () => {
  let context: ReturnType<typeof popoverContext>
  let logout: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { AuthKey, I18nKey } = await import('@molecule/app-vue')
    const cm = mockClassMap as unknown as Record<string, unknown>
    cm.sp = vi.fn((axis: string, n: number) => `spacing-${axis}-${n}`)
    cm.textError = 'text-error-classes'
    cm.userMenuPopoverSignOut = 'user-menu-popover-sign-out-classes'
    context = popoverContext()
    logout = vi.fn(async () => undefined)
    const authClient = { getState: () => ({}), onAuthChange: () => () => {}, logout }
    mockInject.mockImplementation((key: unknown) => {
      if (key === AuthKey) return authClient
      if (key === I18nKey) return dialogsI18nProvider
      return context
    })
  })

  afterEach(() => {
    mockInject.mockReset()
  })

  it('should be defined via defineComponent with correct name and defaults', async () => {
    const { UserMenuPopoverSignOut } = await import('../components/UserMenuPopover.js')
    expect(UserMenuPopoverSignOut).toBeDefined()
    expect(UserMenuPopoverSignOut.name).toBe('MUserMenuPopoverSignOut')
    const props = UserMenuPopoverSignOut.props as Record<string, { default?: unknown }>
    expect(props.labelKey.default).toBe('userMenu.signOut')
    expect(props.labelDefault.default).toBe('Sign out')
    expect(props.dataMolId.default).toBe('user-menu-sign-out')
  })

  it('should close the popover and call auth.logout on click', async () => {
    const { UserMenuPopoverSignOut } = await import('../components/UserMenuPopover.js')
    const renderFn = (
      UserMenuPopoverSignOut.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(propDefaults(UserMenuPopoverSignOut), { attrs: {}, slots: {} })
    const button = renderFn() as {
      props: { onClick: () => Promise<void>; class: string }
      children: unknown
    }
    expect(button.children).toBe('Sign out')
    expect(button.props.class).toBe(
      'spacing-px-3 spacing-py-2 text-size-sm font-weight-semibold display-block width-full text-error-classes user-menu-popover-sign-out-classes',
    )
    await button.props.onClick()
    expect(context.setOpen).toHaveBeenCalledWith(false)
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('should survive a rejected logout', async () => {
    const { UserMenuPopoverSignOut } = await import('../components/UserMenuPopover.js')
    logout.mockImplementation(() => Promise.reject(new Error('network down')))
    const renderFn = (
      UserMenuPopoverSignOut.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )({}, { attrs: {}, slots: {} })
    const button = renderFn() as { props: { onClick: () => Promise<void> } }
    await expect(button.props.onClick()).resolves.toBeUndefined()
    expect(context.setOpen).toHaveBeenCalledWith(false)
  })

  it('should honor label, id and className overrides', async () => {
    const { UserMenuPopoverSignOut } = await import('../components/UserMenuPopover.js')
    const renderFn = (
      UserMenuPopoverSignOut.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    )(
      {
        labelKey: 'nav.exit',
        labelDefault: 'Log out',
        dataMolId: 'exit-button',
        className: 'parity-token',
      },
      { attrs: {}, slots: {} },
    )
    const button = renderFn() as {
      props: Record<string, unknown>
      children: unknown
    }
    expect(button.children).toBe('Log out')
    expect(button.props['data-mol-id']).toBe('exit-button')
    expect(button.props.class).toContain('parity-token')
  })
})

describe('useUserMenuPopoverClose', () => {
  afterEach(() => {
    mockInject.mockReset()
  })

  it('should return a closer that closes the enclosing popover', async () => {
    const { useUserMenuPopoverClose } = await import('../components/UserMenuPopover.js')
    const context = popoverContext()
    mockInject.mockImplementation(() => context)
    const close = useUserMenuPopoverClose()
    close()
    expect(context.setOpen).toHaveBeenCalledWith(false)
  })

  it('should return a no-op outside a UserMenuPopover', async () => {
    const { useUserMenuPopoverClose } = await import('../components/UserMenuPopover.js')
    mockInject.mockReturnValue(undefined)
    const close = useUserMenuPopoverClose()
    expect(() => close()).not.toThrow()
  })
})

// ============================================================================
// AuthGuard Component Tests
// ============================================================================

describe('AuthGuard component', () => {
  let routerNavigate: ReturnType<typeof vi.fn>

  const installAuth = (
    status: string,
    pathname = '/',
    authenticated = status === 'authenticated',
  ): void => {
    const { AuthKey, RouterKey } = authenticatedKeys
    const authClient = {
      getState: () => ({
        status,
        authenticated,
        loading: status === 'loading',
        user: authenticated ? { id: 'u1', name: 'Ada' } : null,
      }),
      onAuthChange: () => () => {},
    }
    routerNavigate = vi.fn()
    const router = {
      getLocation: () => ({ pathname, search: '', hash: '' }),
      getParams: () => ({}),
      getQuery: () => ({}),
      subscribe: () => () => {},
      navigate: routerNavigate,
    }
    mockInject.mockImplementation((key: unknown) => {
      if (key === AuthKey) return authClient
      if (key === RouterKey) return router
      return dialogsI18nProvider
    })
  }

  let authenticatedKeys: { AuthKey: unknown; RouterKey: unknown }

  beforeEach(async () => {
    const keys = await import('@molecule/app-vue')
    authenticatedKeys = { AuthKey: keys.AuthKey, RouterKey: keys.RouterKey }
  })

  afterEach(() => {
    mockInject.mockReset()
  })

  it('should be defined via defineComponent with correct name and defaults', async () => {
    const { AuthGuard } = await import('../components/AuthGuard.js')
    expect(AuthGuard).toBeDefined()
    expect(AuthGuard.name).toBe('MAuthGuard')
    const props = AuthGuard.props as Record<string, { default?: unknown }>
    expect(props.loadingKey.default).toBe('common.loading')
    expect(props.loadingDefault.default).toBe('Loading...')
    expect(props.loginPath.default).toBe('/login')
    expect(AuthGuard.emits).toContain('authenticated')
  })

  it('should render the default loading tag while the session is undecided', async () => {
    const { AuthGuard } = await import('../components/AuthGuard.js')
    installAuth('loading')
    // The declared prop defaults (asserted above) hold these values on a real
    // mount; a direct setup call receives raw props, so pass them here.
    const renderFn = (AuthGuard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { loadingKey: 'common.loading', loadingDefault: 'Loading...' },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )
    const tag = renderFn() as {
      type: string
      props: Record<string, unknown>
      children: unknown
    }
    expect(tag.type).toBe('div')
    expect(tag.props['data-mol-id']).toBe('auth-guard-loading')
    expect(tag.children).toBe('Loading...')
  })

  it('should honor custom loading key, default and fallback node', async () => {
    const { AuthGuard } = await import('../components/AuthGuard.js')
    installAuth('loading')
    const setup = AuthGuard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    const keyed = setup(
      { loadingKey: 'common.restoring', loadingDefault: 'Restoring session…' },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )() as { children: unknown }
    expect(keyed.children).toBe('Restoring session…')

    const fallbackNode = { custom: 'boot-spinner' }
    const withFallback = setup(
      { loadingFallback: fallbackNode },
      { attrs: {}, slots: {}, emit: vi.fn() },
    )()
    expect(withFallback).toBe(fallbackNode)

    const slotted = setup(
      {},
      { attrs: {}, slots: { loadingFallback: () => ['Booting…'] }, emit: vi.fn() },
    )()
    expect(slotted).toEqual(['Booting…'])
  })

  it('should render its children once a session is decided', async () => {
    const { AuthGuard } = await import('../components/AuthGuard.js')
    installAuth('authenticated')
    const setup = AuthGuard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    expect(
      setup({}, { attrs: {}, slots: { default: () => ['Protected page'] }, emit: vi.fn() })(),
    ).toEqual(['Protected page'])

    installAuth('unavailable')
    expect(
      setup({}, { attrs: {}, slots: { default: () => ['Candidate page'] }, emit: vi.fn() })(),
    ).toEqual(['Candidate page'])
  })

  it('should render its children on the login path instead of redirecting', async () => {
    const { AuthGuard } = await import('../components/AuthGuard.js')
    installAuth('unauthenticated', '/login', false)
    const renderFn = (AuthGuard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { loginPath: '/login' },
      { attrs: {}, slots: { default: () => ['Login page'] }, emit: vi.fn() },
    )
    expect(renderFn()).toEqual(['Login page'])
    ;(mockOnMounted.mock.calls.at(-1)![0] as () => void)()
    expect(routerNavigate).not.toHaveBeenCalled()
  })

  it('should redirect an unauthenticated visitor to the login path with state.from', async () => {
    const { AuthGuard } = await import('../components/AuthGuard.js')
    installAuth('unauthenticated', '/dashboard?tab=2', false)
    const renderFn = (AuthGuard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
      { loginPath: '/login' },
      { attrs: {}, slots: { default: () => ['Routed content'] }, emit: vi.fn() },
    )
    expect(renderFn()).toBeNull()
    ;(mockOnMounted.mock.calls.at(-1)![0] as () => void)()
    expect(routerNavigate).toHaveBeenCalledWith('/login', {
      replace: true,
      state: { from: { pathname: '/dashboard?tab=2', search: '', hash: '' } },
    })
  })

  it('should keep the pathname of a custom login path and re-check on route change', async () => {
    const { AuthGuard } = await import('../components/AuthGuard.js')
    installAuth('unauthenticated', '/settings', false)
    const setup = AuthGuard.setup as (...args: unknown[]) => (...args: unknown[]) => unknown
    setup({ loginPath: '/signin?next=%2Fdashboard' }, { attrs: {}, slots: {}, emit: vi.fn() })
    ;(mockOnMounted.mock.calls.at(-1)![0] as () => void)()
    expect(routerNavigate).toHaveBeenCalledWith('/signin?next=%2Fdashboard', {
      replace: true,
      state: { from: { pathname: '/settings', search: '', hash: '' } },
    })

    const redirectWatcher = mockWatch.mock.calls.find(
      (call) => typeof call[0] === 'function',
    ) as unknown[]
    routerNavigate.mockClear()
    ;(redirectWatcher[1] as () => void)()
    expect(routerNavigate).toHaveBeenCalledTimes(1)
  })

  it('should emit authenticated on the first true transition only', async () => {
    const { AuthGuard } = await import('../components/AuthGuard.js')
    installAuth('authenticated')
    const emit = vi.fn()
    const setup = AuthGuard.setup as (...args: unknown[]) => unknown
    setup({}, { attrs: {}, slots: {}, emit })
    const authWatcher = mockWatch.mock.calls.find(
      (call) => (call[2] as { immediate?: boolean } | undefined)?.immediate,
    ) as unknown[]
    ;(authWatcher[1] as (value: boolean) => void)(true)
    expect(emit).toHaveBeenCalledWith('authenticated')
    emit.mockClear()
    ;(authWatcher[1] as (value: boolean) => void)(true)
    expect(emit).not.toHaveBeenCalled()
    ;(authWatcher[1] as (value: boolean) => void)(false)
    ;(authWatcher[1] as (value: boolean) => void)(true)
    expect(emit).toHaveBeenCalledWith('authenticated')
  })

  it('should stay silent while loading or unauthenticated', async () => {
    const { AuthGuard } = await import('../components/AuthGuard.js')
    installAuth('loading')
    const emit = vi.fn()
    const setup = AuthGuard.setup as (...args: unknown[]) => unknown
    setup({}, { attrs: {}, slots: {}, emit })
    const authWatcher = mockWatch.mock.calls.find(
      (call) => (call[2] as { immediate?: boolean } | undefined)?.immediate,
    ) as unknown[]
    ;(authWatcher[1] as (value: boolean) => void)(false)
    expect(emit).not.toHaveBeenCalled()
  })
})

// ============================================================================
// ResponsiveAppShell Component Tests
// ============================================================================

describe('ResponsiveAppShell components', () => {
  /** ClassMap members the shell family resolves that the shared mock lacks. */
  const shellClassMapMembers = () => {
    mockClassMap.page = 'page-classes'
    mockClassMap.minH = vi.fn((value: string | number) => `min-height-${value}`)
    mockClassMap.h = vi.fn((value: string | number) => `height-${value}`)
    mockClassMap.sp = vi.fn((property: string, scale: string | number) => `${property}-${scale}`)
    mockClassMap.stack = vi.fn((scale: string | number) => `stack-${scale}`)
    mockClassMap.position = vi.fn((value: string) => `position-${value}`)
    mockClassMap.surface = 'surface-classes'
    mockClassMap.borderB = 'border-b-classes'
    mockClassMap.borderT = 'border-t-classes'
    mockClassMap.borderR = 'border-r-classes'
    mockClassMap.shrink0 = 'shrink-0-classes'
    mockClassMap.roundedFull = 'rounded-full-classes'
    mockClassMap.cursorPointer = 'cursor-pointer-classes'
    mockClassMap.textMuted = 'text-muted-classes'
    mockClassMap.overlay = 'overlay-classes'
    mockClassMap.inset0 = 'inset-0-classes'
    mockClassMap.flex1 = 'flex-1-classes'
  }

  /** i18n provider answering every key with its defaultValue, like the kit's. */
  const fakeI18nProvider = {
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
    getLocale: () => 'en',
    getLocales: () => [],
    getDirection: () => 'ltr',
    setLocale: (_code: string) => undefined,
    formatNumber: (value: number) => String(value),
    formatDate: (value: number) => String(value),
    onLocaleChange: (_cb: unknown) => () => undefined,
  }

  const fakeRouter = {
    getLocation: () => ({ pathname: '/', search: '', hash: '', key: 'k0' }),
    getParams: () => ({}),
    getQuery: () => ({}),
    subscribe: (_cb: unknown) => () => undefined,
    navigate: (_to: string) => undefined,
  }

  /**
   * A shell context for the sub-components, with overridable state.
   *
   * @param overrides - Fields to replace on the default context.
   * @returns The context the root would have provided.
   */
  const makeShellContext = (overrides: Record<string, unknown> = {}) => ({
    isDesktop: { value: false },
    sidebarWidthPx: { value: 240 },
    drawerOpen: { value: false },
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    drawerId: 'mol-shell-0',
    hasDrawer: { value: true },
    registerDrawer: vi.fn(),
    ...overrides,
  })

  /**
   * Injection keys of `@molecule/app-vue`, loaded lazily like every other
   * import in this file (a static import would run before the `vi.mock`
   * helpers below it are initialized).
   */
  let i18nKey: symbol | undefined
  let routerKey: symbol | undefined

  /**
   * Points `inject` at the fake i18n provider, router and shell context.
   *
   * @param context - The shell context sub-components inject.
   */
  const stubInjection = (context: Record<string, unknown>): void => {
    mockInject.mockImplementation((key: unknown) => {
      if (key === i18nKey) return fakeI18nProvider
      if (key === routerKey) return fakeRouter
      return context
    })
  }

  const rootBaseProps = {
    sidebarWidth: undefined,
    className: undefined,
    dataMolId: 'shell-root',
  }

  const topBarBaseProps = {
    brand: undefined,
    actions: undefined,
    mobileOnly: false,
    className: undefined,
    dataMolId: 'shell-topbar',
    testId: undefined,
  }

  const sidebarBaseProps = {
    navLabel: undefined,
    footer: undefined,
    className: undefined,
    dataMolId: 'shell-sidebar',
    testId: undefined,
  }

  const drawerBaseProps = {
    header: undefined,
    navLabel: undefined,
    footer: undefined,
    showCloseButton: true,
    className: undefined,
    dataMolId: 'shell-drawer',
    closeDataMolId: 'shell-drawer-close',
    testId: undefined,
  }

  const contentBaseProps = {
    className: undefined,
    style: undefined,
    dataMolId: 'shell-content',
    testId: undefined,
  }

  /**
   * Runs one component's setup and render against a shell context.
   *
   * @param component - The component definition.
   * @param props - Full props (defaults filled in, Vue prop resolution bypassed).
   * @param context - The injected shell context.
   * @param slots - Component slots.
   * @param attrs - Fallthrough attrs.
   * @returns Whatever setup returned (the render function).
   */
  const renderShellPart = (
    component: unknown,
    props: Record<string, unknown>,
    context: Record<string, unknown> = makeShellContext(),
    slots: Record<string, () => unknown> = {},
    attrs: Record<string, unknown> = {},
  ) => {
    stubInjection(context)
    const setup = (component as { setup: (...args: unknown[]) => (...args: unknown[]) => unknown })
      .setup
    mockH.mockClear()
    const renderFn = setup({ ...props }, { attrs, emit: vi.fn(), slots })
    renderFn()
    return renderFn
  }

  beforeEach(async () => {
    shellClassMapMembers()
    const keys = (await import('@molecule/app-vue')) as unknown as {
      I18nKey: symbol
      RouterKey: symbol
    }
    i18nKey = keys.I18nKey
    routerKey = keys.RouterKey
  })

  describe('root', () => {
    it('should be defined with correct name and no attr inheritance', async () => {
      const { ResponsiveAppShell } = await import('../components/ResponsiveAppShell.js')
      expect(ResponsiveAppShell).toBeDefined()
      expect(ResponsiveAppShell.name).toBe('MResponsiveAppShell')
      expect(ResponsiveAppShell.inheritAttrs).toBe(false)
    })

    it('should declare React-named props with the documented defaults', async () => {
      const { ResponsiveAppShell } = await import('../components/ResponsiveAppShell.js')
      const props = ResponsiveAppShell.props as Record<string, { default?: unknown }>
      expect(props).toHaveProperty('sidebarWidth')
      expect(props).toHaveProperty('className')
      expect(props.dataMolId.default).toBe('shell-root')
    })

    it('renders the root container with page canvas classes and column direction below the breakpoint', async () => {
      const { ResponsiveAppShell } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShell, rootBaseProps, undefined, { default: () => ['page'] })
      const rootCall = mockH.mock.calls.find((call) => call[0] === 'div')
      expect(rootCall).toBeDefined()
      expect(rootCall![1].class).toContain('flex-layout')
      expect(rootCall![1].class).toContain('page-classes')
      expect(rootCall![1].class).toContain('min-height-screen')
      expect(rootCall![1].style).toEqual({ flexDirection: 'column' })
      expect(rootCall![1]['data-mol-id']).toBe('shell-root')
      expect(rootCall![2]).toEqual(['page'])
    })

    it('renders row direction on desktop', async () => {
      const { ResponsiveAppShell } = await import('../components/ResponsiveAppShell.js')
      const renderFn = renderShellPart(ResponsiveAppShell, rootBaseProps)
      // The provided context captures the isDesktop ref; flip it and re-render.
      const provided = mockProvide.mock.calls.at(-1)![1] as { isDesktop: { value: boolean } }
      provided.isDesktop.value = true
      renderFn()
      const rootCall = mockH.mock.calls.filter((call) => call[0] === 'div').at(-1)!
      expect(rootCall[1].style).toEqual({ flexDirection: 'row' })
    })

    it('applies className and dataMolId overrides on the root', async () => {
      const { ResponsiveAppShell } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShell, {
        ...rootBaseProps,
        className: 'parity-token',
        dataMolId: 'the-shell',
      })
      const rootCall = mockH.mock.calls.find((call) => call[0] === 'div')
      expect(rootCall![1].class).toContain('parity-token')
      expect(rootCall![1]['data-mol-id']).toBe('the-shell')
    })

    it('provides the shell context with drawer state and a stable unique id', async () => {
      const { ResponsiveAppShell } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShell, rootBaseProps)
      expect(mockProvide).toHaveBeenCalledTimes(1)
      const [key, ctx] = mockProvide.mock.calls[0] as [symbol, Record<string, unknown>]
      expect(typeof key).toBe('symbol')
      expect(ctx.drawerId as string).toMatch(/^mol-shell-\d+$/)
      expect(typeof ctx.openDrawer).toBe('function')
      expect(typeof ctx.closeDrawer).toBe('function')
      const hasDrawer = ctx.hasDrawer as { value: boolean }
      const registerDrawer = ctx.registerDrawer as (present: boolean) => void
      registerDrawer(true)
      expect(hasDrawer.value).toBe(true)
      registerDrawer(false)
      expect(hasDrawer.value).toBe(false)
    })

    it('resolves the sidebar width presets to pixels', async () => {
      const { ResponsiveAppShell } = await import('../components/ResponsiveAppShell.js')
      const widthFor = async (sidebarWidth: string | number | undefined): Promise<number> => {
        renderShellPart(ResponsiveAppShell, { ...rootBaseProps, sidebarWidth })
        const ctx = mockProvide.mock.calls.at(-1)![1] as { sidebarWidthPx: { value: number } }
        return ctx.sidebarWidthPx.value
      }
      expect(await widthFor(undefined)).toBe(240)
      expect(await widthFor('sm')).toBe(208)
      expect(await widthFor('md')).toBe(240)
      expect(await widthFor('lg')).toBe(256)
      expect(await widthFor(300)).toBe(300)
    })

    it('closes the drawer when the route key changes or the viewport crosses to desktop', async () => {
      const { ResponsiveAppShell } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShell, rootBaseProps)
      const ctx = mockProvide.mock.calls[0][1] as {
        drawerOpen: { value: boolean }
        isDesktop: { value: boolean }
      }
      const watchers = mockWatch.mock.calls as unknown[]
      expect(watchers).toHaveLength(2)
      ctx.drawerOpen.value = true
      ;(watchers[0] as unknown[])[1]() // location.key watcher callback
      expect(ctx.drawerOpen.value).toBe(false)
      ctx.drawerOpen.value = true
      ;(watchers[1] as unknown[])[1](true) // isDesktop watcher callback
      expect(ctx.drawerOpen.value).toBe(false)
      ;(watchers[1] as unknown[])[1](false) // staying mobile keeps it open
      expect(ctx.drawerOpen.value).toBe(false)
    })
  })

  describe('TopBar', () => {
    it('should be defined with correct name and props', async () => {
      const { ResponsiveAppShellTopBar } = await import('../components/ResponsiveAppShell.js')
      expect(ResponsiveAppShellTopBar.name).toBe('MResponsiveAppShellTopBar')
      const props = ResponsiveAppShellTopBar.props as Record<string, { default?: unknown }>
      expect(props).toHaveProperty('brand')
      expect(props).toHaveProperty('actions')
      expect(props.mobileOnly.default).toBe(false)
      expect(props.dataMolId.default).toBe('shell-topbar')
      expect(props).toHaveProperty('testId')
    })

    it('renders the header landmark with sticky offsets', async () => {
      const { ResponsiveAppShellTopBar } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShellTopBar, topBarBaseProps, {
        ...makeShellContext({ isDesktop: { value: true } }),
      })
      const headerCall = mockH.mock.calls.find((call) => call[0] === 'header')
      expect(headerCall).toBeDefined()
      expect(headerCall![1].class).toContain('justify-between')
      expect(headerCall![1].class).toContain('px-4')
      expect(headerCall![1].class).toContain('height-14')
      expect(headerCall![1].class).toContain('position-sticky')
      expect(headerCall![1].style).toEqual({ top: 0, zIndex: 20 })
      expect(headerCall![1]['data-mol-id']).toBe('shell-topbar')
    })

    it('shows the menu trigger on mobile only when a drawer is composed', async () => {
      const { ResponsiveAppShellTopBar } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShellTopBar, topBarBaseProps, makeShellContext())
      const trigger = mockH.mock.calls.find(
        (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'shell-drawer-open',
      )
      expect(trigger).toBeDefined()
      expect(trigger![1]['aria-label']).toBe('Open navigation menu')
      expect(trigger![1]['aria-expanded']).toBe(false)
      expect(trigger![1]['aria-controls']).toBe('mol-shell-0')
      expect(trigger![1].style).toEqual({ width: '44px', height: '44px' })
      expect(trigger![1].class).toContain('cursor-pointer-classes')

      renderShellPart(ResponsiveAppShellTopBar, topBarBaseProps, {
        ...makeShellContext({ isDesktop: { value: true } }),
      })
      expect(
        mockH.mock.calls.find(
          (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'shell-drawer-open',
        ),
      ).toBeUndefined()
    })

    it('composes no trigger when the shell has no drawer', async () => {
      const { ResponsiveAppShellTopBar } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShellTopBar, topBarBaseProps, {
        ...makeShellContext({ hasDrawer: { value: false } }),
      })
      expect(mockH.mock.calls.find((call) => call[0] === 'button')).toBeUndefined()
    })

    it('renders nothing when mobileOnly on desktop', async () => {
      const { ResponsiveAppShellTopBar } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(
        ResponsiveAppShellTopBar,
        { ...topBarBaseProps, mobileOnly: true },
        {
          ...makeShellContext({ isDesktop: { value: true } }),
        },
      )
      expect(mockH).not.toHaveBeenCalled()
    })

    it('renders brand and actions from props or slots', async () => {
      const { ResponsiveAppShellTopBar } = await import('../components/ResponsiveAppShell.js')
      const brandNode = { __vnode: true }
      const actionsNode = { __vnode: true }
      renderShellPart(
        ResponsiveAppShellTopBar,
        { ...topBarBaseProps, brand: brandNode },
        makeShellContext(),
        { actions: () => actionsNode },
      )
      const brandWrap = mockH.mock.calls.find(
        (call) => call[0] === 'div' && call[1]?.style?.minWidth === 0 && call[2] === brandNode,
      )
      expect(brandWrap).toBeDefined()
      const actionsWrap = mockH.mock.calls.find(
        (call) => call[0] === 'div' && call[2] === actionsNode,
      )
      expect(actionsWrap).toBeDefined()
      expect(actionsWrap![1].class).toContain('shrink-0-classes')
    })

    it('applies className, dataMolId and testId overrides', async () => {
      const { ResponsiveAppShellTopBar } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(
        ResponsiveAppShellTopBar,
        { ...topBarBaseProps, className: 'parity-token', dataMolId: 'bar', testId: 'bar' },
        { ...makeShellContext({ isDesktop: { value: true } }) },
      )
      const headerCall = mockH.mock.calls.find((call) => call[0] === 'header')
      expect(headerCall![1].class).toContain('parity-token')
      expect(headerCall![1]['data-mol-id']).toBe('bar')
      expect(headerCall![1]['data-testid']).toBe('bar')
    })

    it('trigger click opens the drawer', async () => {
      const { ResponsiveAppShellTopBar } = await import('../components/ResponsiveAppShell.js')
      const context = makeShellContext()
      renderShellPart(ResponsiveAppShellTopBar, topBarBaseProps, context)
      const trigger = mockH.mock.calls.find(
        (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'shell-drawer-open',
      )
      ;(trigger![1].onClick as () => void)()
      expect(context.openDrawer).toHaveBeenCalledTimes(1)
    })
  })

  describe('Sidebar', () => {
    it('should be defined with correct name and props', async () => {
      const { ResponsiveAppShellSidebar } = await import('../components/ResponsiveAppShell.js')
      expect(ResponsiveAppShellSidebar.name).toBe('MResponsiveAppShellSidebar')
      const props = ResponsiveAppShellSidebar.props as Record<string, { default?: unknown }>
      expect(props).toHaveProperty('navLabel')
      expect(props).toHaveProperty('footer')
      expect(props.dataMolId.default).toBe('shell-sidebar')
      expect(props).toHaveProperty('testId')
    })

    it('renders nothing below the breakpoint', async () => {
      const { ResponsiveAppShellSidebar } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShellSidebar, sidebarBaseProps, makeShellContext())
      expect(mockH).not.toHaveBeenCalled()
    })

    it('renders the aside and nav landmarks with pixel width on desktop', async () => {
      const { ResponsiveAppShellSidebar } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(
        ResponsiveAppShellSidebar,
        sidebarBaseProps,
        { ...makeShellContext({ isDesktop: { value: true } }) },
        { default: () => ['nav'] },
      )
      const asideCall = mockH.mock.calls.find((call) => call[0] === 'aside')
      expect(asideCall![1].class).toContain('dir-col')
      expect(asideCall![1].class).toContain('surface-classes')
      expect(asideCall![1].class).toContain('border-r-classes')
      expect(asideCall![1].class).toContain('height-screen')
      expect(asideCall![1].style).toEqual({ top: 0, width: '240px', overflowY: 'auto' })
      const navCall = mockH.mock.calls.find((call) => call[0] === 'nav')
      expect(navCall![1]['aria-label']).toBe('Primary navigation')
      expect(navCall![1].class).toContain('flex-1-classes')
      expect(navCall![1].class).toContain('stack-1')
      expect(navCall![2]).toEqual(['nav'])
    })

    it('uses a custom nav label', async () => {
      const { ResponsiveAppShellSidebar } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(
        ResponsiveAppShellSidebar,
        { ...sidebarBaseProps, navLabel: 'Main menu' },
        { ...makeShellContext({ isDesktop: { value: true } }) },
      )
      expect(mockH.mock.calls.find((call) => call[0] === 'nav')![1]['aria-label']).toBe('Main menu')
    })

    it('renders the footer slot in a bordered row after the nav', async () => {
      const { ResponsiveAppShellSidebar } = await import('../components/ResponsiveAppShell.js')
      const footerNode = { __vnode: true }
      renderShellPart(
        ResponsiveAppShellSidebar,
        sidebarBaseProps,
        { ...makeShellContext({ isDesktop: { value: true } }) },
        { footer: () => footerNode },
      )
      const footerRow = mockH.mock.calls.find((call) => call[0] === 'div' && call[2] === footerNode)
      expect(footerRow).toBeDefined()
      expect(footerRow![1].class).toContain('border-t-classes')
      expect(footerRow![1].class).toContain('p-3')
    })

    it('applies className, dataMolId and testId overrides', async () => {
      const { ResponsiveAppShellSidebar } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(
        ResponsiveAppShellSidebar,
        { ...sidebarBaseProps, className: 'parity-token', dataMolId: 'side-rail', testId: 'rail' },
        { ...makeShellContext({ isDesktop: { value: true } }) },
      )
      const asideCall = mockH.mock.calls.find((call) => call[0] === 'aside')
      expect(asideCall![1].class).toContain('parity-token')
      expect(asideCall![1]['data-mol-id']).toBe('side-rail')
      expect(asideCall![1]['data-testid']).toBe('rail')
    })
  })

  describe('Drawer', () => {
    it('should be defined with correct name and props', async () => {
      const { ResponsiveAppShellDrawer } = await import('../components/ResponsiveAppShell.js')
      expect(ResponsiveAppShellDrawer.name).toBe('MResponsiveAppShellDrawer')
      const props = ResponsiveAppShellDrawer.props as Record<string, { default?: unknown }>
      expect(props).toHaveProperty('header')
      expect(props).toHaveProperty('navLabel')
      expect(props).toHaveProperty('footer')
      expect(props.showCloseButton.default).toBe(true)
      expect(props.dataMolId.default).toBe('shell-drawer')
      expect(props.closeDataMolId.default).toBe('shell-drawer-close')
      expect(props).toHaveProperty('testId')
    })

    it('registers itself with the shell on mount and unmount', async () => {
      const { ResponsiveAppShellDrawer } = await import('../components/ResponsiveAppShell.js')
      const context = makeShellContext()
      stubInjection(context)
      mockOnMounted.mockClear()
      mockOnUnmounted.mockClear()
      ;(ResponsiveAppShellDrawer.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { ...drawerBaseProps },
        {
          attrs: {},
          emit: vi.fn(),
          slots: {},
        },
      )
      ;(mockOnMounted.mock.calls.at(-1)![0] as () => void)()
      expect(context.registerDrawer).toHaveBeenCalledWith(true)
      // Every unmount hook runs on teardown (registration + dialog cleanup).
      for (const call of mockOnUnmounted.mock.calls) (call[0] as () => void)()
      expect(context.registerDrawer).toHaveBeenCalledWith(false)
    })

    it('renders nothing while closed on mobile', async () => {
      const { ResponsiveAppShellDrawer } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShellDrawer, drawerBaseProps, makeShellContext())
      expect(mockH).not.toHaveBeenCalled()
    })

    it('renders nothing on desktop even when logically open', async () => {
      const { ResponsiveAppShellDrawer } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShellDrawer, drawerBaseProps, {
        ...makeShellContext({ drawerOpen: { value: true }, isDesktop: { value: true } }),
      })
      expect(mockH).not.toHaveBeenCalled()
    })

    /**
     * Renders the drawer open on mobile. `document` is stubbed because the
     * render guard mirrors React's SSR check (`typeof document`).
     *
     * @param extraProps - Drawer props to override.
     * @param overrides - Shell context overrides.
     * @param slots - Drawer slots.
     * @returns The shell context used.
     */
    const renderOpenDrawer = async (
      extraProps: Record<string, unknown> = {},
      overrides: Record<string, unknown> = {},
      slots: Record<string, () => unknown> = {},
    ) => {
      const { ResponsiveAppShellDrawer } = await import('../components/ResponsiveAppShell.js')
      const context = makeShellContext({
        drawerOpen: { value: true },
        isDesktop: { value: false },
        ...overrides,
      })
      vi.stubGlobal('document', {})
      renderShellPart(ResponsiveAppShellDrawer, { ...drawerBaseProps, ...extraProps }, context, {
        default: () => ['nav'],
        ...slots,
      })
      vi.unstubAllGlobals()
      return context
    }

    it('while open on mobile, teleports backdrop and wrapper to the body', async () => {
      await renderOpenDrawer()
      const teleportCall = mockH.mock.calls.find((call) => call[0] === 'Teleport')
      expect(teleportCall![1]).toEqual({ to: 'body' })
      const overlay = mockH.mock.calls.find((call) => call[1]?.class === 'overlay-classes')
      expect(overlay![1]['aria-hidden']).toBe('true')
      const wrapper = mockH.mock.calls.find(
        (call) => call[1]?.class === 'position-fixed inset-0-classes',
      )
      expect(wrapper![1].style).toEqual({ zIndex: 41 })
    })

    it('renders the dialog panel with the APG dialog wiring', async () => {
      await renderOpenDrawer()
      const panel = mockH.mock.calls.find((call) => call[1]?.role === 'dialog')
      expect(panel).toBeDefined()
      expect(panel![1].id).toBe('mol-shell-0')
      expect(panel![1]['aria-modal']).toBe('true')
      expect(panel![1]['aria-label']).toBe('Primary navigation')
      expect(panel![1].tabindex).toBe(-1)
      expect(panel![1].class).toContain('dir-col')
      expect(panel![1].class).toContain('surface-classes')
      expect(panel![1].style).toEqual({ width: '240px', maxWidth: '85vw', overflowY: 'auto' })
      expect(panel![1]['data-mol-id']).toBe('shell-drawer')
    })

    it('renders the close button with its label and id defaults', async () => {
      await renderOpenDrawer()
      const close = mockH.mock.calls.find(
        (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'shell-drawer-close',
      )
      expect(close).toBeDefined()
      expect(close![1]['aria-label']).toBe('Close navigation menu')
      expect(close![1].class).toContain('width-10')
      expect(close![1].class).toContain('height-10')
      expect(close![1].class).toContain('text-muted-classes')
    })

    it('uses a custom nav label on dialog and nav', async () => {
      await renderOpenDrawer({ navLabel: 'Main menu' })
      const panel = mockH.mock.calls.find((call) => call[1]?.role === 'dialog')
      expect(panel![1]['aria-label']).toBe('Main menu')
      const nav = mockH.mock.calls.find((call) => call[0] === 'nav')
      expect(nav![1]['aria-label']).toBe('Main menu')
    })

    it('without a header the header row holds an aria-hidden placeholder', async () => {
      await renderOpenDrawer()
      const span = mockH.mock.calls.find((call) => call[0] === 'span')
      expect(span![1]['aria-hidden']).toBe('true')
    })

    it('renders the header node in a shrinkable wrapper and can drop the close button', async () => {
      const headerNode = { __vnode: true }
      await renderOpenDrawer({ showCloseButton: false }, {}, { header: () => headerNode })
      expect(
        mockH.mock.calls.find(
          (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'shell-drawer-close',
        ),
      ).toBeUndefined()
      const headerWrap = mockH.mock.calls.find(
        (call) => call[0] === 'div' && call[2] === headerNode,
      )
      expect(headerWrap).toBeDefined()
      expect(headerWrap![1].style).toEqual({ minWidth: 0 })
    })

    it('renders the footer slot after the nav', async () => {
      const footerNode = { __vnode: true }
      await renderOpenDrawer({}, {}, { footer: () => footerNode })
      const footerRow = mockH.mock.calls.find((call) => call[0] === 'div' && call[2] === footerNode)
      expect(footerRow![1].class).toContain('border-t-classes')
      expect(footerRow![1].class).toContain('dir-col')
    })

    it('applies panel id, className and testId overrides', async () => {
      await renderOpenDrawer({
        className: 'parity-token',
        dataMolId: 'nav-drawer',
        closeDataMolId: 'nav-drawer-x',
        testId: 'nav-drawer',
      })
      const panel = mockH.mock.calls.find((call) => call[1]?.role === 'dialog')
      expect(panel![1].class).toContain('parity-token')
      expect(panel![1]['data-mol-id']).toBe('nav-drawer')
      expect(panel![1]['data-testid']).toBe('nav-drawer')
      expect(
        mockH.mock.calls.find(
          (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'nav-drawer-x',
        ),
      ).toBeDefined()
    })

    it('backdrop click closes only when the wrapper itself is the target', async () => {
      const context = await renderOpenDrawer()
      const wrapper = mockH.mock.calls.find(
        (call) => call[1]?.class === 'position-fixed inset-0-classes',
      )
      ;(wrapper![1].onClick as (e: unknown) => void)({ target: 'inner', currentTarget: 'self' })
      expect(context.closeDrawer).not.toHaveBeenCalled()
      ;(wrapper![1].onClick as (e: unknown) => void)({ target: 'self', currentTarget: 'self' })
      expect(context.closeDrawer).toHaveBeenCalledTimes(1)
    })

    it('panel clicks stop propagation and the close button closes', async () => {
      const context = await renderOpenDrawer()
      const panel = mockH.mock.calls.find((call) => call[1]?.role === 'dialog')
      const event = { type: 'click', stopPropagation: vi.fn() }
      ;(panel![1].onClick as (e: unknown) => void)(event)
      expect(event.stopPropagation).toHaveBeenCalledTimes(1)
      const close = mockH.mock.calls.find(
        (call) => call[0] === 'button' && call[1]?.['data-mol-id'] === 'shell-drawer-close',
      )
      ;(close![1].onClick as () => void)()
      expect(context.closeDrawer).toHaveBeenCalledTimes(1)
    })

    it('watches the open transition with post-flush watchers', async () => {
      const { ResponsiveAppShellDrawer } = await import('../components/ResponsiveAppShell.js')
      stubInjection(makeShellContext())
      mockWatch.mockClear()
      ;(ResponsiveAppShellDrawer.setup as (...args: unknown[]) => (...args: unknown[]) => unknown)(
        { ...drawerBaseProps },
        {
          attrs: {},
          emit: vi.fn(),
          slots: {},
        },
      )
      const postWatchers = mockWatch.mock.calls.filter(
        (call) => (call[2] as { flush?: string } | undefined)?.flush === 'post',
      )
      expect(postWatchers).toHaveLength(3)
    })
  })

  describe('Content', () => {
    it('should be defined with correct name and props', async () => {
      const { ResponsiveAppShellContent } = await import('../components/ResponsiveAppShell.js')
      expect(ResponsiveAppShellContent.name).toBe('MResponsiveAppShellContent')
      const props = ResponsiveAppShellContent.props as Record<string, { default?: unknown }>
      expect(props).toHaveProperty('className')
      expect(props).toHaveProperty('style')
      expect(props.dataMolId.default).toBe('shell-content')
      expect(props).toHaveProperty('testId')
    })

    it('renders the main landmark with minWidth 0 and the default slot', async () => {
      const { ResponsiveAppShellContent } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShellContent, contentBaseProps, undefined, {
        default: () => ['Routed page'],
      })
      const mainCall = mockH.mock.calls.find((call) => call[0] === 'main')
      expect(mainCall![1].class).toContain('flex-1-classes')
      expect(mainCall![1].style).toEqual({ minWidth: 0 })
      expect(mainCall![1]['data-mol-id']).toBe('shell-content')
      expect(mainCall![2]).toEqual(['Routed page'])
    })

    it('merges the consumer style over minWidth 0', async () => {
      const { ResponsiveAppShellContent } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShellContent, {
        ...contentBaseProps,
        style: { padding: '16px' },
      })
      const mainCall = mockH.mock.calls.find((call) => call[0] === 'main')
      expect(mainCall![1].style).toEqual([{ minWidth: 0 }, { padding: '16px' }])
    })

    it('applies className, dataMolId and testId overrides', async () => {
      const { ResponsiveAppShellContent } = await import('../components/ResponsiveAppShell.js')
      renderShellPart(ResponsiveAppShellContent, {
        ...contentBaseProps,
        className: 'parity-token',
        dataMolId: 'page',
        testId: 'page',
      })
      const mainCall = mockH.mock.calls.find((call) => call[0] === 'main')
      expect(mainCall![1].class).toContain('parity-token')
      expect(mainCall![1]['data-mol-id']).toBe('page')
      expect(mainCall![1]['data-testid']).toBe('page')
    })
  })

  describe('useIsDesktop', () => {
    it('returns a ref that starts false without window.matchMedia', async () => {
      const { useIsDesktop } = await import('../components/ResponsiveAppShell.js')
      const isDesktop = useIsDesktop() as { value: boolean }
      expect(isDesktop.value).toBe(false)
    })

    it('reads the query synchronously and subscribes on mount', async () => {
      const { useIsDesktop } = await import('../components/ResponsiveAppShell.js')
      const matchMedia = vi.fn(() => ({ matches: true }))
      vi.stubGlobal('window', { matchMedia })
      const isDesktop = useIsDesktop('(min-width: 768px)') as { value: boolean }
      expect(matchMedia).toHaveBeenCalledWith('(min-width: 768px)')
      expect(isDesktop.value).toBe(true)
      expect(mockOnMounted).toHaveBeenCalled()
      expect(mockOnUnmounted).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })
  })
})
