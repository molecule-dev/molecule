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
/**
 * A class-name merger: post-processes the joined class string produced by
 * `cn()` to resolve conflicts (e.g. `tailwind-merge`). Registered by a styling
 * bond via `setClassMerger` so the styling core stays framework-agnostic.
 */
export type ClassMerger = (className: string) => string

/**
 * Configuration for a class-variance-authority (`cva`) function: the variant
 * definitions, default selections, and compound variants used to resolve a
 * component's final class string from its props.
 */
export interface CVAConfig<T extends Record<string, Record<string, string>>> {
  variants?: T
  defaultVariants?: { [K in keyof T]?: keyof T[K] }
  compoundVariants?: Array<{ [K in keyof T]?: keyof T[K] } & { class: string }>
}
