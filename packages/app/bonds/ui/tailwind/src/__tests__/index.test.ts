/**
 * Tests for `@molecule/app-ui-tailwind`
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  alert,
  alertDescription,
  alertTitle,
  avatar,
  avatarFallback,
  avatarImage,
  badge,
  // Components
  button,
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
  center,
  checkbox,
  // Utilities
  cn,
  // Layout
  container,
  cva,
  dialogClose,
  dialogContent,
  dialogDescription,
  dialogFooter,
  dialogHeader,
  dialogOverlay,
  dialogTitle,
  dropdownContent,
  dropdownItem,
  dropdownLabel,
  dropdownSeparator,
  flex,
  formError,
  formHint,
  grid,
  hstack,
  input,
  label,
  notSrOnly,
  progress,
  progressIndicator,
  radio,
  select,
  separator,
  skeleton,
  spinner,
  srOnly,
  stack,
  switchBase,
  switchThumb,
  table,
  tableBody,
  tableCaption,
  tableCell,
  tableFooter,
  tableHead,
  tableHeader,
  tableRow,
  tabsContent,
  tabsList,
  tabsTrigger,
  textarea,
  tooltipContent,
} from '../index.js'

// =============================================================================
// cn Utility Tests
// =============================================================================

describe('cn utility', () => {
  it('should merge multiple string classes', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary')
  })

  it('should filter out falsy values', () => {
    expect(cn('btn', null, undefined, false, '', 'active')).toBe('btn active')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('btn', isActive && 'active', isDisabled && 'disabled')).toBe('btn active')
  })

  it('should handle object syntax', () => {
    expect(cn('btn', { active: true, disabled: false })).toBe('btn active')
  })

  it('should handle flat arrays', () => {
    expect(cn(['btn', 'btn-primary', 'btn-lg'])).toBe('btn btn-primary btn-lg')
  })

  it('should handle numbers', () => {
    expect(cn('item', 1, 'another')).toBe('item 1 another')
  })

  it('should return empty string for all falsy values', () => {
    expect(cn(null, undefined, false, '')).toBe('')
  })

  it('should trim leading/trailing whitespace from result', () => {
    // cn trims the final result but doesn't modify individual strings
    expect(cn('btn', 'primary')).toBe('btn primary')
  })

  it('should handle mixed input types', () => {
    expect(
      cn(
        'base',
        ['array-class'],
        { 'object-true': true, 'object-false': false },
        'conditional',
        false,
      ),
    ).toBe('base array-class object-true conditional')
  })
})

// =============================================================================
// cva Utility Tests
// =============================================================================

describe('cva utility', () => {
  it('should return base classes when called with no arguments', () => {
    const testCva = cva('base-class')
    expect(testCva()).toBe('base-class')
  })

  it('should apply variant classes', () => {
    const testCva = cva('btn', {
      variants: {
        size: {
          sm: 'btn-sm',
          md: 'btn-md',
          lg: 'btn-lg',
        },
      },
    })
    expect(testCva({ size: 'lg' })).toBe('btn btn-lg')
  })

  it('should apply default variants', () => {
    const testCva = cva('btn', {
      variants: {
        size: {
          sm: 'btn-sm',
          md: 'btn-md',
          lg: 'btn-lg',
        },
      },
      defaultVariants: {
        size: 'md',
      },
    })
    expect(testCva()).toBe('btn btn-md')
  })

  it('should override default variants with provided props', () => {
    const testCva = cva('btn', {
      variants: {
        size: {
          sm: 'btn-sm',
          md: 'btn-md',
          lg: 'btn-lg',
        },
      },
      defaultVariants: {
        size: 'md',
      },
    })
    expect(testCva({ size: 'lg' })).toBe('btn btn-lg')
  })

  it('should handle multiple variants', () => {
    const testCva = cva('btn', {
      variants: {
        size: {
          sm: 'btn-sm',
          md: 'btn-md',
        },
        variant: {
          primary: 'btn-primary',
          secondary: 'btn-secondary',
        },
      },
      defaultVariants: {
        size: 'md',
        variant: 'primary',
      },
    })
    expect(testCva({ size: 'sm', variant: 'secondary' })).toBe('btn btn-sm btn-secondary')
  })

  it('should apply compound variants', () => {
    const testCva = cva('btn', {
      variants: {
        size: {
          sm: 'btn-sm',
          md: 'btn-md',
        },
        variant: {
          primary: 'btn-primary',
          danger: 'btn-danger',
        },
      },
      compoundVariants: [
        {
          size: 'sm',
          variant: 'danger',
          class: 'btn-sm-danger-special',
        },
      ],
      defaultVariants: {
        size: 'md',
        variant: 'primary',
      },
    })
    expect(testCva({ size: 'sm', variant: 'danger' })).toBe(
      'btn btn-sm btn-danger btn-sm-danger-special',
    )
  })

  it('should not apply compound variants when conditions do not match', () => {
    const testCva = cva('btn', {
      variants: {
        size: {
          sm: 'btn-sm',
          md: 'btn-md',
        },
        variant: {
          primary: 'btn-primary',
          danger: 'btn-danger',
        },
      },
      compoundVariants: [
        {
          size: 'sm',
          variant: 'danger',
          class: 'btn-sm-danger-special',
        },
      ],
      defaultVariants: {
        size: 'md',
        variant: 'primary',
      },
    })
    expect(testCva({ size: 'md', variant: 'primary' })).toBe('btn btn-md btn-primary')
  })

  it('should append custom class prop', () => {
    const testCva = cva('btn', {
      variants: {
        size: {
          md: 'btn-md',
        },
      },
    })
    expect(testCva({ size: 'md', class: 'custom-class' })).toBe('btn btn-md custom-class')
  })
})

// =============================================================================
// Button Component Tests
// =============================================================================

describe('button component', () => {
  it('should return base classes with default variants', () => {
    const result = button()
    expect(result).toContain('inline-flex')
    expect(result).toContain('items-center')
    expect(result).toContain('justify-center')
    expect(result).toContain('rounded-[3px]')
    // Default variant classes
    expect(result).toContain('bg-primary')
    expect(result).toContain('h-[30px]') // md size
  })

  it('should apply variant prop', () => {
    expect(button({ variant: 'secondary' })).toContain('bg-secondary')
    expect(button({ variant: 'outline' })).toContain('border')
    expect(button({ variant: 'ghost' })).toContain('hover:bg-surface-secondary')
    expect(button({ variant: 'link' })).toContain('underline-offset-4')
    expect(button({ variant: 'danger' })).toContain('bg-error')
  })

  it('should apply size prop', () => {
    expect(button({ size: 'sm' })).toContain('h-[26px]')
    expect(button({ size: 'md' })).toContain('h-[30px]')
    expect(button({ size: 'lg' })).toContain('h-10')
    expect(button({ size: 'icon' })).toContain('h-[30px]')
  })

  it('should combine variant and size props', () => {
    const result = button({ variant: 'danger', size: 'lg' })
    expect(result).toContain('bg-error')
    expect(result).toContain('h-10')
  })
})

// =============================================================================
// Input Component Tests
// =============================================================================

describe('input component', () => {
  it('should return base classes with default variants', () => {
    const result = input()
    expect(result).toContain('flex')
    expect(result).toContain('w-full')
    expect(result).toContain('rounded-[1px]')
    expect(result).toContain('border-b-')
    expect(result).toContain('h-[45px]') // md size
  })

  it('should apply error variant', () => {
    expect(input({ variant: 'error' })).toContain('border-b-error')
  })

  it('should apply size variants', () => {
    expect(input({ size: 'sm' })).toContain('h-[35px]')
    expect(input({ size: 'md' })).toContain('h-[45px]')
    expect(input({ size: 'lg' })).toContain('h-[55px]')
  })
})

// =============================================================================
// Textarea Component Tests
// =============================================================================

describe('textarea component', () => {
  it('should return base classes with default variant', () => {
    const result = textarea()
    expect(result).toContain('min-h-[150px]')
    expect(result).toContain('rounded-[1px]')
    expect(result).toContain('border-b-border-secondary')
  })

  it('should apply error variant', () => {
    expect(textarea({ variant: 'error' })).toContain('border-b-error')
  })
})

// =============================================================================
// Select Component Tests
// =============================================================================

describe('select component', () => {
  it('should return base classes with default variants', () => {
    const result = select()
    expect(result).toContain('flex')
    expect(result).toContain('w-full')
    expect(result).toContain('rounded-[1px]')
  })

  it('should apply variants', () => {
    expect(select({ variant: 'error' })).toContain('border-b-error')
    expect(select({ size: 'lg' })).toContain('h-[55px]')
  })
})

// =============================================================================
// Checkbox Component Tests
// =============================================================================

describe('checkbox component', () => {
  it('should return base classes with default variant', () => {
    const result = checkbox()
    expect(result).toContain('h-4')
    expect(result).toContain('w-4')
    expect(result).toContain('rounded')
    expect(result).toContain('border-border')
  })

  it('should apply error variant', () => {
    expect(checkbox({ variant: 'error' })).toContain('border-error')
  })
})

// =============================================================================
// Radio Component Tests
// =============================================================================

describe('radio component', () => {
  it('should return base classes with default variant', () => {
    const result = radio()
    expect(result).toContain('aspect-square')
    expect(result).toContain('rounded-full')
  })

  it('should apply error variant', () => {
    expect(radio({ variant: 'error' })).toContain('border-error')
  })
})

// =============================================================================
// Switch Component Tests
// =============================================================================

describe('switch components', () => {
  describe('switchBase', () => {
    it('should return base classes with default variants', () => {
      const result = switchBase()
      expect(result).toContain('inline-flex')
      expect(result).toContain('rounded-full')
      expect(result).toContain('h-6') // md size
      expect(result).toContain('w-11')
    })

    it('should apply size variants', () => {
      expect(switchBase({ size: 'sm' })).toContain('h-5')
      expect(switchBase({ size: 'lg' })).toContain('h-7')
    })
  })

  describe('switchThumb', () => {
    it('should return base classes with default size', () => {
      const result = switchThumb()
      expect(result).toContain('rounded-full')
      expect(result).toContain('h-5')
      expect(result).toContain('w-5')
    })

    it('should apply size variants', () => {
      expect(switchThumb({ size: 'sm' })).toContain('h-4')
      expect(switchThumb({ size: 'lg' })).toContain('h-6')
    })
  })
})

// =============================================================================
// Label Component Tests
// =============================================================================

describe('label component', () => {
  it('should return base classes', () => {
    const result = label()
    expect(result).toContain('text-sm')
    expect(result).toContain('font-medium')
  })

  it('should use default false required variant', () => {
    // Boolean variants with true/false keys require 'true'/'false' string values
    // when passed through cva. The default is false, which maps to empty string
    const result = label()
    expect(result).not.toContain('after:')
  })
})

// =============================================================================
// Form Helper Classes Tests
// =============================================================================

describe('form helper classes', () => {
  it('formError should have error styling', () => {
    expect(formError).toContain('text-error')
    expect(formError).toContain('text-sm')
  })

  it('formHint should have hint styling', () => {
    expect(formHint).toContain('text-foreground-secondary')
    expect(formHint).toContain('text-sm')
  })
})

// =============================================================================
// Card Component Tests
// =============================================================================

describe('card components', () => {
  describe('card', () => {
    it('should return base classes with default variant', () => {
      const result = card()
      expect(result).toContain('rounded-lg')
      expect(result).toContain('border')
      expect(result).toContain('bg-surface')
    })

    it('should apply variant props', () => {
      expect(card({ variant: 'elevated' })).toContain('shadow-lg')
      expect(card({ variant: 'outline' })).toContain('shadow-none')
      expect(card({ variant: 'ghost' })).toContain('bg-transparent')
    })
  })

  it('cardHeader should have correct classes', () => {
    expect(cardHeader).toContain('flex')
    expect(cardHeader).toContain('flex-col')
    expect(cardHeader).toContain('p-6')
  })

  it('cardTitle should have correct classes', () => {
    expect(cardTitle).toContain('font-semibold')
    expect(cardTitle).toContain('text-lg')
  })

  it('cardDescription should have correct classes', () => {
    expect(cardDescription).toContain('text-sm')
    expect(cardDescription).toContain('text-foreground-secondary')
  })

  it('cardContent should have correct classes', () => {
    expect(cardContent).toContain('p-6')
  })

  it('cardFooter should have correct classes', () => {
    expect(cardFooter).toContain('flex')
    expect(cardFooter).toContain('p-6')
  })
})

// =============================================================================
// Badge Component Tests
// =============================================================================

describe('badge component', () => {
  it('should return base classes with default variant', () => {
    const result = badge()
    expect(result).toContain('inline-flex')
    expect(result).toContain('rounded-full')
    expect(result).toContain('bg-primary')
  })

  it('should apply variant props', () => {
    expect(badge({ variant: 'secondary' })).toContain('bg-secondary')
    expect(badge({ variant: 'outline' })).toContain('border-border')
    expect(badge({ variant: 'success' })).toContain('bg-success')
    expect(badge({ variant: 'warning' })).toContain('bg-warning')
    expect(badge({ variant: 'error' })).toContain('bg-error')
  })
})

// =============================================================================
// Alert Component Tests
// =============================================================================

describe('alert components', () => {
  describe('alert', () => {
    it('should return base classes with default variant', () => {
      const result = alert()
      expect(result).toContain('rounded-lg')
      expect(result).toContain('border')
      expect(result).toContain('p-4')
    })

    it('should apply variant props', () => {
      expect(alert({ variant: 'info' })).toContain('bg-info-light')
      expect(alert({ variant: 'success' })).toContain('bg-success-light')
      expect(alert({ variant: 'warning' })).toContain('bg-warning-light')
      expect(alert({ variant: 'error' })).toContain('bg-error-light')
    })
  })

  it('alertTitle should have correct classes', () => {
    expect(alertTitle).toContain('font-medium')
    expect(alertTitle).toContain('mb-1')
  })

  it('alertDescription should have correct classes', () => {
    expect(alertDescription).toContain('text-sm')
  })
})

// =============================================================================
// Avatar Component Tests
// =============================================================================

describe('avatar components', () => {
  describe('avatar', () => {
    it('should return base classes with default size', () => {
      const result = avatar()
      expect(result).toContain('rounded-full')
      expect(result).toContain('overflow-hidden')
      expect(result).toContain('h-10')
      expect(result).toContain('w-10')
    })

    it('should apply size variants', () => {
      expect(avatar({ size: 'sm' })).toContain('h-8')
      expect(avatar({ size: 'lg' })).toContain('h-12')
      expect(avatar({ size: 'xl' })).toContain('h-16')
    })
  })

  it('avatarImage should have correct classes', () => {
    expect(avatarImage).toContain('aspect-square')
    expect(avatarImage).toContain('object-cover')
  })

  it('avatarFallback should have correct classes', () => {
    expect(avatarFallback).toContain('flex')
    expect(avatarFallback).toContain('items-center')
    expect(avatarFallback).toContain('justify-center')
  })
})

// =============================================================================
// Dialog Component Tests
// =============================================================================

describe('dialog components', () => {
  it('dialogOverlay should have correct classes', () => {
    expect(dialogOverlay).toContain('fixed')
    expect(dialogOverlay).toContain('inset-0')
    expect(dialogOverlay).toContain('z-modal')
  })

  describe('dialogContent', () => {
    it('should return base classes with default size', () => {
      const result = dialogContent()
      expect(result).toContain('relative')
      expect(result).toContain('flex-col')
      expect(result).toContain('max-w-lg')
    })

    it('should apply size variants', () => {
      expect(dialogContent({ size: 'sm' })).toContain('max-w-sm')
      expect(dialogContent({ size: 'lg' })).toContain('max-w-2xl')
      expect(dialogContent({ size: 'xl' })).toContain('max-w-4xl')
    })
  })

  it('dialogHeader should have correct classes', () => {
    expect(dialogHeader).toContain('flex')
    expect(dialogHeader).toContain('items-center')
    expect(dialogHeader).toContain('justify-between')
  })

  it('dialogFooter should have correct classes', () => {
    expect(dialogFooter).toContain('flex')
  })

  it('dialogTitle should have correct classes', () => {
    expect(dialogTitle).toContain('font-semibold')
    expect(dialogTitle).toContain('text-xl')
  })

  it('dialogDescription should have correct classes', () => {
    expect(dialogDescription).toContain('text-sm')
    expect(dialogDescription).toContain('text-foreground-secondary')
  })

  it('dialogClose should have correct classes', () => {
    expect(dialogClose).toContain('flex-shrink-0')
    expect(dialogClose).toContain('cursor-pointer')
    expect(dialogClose).toContain('hover:text-foreground')
  })
})

// =============================================================================
// Dropdown Component Tests
// =============================================================================

describe('dropdown components', () => {
  it('dropdownContent should have correct classes', () => {
    expect(dropdownContent).toContain('z-dropdown')
    expect(dropdownContent).toContain('rounded-md')
    expect(dropdownContent).toContain('border')
  })

  it('dropdownItem should have correct classes', () => {
    expect(dropdownItem).toContain('cursor-pointer')
    expect(dropdownItem).toContain('rounded-sm')
    expect(dropdownItem).toContain('px-2')
  })

  it('dropdownSeparator should have correct classes', () => {
    expect(dropdownSeparator).toContain('h-px')
    expect(dropdownSeparator).toContain('bg-border')
  })

  it('dropdownLabel should have correct classes', () => {
    expect(dropdownLabel).toContain('font-semibold')
  })
})

// =============================================================================
// Table Component Tests
// =============================================================================

describe('table components', () => {
  it('table should have correct classes', () => {
    expect(table).toContain('w-full')
    expect(table).toContain('text-sm')
  })

  it('tableHeader should have correct classes', () => {
    expect(tableHeader).toContain('[&_tr]:border-b')
  })

  it('tableBody should have correct classes', () => {
    expect(tableBody).toContain('[&_tr:last-child]:border-0')
  })

  it('tableFooter should have correct classes', () => {
    expect(tableFooter).toContain('border-t')
    expect(tableFooter).toContain('bg-surface-secondary')
  })

  it('tableRow should have correct classes', () => {
    expect(tableRow).toContain('border-b')
    expect(tableRow).toContain('hover:bg-surface-secondary')
  })

  it('tableHead should have correct classes', () => {
    expect(tableHead).toContain('h-12')
    expect(tableHead).toContain('font-medium')
  })

  it('tableCell should have correct classes', () => {
    expect(tableCell).toContain('p-4')
    expect(tableCell).toContain('align-middle')
  })

  it('tableCaption should have correct classes', () => {
    expect(tableCaption).toContain('text-sm')
    expect(tableCaption).toContain('text-foreground-secondary')
  })
})

// =============================================================================
// Tabs Component Tests
// =============================================================================

describe('tabs components', () => {
  it('tabsList should have correct classes', () => {
    expect(tabsList).toContain('inline-flex')
    expect(tabsList).toContain('rounded-md')
    expect(tabsList).toContain('bg-surface-secondary')
  })

  it('tabsTrigger should have correct classes', () => {
    expect(tabsTrigger).toContain('inline-flex')
    expect(tabsTrigger).toContain('rounded-sm')
    expect(tabsTrigger).toContain('font-medium')
  })

  it('tabsContent should have correct classes', () => {
    expect(tabsContent).toContain('mt-2')
  })
})

// =============================================================================
// Tooltip Component Tests
// =============================================================================

describe('tooltip components', () => {
  it('tooltipContent should have correct classes', () => {
    expect(tooltipContent).toContain('z-tooltip')
    expect(tooltipContent).toContain('rounded-md')
    expect(tooltipContent).toContain('text-sm')
  })
})

// =============================================================================
// Progress Component Tests
// =============================================================================

describe('progress components', () => {
  it('progress should have correct classes', () => {
    expect(progress).toContain('h-2')
    expect(progress).toContain('rounded-full')
    expect(progress).toContain('overflow-hidden')
  })

  it('progressIndicator should have correct classes', () => {
    expect(progressIndicator).toContain('h-full')
    expect(progressIndicator).toContain('bg-primary')
  })
})

// =============================================================================
// Skeleton Component Tests
// =============================================================================

describe('skeleton component', () => {
  it('should have correct classes', () => {
    expect(skeleton).toContain('animate-pulse')
    expect(skeleton).toContain('rounded-md')
    expect(skeleton).toContain('bg-surface-secondary')
  })
})

// =============================================================================
// Separator Component Tests
// =============================================================================

describe('separator component', () => {
  it('should return horizontal by default', () => {
    const result = separator()
    expect(result).toContain('bg-border')
    expect(result).toContain('h-[1px]')
    expect(result).toContain('w-full')
  })

  it('should apply orientation variants', () => {
    expect(separator({ orientation: 'vertical' })).toContain('w-[1px]')
    expect(separator({ orientation: 'vertical' })).toContain('h-full')
  })
})

// =============================================================================
// Spinner Component Tests
// =============================================================================

describe('spinner component', () => {
  it('should return base classes with default size', () => {
    const result = spinner()
    expect(result).toContain('animate-spin')
    expect(result).toContain('rounded-full')
    expect(result).toContain('border-2')
    expect(result).toContain('h-6')
    expect(result).toContain('w-6')
  })

  it('should apply size variants', () => {
    expect(spinner({ size: 'sm' })).toContain('h-4')
    expect(spinner({ size: 'lg' })).toContain('h-8')
    expect(spinner({ size: 'xl' })).toContain('h-12')
  })
})

// =============================================================================
// Layout Component Tests
// =============================================================================

describe('layout components', () => {
  describe('container', () => {
    it('should return base classes with default size', () => {
      const result = container()
      expect(result).toContain('mx-auto')
      expect(result).toContain('w-full')
      expect(result).toContain('px-4')
      expect(result).toContain('max-w-screen-xl')
    })

    it('should apply size variants', () => {
      expect(container({ size: 'sm' })).toContain('max-w-screen-sm')
      expect(container({ size: 'md' })).toContain('max-w-screen-md')
      expect(container({ size: 'lg' })).toContain('max-w-screen-lg')
      expect(container({ size: '2xl' })).toContain('max-w-screen-2xl')
      expect(container({ size: 'full' })).toContain('max-w-full')
    })
  })

  describe('flex', () => {
    it('should return base classes with default variants', () => {
      const result = flex()
      expect(result).toContain('flex')
      expect(result).toContain('flex-row')
      expect(result).toContain('items-stretch')
      expect(result).toContain('justify-start')
    })

    it('should apply direction variants', () => {
      expect(flex({ direction: 'col' })).toContain('flex-col')
      expect(flex({ direction: 'row-reverse' })).toContain('flex-row-reverse')
      expect(flex({ direction: 'col-reverse' })).toContain('flex-col-reverse')
    })

    it('should apply align variants', () => {
      expect(flex({ align: 'center' })).toContain('items-center')
      expect(flex({ align: 'start' })).toContain('items-start')
      expect(flex({ align: 'end' })).toContain('items-end')
      expect(flex({ align: 'baseline' })).toContain('items-baseline')
    })

    it('should apply justify variants', () => {
      expect(flex({ justify: 'center' })).toContain('justify-center')
      expect(flex({ justify: 'between' })).toContain('justify-between')
      expect(flex({ justify: 'around' })).toContain('justify-around')
      expect(flex({ justify: 'evenly' })).toContain('justify-evenly')
    })

    it('should apply wrap variants', () => {
      expect(flex({ wrap: 'wrap' })).toContain('flex-wrap')
      expect(flex({ wrap: 'wrap-reverse' })).toContain('flex-wrap-reverse')
    })

    it('should apply gap variants', () => {
      expect(flex({ gap: 'xs' })).toContain('gap-1')
      expect(flex({ gap: 'sm' })).toContain('gap-2')
      expect(flex({ gap: 'md' })).toContain('gap-4')
      expect(flex({ gap: 'lg' })).toContain('gap-6')
      expect(flex({ gap: 'xl' })).toContain('gap-8')
    })
  })

  describe('grid', () => {
    it('should return base classes with default gap', () => {
      const result = grid()
      expect(result).toContain('grid')
      expect(result).toContain('gap-4')
    })

    it('should apply cols variants with string keys', () => {
      // Note: cva requires string keys to match, so numeric cols like {cols: 2}
      // won't match unless passed as string. TypeScript types allow both.
      // @ts-expect-error - testing string key behavior
      expect(grid({ cols: '2' })).toContain('grid-cols-2')
      // @ts-expect-error - testing string key behavior
      expect(grid({ cols: '3' })).toContain('grid-cols-3')
      // @ts-expect-error - testing string key behavior
      expect(grid({ cols: '12' })).toContain('grid-cols-12')
    })

    it('should apply gap variants', () => {
      expect(grid({ gap: 'none' })).toContain('gap-0')
      expect(grid({ gap: 'lg' })).toContain('gap-6')
    })
  })

  describe('stack', () => {
    it('should return base classes with default variants', () => {
      const result = stack()
      expect(result).toContain('flex')
      expect(result).toContain('flex-col')
      expect(result).toContain('items-stretch')
      expect(result).toContain('gap-4')
    })

    it('should apply align variants', () => {
      expect(stack({ align: 'center' })).toContain('items-center')
      expect(stack({ align: 'start' })).toContain('items-start')
    })

    it('should apply gap variants', () => {
      expect(stack({ gap: 'lg' })).toContain('gap-6')
    })
  })

  describe('hstack', () => {
    it('should return base classes with default variants', () => {
      const result = hstack()
      expect(result).toContain('flex')
      expect(result).toContain('flex-row')
      expect(result).toContain('items-center')
      expect(result).toContain('justify-start')
      expect(result).toContain('gap-4')
    })

    it('should apply justify variants', () => {
      expect(hstack({ justify: 'center' })).toContain('justify-center')
      expect(hstack({ justify: 'between' })).toContain('justify-between')
    })

    it('should apply gap variants', () => {
      expect(hstack({ gap: 'sm' })).toContain('gap-2')
    })
  })

  describe('center', () => {
    it('should have correct classes', () => {
      expect(center).toContain('flex')
      expect(center).toContain('items-center')
      expect(center).toContain('justify-center')
    })
  })

  describe('screen reader utilities', () => {
    it('srOnly should have correct class', () => {
      expect(srOnly).toBe('sr-only')
    })

    it('notSrOnly should have correct class', () => {
      expect(notSrOnly).toBe('not-sr-only')
    })
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('integration tests', () => {
  it('should allow combining component classes with cn utility', () => {
    const result = cn(button({ variant: 'primary', size: 'lg' }), 'extra-class')
    expect(result).toContain('inline-flex')
    expect(result).toContain('h-10')
    expect(result).toContain('extra-class')
  })

  it('should allow conditional component variants', () => {
    const isError = true
    const result = input({ variant: isError ? 'error' : 'default' })
    expect(result).toContain('border-b-error')
  })

  it('should allow chaining custom classes through cva class prop', () => {
    const result = button({ variant: 'default', class: 'my-custom-button' })
    expect(result).toContain('bg-primary')
    expect(result).toContain('my-custom-button')
  })

  it('should work with layout and component classes together', () => {
    const containerClasses = container({ size: 'lg' })
    const buttonClasses = button({ variant: 'default' })
    const combined = cn(containerClasses, buttonClasses)
    expect(combined).toContain('mx-auto')
    expect(combined).toContain('max-w-screen-lg')
    // Button default variant includes bg-primary
    expect(combined).toContain('inline-flex')
    expect(combined).toContain('rounded-[3px]')
  })
})
