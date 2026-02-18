/**
 * Styling type definitions for molecule.dev.
 *
 * @module
 */

/**
 * Class name value types accepted by {@link cn}.
 */
export type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | Record<string, boolean | undefined | null>

/**
 * Configuration for class variance authority ({@link cva}).
 */
export interface CVAConfig<T extends Record<string, Record<string, string>>> {
  variants?: T
  defaultVariants?: { [K in keyof T]?: keyof T[K] }
  compoundVariants?: Array<{ [K in keyof T]?: keyof T[K] } & { class: string }>
}
