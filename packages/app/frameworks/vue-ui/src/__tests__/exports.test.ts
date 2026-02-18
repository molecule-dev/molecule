/**
 * Tests for the package's exported API surface.
 *
 * Verifies all expected components, types, and utilities are properly exported
 * from the main index.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

// ============================================================================
// Mock Vue
// ============================================================================

vi.mock('vue', () => ({
  defineComponent: vi.fn((opts: Record<string, unknown>) => opts),
  h: vi.fn(),
  ref: vi.fn((val: unknown) => ({ value: val })),
  computed: vi.fn((fn: () => unknown) => ({ value: fn() })),
  watch: vi.fn(),
  onMounted: vi.fn(),
  onUnmounted: vi.fn(),
  provide: vi.fn(),
  inject: vi.fn(),
  reactive: vi.fn((obj: unknown) => obj),
  Teleport: 'Teleport',
}))

// ============================================================================
// Mock @molecule/app-ui with getClassMap
// ============================================================================

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
    button: () => '',
    input: () => '',
    textarea: () => '',
    select: () => '',
    checkbox: () => '',
    radio: () => '',
    switchBase: () => '',
    switchThumb: () => '',
    label: () => '',
    formError: '',
    formHint: '',
    card: () => '',
    cardHeader: '',
    cardTitle: '',
    cardDescription: '',
    cardContent: '',
    cardFooter: '',
    badge: () => '',
    alert: () => '',
    alertTitle: '',
    alertDescription: '',
    avatar: () => '',
    avatarImage: '',
    avatarFallback: '',
    modal: () => '',
    dialogOverlay: '',
    dialogHeader: '',
    dialogFooter: '',
    dialogTitle: '',
    dialogDescription: '',
    dialogClose: '',
    spinner: () => '',
    separator: () => '',
    progress: () => '',
    progressBar: () => '',
    skeleton: () => '',
    toast: () => '',
    toastTitle: '',
    toastDescription: '',
    toastClose: '',
    toastViewport: '',
    toastAction: '',
    tooltip: () => '',
    tooltipContent: '',
    accordion: () => '',
    accordionRoot: '',
    accordionItem: '',
    accordionContent: '',
    accordionContentInner: '',
    pagination: () => '',
    paginationRoot: '',
    paginationContent: '',
    paginationLink: '',
    paginationPrevious: '',
    paginationNext: '',
    paginationEllipsis: '',
    dropdownContent: '',
    dropdownItem: '',
    dropdownSeparator: '',
    dropdownLabel: '',
    table: '',
    tableHeader: '',
    tableBody: '',
    tableFooter: '',
    tableRow: '',
    tableHead: '',
    tableCell: '',
    tableCaption: '',
    tabsList: '',
    tabsTrigger: '',
    tabsContent: '',
    container: () => '',
    flex: () => '',
    grid: () => '',
    center: '',
    srOnly: '',
    notSrOnly: '',
  }),
}))

// ============================================================================
// Tests
// ============================================================================

describe('package exports', () => {
  it('should export cn utility', async () => {
    const exports = await import('../index.js')
    expect(exports.cn).toBeDefined()
    expect(typeof exports.cn).toBe('function')
  })

  it('should export Button component', async () => {
    const exports = await import('../index.js')
    expect(exports.Button).toBeDefined()
  })

  it('should export Input component', async () => {
    const exports = await import('../index.js')
    expect(exports.Input).toBeDefined()
  })

  it('should export Textarea component', async () => {
    const exports = await import('../index.js')
    expect(exports.Textarea).toBeDefined()
  })

  it('should export Select component', async () => {
    const exports = await import('../index.js')
    expect(exports.Select).toBeDefined()
  })

  it('should export Checkbox component', async () => {
    const exports = await import('../index.js')
    expect(exports.Checkbox).toBeDefined()
  })

  it('should export RadioGroup component', async () => {
    const exports = await import('../index.js')
    expect(exports.RadioGroup).toBeDefined()
  })

  it('should export Switch component', async () => {
    const exports = await import('../index.js')
    expect(exports.Switch).toBeDefined()
  })

  it('should export Modal component', async () => {
    const exports = await import('../index.js')
    expect(exports.Modal).toBeDefined()
  })

  it('should export Spinner component', async () => {
    const exports = await import('../index.js')
    expect(exports.Spinner).toBeDefined()
  })

  it('should export Avatar component', async () => {
    const exports = await import('../index.js')
    expect(exports.Avatar).toBeDefined()
  })

  it('should export Badge component', async () => {
    const exports = await import('../index.js')
    expect(exports.Badge).toBeDefined()
  })

  it('should export Alert component', async () => {
    const exports = await import('../index.js')
    expect(exports.Alert).toBeDefined()
  })

  it('should export Card components', async () => {
    const exports = await import('../index.js')
    expect(exports.Card).toBeDefined()
    expect(exports.CardHeader).toBeDefined()
    expect(exports.CardTitle).toBeDefined()
    expect(exports.CardDescription).toBeDefined()
    expect(exports.CardContent).toBeDefined()
    expect(exports.CardFooter).toBeDefined()
  })

  it('should export Tabs component', async () => {
    const exports = await import('../index.js')
    expect(exports.Tabs).toBeDefined()
  })

  it('should export Table component', async () => {
    const exports = await import('../index.js')
    expect(exports.Table).toBeDefined()
  })

  it('should export Tooltip component', async () => {
    const exports = await import('../index.js')
    expect(exports.Tooltip).toBeDefined()
  })

  it('should export Progress component', async () => {
    const exports = await import('../index.js')
    expect(exports.Progress).toBeDefined()
  })

  it('should export Skeleton components', async () => {
    const exports = await import('../index.js')
    expect(exports.Skeleton).toBeDefined()
    expect(exports.SkeletonText).toBeDefined()
    expect(exports.SkeletonCircle).toBeDefined()
  })

  it('should export Layout components', async () => {
    const exports = await import('../index.js')
    expect(exports.Container).toBeDefined()
    expect(exports.Flex).toBeDefined()
    expect(exports.Grid).toBeDefined()
    expect(exports.Spacer).toBeDefined()
  })

  it('should export Separator component', async () => {
    const exports = await import('../index.js')
    expect(exports.Separator).toBeDefined()
  })

  it('should export Form components', async () => {
    const exports = await import('../index.js')
    expect(exports.Form).toBeDefined()
    expect(exports.FormField).toBeDefined()
    expect(exports.Label).toBeDefined()
  })

  it('should export Toast components', async () => {
    const exports = await import('../index.js')
    expect(exports.Toast).toBeDefined()
    expect(exports.ToastContainer).toBeDefined()
    expect(exports.ToastProvider).toBeDefined()
    expect(exports.useToast).toBeDefined()
  })

  it('should export Accordion component', async () => {
    const exports = await import('../index.js')
    expect(exports.Accordion).toBeDefined()
  })

  it('should export Pagination component', async () => {
    const exports = await import('../index.js')
    expect(exports.Pagination).toBeDefined()
  })

  it('should export Dropdown components', async () => {
    const exports = await import('../index.js')
    expect(exports.Dropdown).toBeDefined()
    expect(exports.DropdownLabel).toBeDefined()
    expect(exports.DropdownSeparator).toBeDefined()
  })
})
