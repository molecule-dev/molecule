/**
 * Types for component showcase specifications.
 *
 * @module
 */

/**
 * Specification for showcasing a single component across all its visual variations.
 *
 * The `propMatrix` defines axes of variation — every combination is rendered.
 * `defaultProps` supplies required or baseline props applied to every variation.
 * `children` provides text content (set to `false` for components with no children).
 */
export interface ComponentShowcase {
  /**
   * Component export name (must match the named export from `@molecule/app-ui-{framework}`).
   */
  name: string

  /**
   * Props to vary across the matrix. Each key is a prop name, each value is
   * the array of values to test. All combinations are generated.
   *
   * Example: `{ variant: ['solid', 'outline'], color: ['primary', 'error'] }`
   * produces 4 combinations.
   */
  propMatrix: Record<string, unknown[]>

  /**
   * Props applied to every variation (e.g., required props, sample data).
   */
  defaultProps?: Record<string, unknown>

  /**
   * Text content to render as children. Set to `false` for components that
   * don't accept children (e.g., Spinner, Separator).
   */
  children?: string | false
}
