/**
 * Framework-agnostic styling utility functions.
 *
 * @module
 */

import type { ClassValue, CVAConfig } from './types.js'

/**
 * Merges class names, filtering out falsy values. Supports strings,
 * numbers, conditional objects, and nested arrays.
 *
 * @param classes - Class values to merge (strings, booleans, objects, arrays).
 * @returns A single space-separated class string.
 *
 * @example
 * ```typescript
 * cn('btn', 'btn-primary', isActive && 'active')
 * // => 'btn btn-primary active' (if isActive is true)
 * ```
 */
export const cn = (...classes: ClassValue[]): string => {
  return classes
    .flat()
    .filter((c): c is string | number | Record<string, boolean | undefined | null> => {
      if (c === null || c === undefined || c === false || c === '') return false
      return true
    })
    .map((c) => {
      if (typeof c === 'string' || typeof c === 'number') return String(c)
      if (typeof c === 'object') {
        return Object.entries(c)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ')
      }
      return ''
    })
    .join(' ')
    .trim()
}

/**
 * Creates a class variance authority (CVA) function for component variants.
 * Given a base class and variant configuration, returns a function that
 * resolves the final class string based on selected variants.
 *
 * @param base - The base class that is always included.
 * @param config - Variant definitions, defaults, and compound variants.
 * @returns A function that accepts variant props and returns the resolved class string.
 *
 * @example
 * ```typescript
 * const button = cva('btn', {
 *   variants: {
 *     size: { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' },
 *     variant: { primary: 'btn-primary', secondary: 'btn-secondary' }
 *   },
 *   defaultVariants: { size: 'md', variant: 'primary' }
 * })
 *
 * button({ size: 'lg', variant: 'secondary' })
 * // => 'btn btn-lg btn-secondary'
 * ```
 */
export const cva = <T extends Record<string, Record<string, string>>>(
  base: string,
  config?: CVAConfig<T>,
) => {
  return (props?: { [K in keyof T]?: keyof T[K] } & { class?: string }): string => {
    const classes = [base]
    const { variants, defaultVariants, compoundVariants } = config ?? {}

    if (variants) {
      for (const [variantKey, variantOptions] of Object.entries(variants)) {
        const selectedVariant =
          (props?.[variantKey as keyof T] as string | undefined) ??
          (defaultVariants?.[variantKey as keyof T] as string | undefined)

        if (
          selectedVariant &&
          typeof selectedVariant === 'string' &&
          variantOptions[selectedVariant]
        ) {
          classes.push(variantOptions[selectedVariant])
        }
      }
    }

    if (compoundVariants && props) {
      for (const compound of compoundVariants) {
        const { class: compoundClass, ...conditions } = compound
        const conditionEntries = Object.entries(conditions) as [string, unknown][]
        const matches = conditionEntries.every(([key, value]) => {
          const propValue = props[key as keyof T] ?? defaultVariants?.[key as keyof T]
          return propValue === value
        })
        if (matches) {
          classes.push(compoundClass)
        }
      }
    }

    if (props?.class) {
      classes.push(props.class)
    }

    return cn(...classes)
  }
}

/**
 * Converts a camelCase string to kebab-case.
 *
 * @param str - The camelCase string to convert.
 * @returns The kebab-case version (e.g. `'borderRadius'` → `'border-radius'`).
 */
export const camelToKebab = (str: string): string => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
