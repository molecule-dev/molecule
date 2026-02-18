/**
 * Common class presets for Tailwind CSS components.
 *
 * @module
 */

import { cva } from './utilities.js'

/**
 * Common button class presets.
 */
export const buttonClasses = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary',
        secondary: 'bg-secondary text-white hover:bg-secondary-dark focus:ring-secondary',
        outline:
          'border border-border bg-transparent hover:bg-surface-secondary focus:ring-primary',
        ghost: 'bg-transparent hover:bg-surface-secondary focus:ring-primary',
        danger: 'bg-error text-white hover:bg-error/90 focus:ring-error',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

/**
 * Common input class presets.
 */
export const inputClasses = cva(
  'w-full rounded-md border bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'border-border focus:border-primary focus:ring-primary/20',
        error: 'border-error focus:border-error focus:ring-error/20',
        success: 'border-success focus:border-success focus:ring-success/20',
      },
      size: {
        sm: 'h-8 px-2 text-sm',
        md: 'h-10 px-3 text-base',
        lg: 'h-12 px-4 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

/**
 * Common card class presets.
 */
export const cardClasses = cva('rounded-lg border bg-surface', {
  variants: {
    variant: {
      default: 'border-border shadow-sm',
      elevated: 'border-transparent shadow-lg',
      outline: 'border-border shadow-none',
    },
    padding: {
      none: 'p-0',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
})

/**
 * Common badge class presets.
 */
export const badgeClasses = cva('inline-flex items-center rounded-full font-medium', {
  variants: {
    variant: {
      default: 'bg-surface-secondary text-foreground',
      primary: 'bg-primary/10 text-primary',
      secondary: 'bg-secondary/10 text-secondary',
      success: 'bg-success/10 text-success',
      warning: 'bg-warning/10 text-warning',
      error: 'bg-error/10 text-error',
    },
    size: {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
      lg: 'px-3 py-1 text-base',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})
