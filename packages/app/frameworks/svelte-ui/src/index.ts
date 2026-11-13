/**
 * Svelte UI components and class generators for molecule.dev.
 *
 * The package exports one Svelte 5 component per React component in
 * `@molecule/app-ui-react`, under the same React name, with the same props,
 * rendered DOM and behavior: `Button`, `Card` (with `CardHeader`, `CardTitle`,
 * `CardDescription`, `CardContent`, `CardFooter`), `Input`, `Textarea`,
 * `Select`, `Checkbox`, `RadioGroup`, `Switch`, `FloatingInput`, `Form`,
 * `FormField`, `Modal`, `ConfirmDialog`, `PromptDialog`, `Tooltip`,
 * `Dropdown` (with `DropdownLabel`, `DropdownSeparator`), `Tabs`, `Table`,
 * `Pagination`, `Accordion`, `Alert`, `Avatar`, `Badge`, `Progress`,
 * `Skeleton`, `SkeletonText`, `SkeletonCircle`, `Spinner`, `Separator`,
 * `Spacer`, `Container`, `Flex`, `Grid`, `PageHeader`, `PageShell`,
 * `EmptyState`, `Icon`, `Toast` (with `ToastProvider`, `ToastContainer`),
 * `ThemeToggle`, `LanguagePicker`, `AuthGuard`, `ConfirmButton`,
 * `OptimisticToggleButton`, `PanelCloseProvider`, `SidebarUserCard`,
 * `UserMenu`, `UserMenuPopover` (with `UserMenuPopoverTrigger`,
 * `UserMenuPopoverPanel`, `UserMenuPopoverSignOut`) and the
 * `ResponsiveAppShell` family (`ResponsiveAppShellContent`,
 * `ResponsiveAppShellTopBar`, `ResponsiveAppShellSidebar`,
 * `ResponsiveAppShellDrawer`), plus the hooks `useIsDesktop`, `useToast`,
 * `usePanelClose` and `useUserMenuPopoverClose`.
 *
 * It also keeps the original pure TypeScript CLASS GENERATORS (plus variant
 * maps and helpers like `cn` and `getIconData`) for teams that write their own
 * markup: `getButtonClasses`, `getCardClasses`, `getModalContentClasses`,
 * `getInputClasses`, and one generator family per `@molecule/app-ui` component
 * interface. The components call the same generators, so both paths produce
 * identical ClassMap-resolved class strings.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { setClassMap } from '@molecule/app-ui'
 *   import { classMap } from '@molecule/app-ui-tailwind'
 *   import { Button, Card, CardHeader, CardTitle, CardContent } from '@molecule/app-ui-svelte'
 *
 *   // Once at app startup (root layout), before anything renders:
 *   setClassMap(classMap)
 * </script>
 *
 * <Card>
 *   <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
 *   <CardContent><Button variant="solid" color="primary">New project</Button></CardContent>
 * </Card>
 * ```
 *
 * And the generator form:
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { getButtonClasses } from '@molecule/app-ui-svelte'
 *
 *   export let variant: 'solid' | 'outline' = 'solid'
 *   $: classes = getButtonClasses({ variant, color: 'primary', size: 'md' })
 * </script>
 *
 * <button class={classes} on:click><slot /></button>
 * ```
 *
 * @remarks
 * - **`setClassMap()` must run before the first render or generator call** — every component
 *   and generator resolves through `getClassMap()` from `@molecule/app-ui`, which THROWS until
 *   a ClassMap bond (e.g. `@molecule/app-ui-tailwind`) is set. Do it in the root layout's
 *   module context or first component script.
 * - `children` and node-valued props are Svelte snippets (`{#snippet …}` blocks); string
 *   values are rendered as text.
 * - Recompute reactively: components take `className`/`style` props, and generator calls
 *   belong in `$:` or `$derived` so class strings update when props change.
 *
 * @module
 */

export * from './components/index.js'
export * from './hooks.js'
export * from './panel-close.js'
export * from './toast.js'
export * from './types.js'
export * from './user-menu-popover.svelte.js'
export * from './utilities.js'
export * from './utilities/index.js'
