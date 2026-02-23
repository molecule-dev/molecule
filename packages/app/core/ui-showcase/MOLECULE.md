# @molecule/app-ui-showcase

Component showcase specifications for cross-framework visual regression testing.

Provides framework-agnostic data describing which components to render
and which prop combinations to test. Used by showcase templates in mlcl
to generate minimal apps per framework, then screenshotted by Playwright.

## Type
`core`

## Installation
```bash
npm install @molecule/app-ui-showcase
```

## API

### Interfaces

#### `ComponentShowcase`

Specification for showcasing a single component across all its visual variations.

The `propMatrix` defines axes of variation — every combination is rendered.
`defaultProps` supplies required or baseline props applied to every variation.
`children` provides text content (set to `false` for components with no children).

```typescript
interface ComponentShowcase {
  /**
   * Component export name (must match the named export from `@molecule/app-ui-{framework}`).
   * For Svelte, maps to the `get{Name}Classes` utility function.
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

  /**
   * The HTML element to render for Svelte class-utility components.
   * Defaults to 'div'. Use 'button' for Button, 'input' for Input, etc.
   */
  svelteElement?: string
}
```

### Functions

#### `generateCombinations(matrix)`

Generate all combinations from a prop matrix.

Given `{ variant: ['solid', 'outline'], color: ['primary', 'error'] }`,
returns:
```
[
  { variant: 'solid', color: 'primary' },
  { variant: 'solid', color: 'error' },
  { variant: 'outline', color: 'primary' },
  { variant: 'outline', color: 'error' },
]
```

```typescript
function generateCombinations(matrix: Record<string, unknown[]>): Record<string, unknown>[]
```

- `matrix` — Object mapping prop names to arrays of possible values.

**Returns:** Array of objects, one per combination.

### Constants

#### `showcaseComponents`

Full showcase specification for all molecule UI components.

Components are ordered by category: actions, form inputs, data display,
feedback, layout, and overlay/interactive.

```typescript
const showcaseComponents: ComponentShowcase[]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ui` ^1.0.0
