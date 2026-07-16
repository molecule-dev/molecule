/**
 * SolidJS UI components for molecule.dev.
 *
 * Provides Solid implementations of the core `@molecule/app-ui` component
 * interfaces, styled through the UIClassMap abstraction — 25 components:
 * Accordion, Alert, Avatar, Badge, Button, Card, Checkbox, Dropdown, Form,
 * Input, Layout helpers, Modal, Pagination, Progress, RadioGroup, Select,
 * Separator, Skeleton, Spinner, Switch, Table, Tabs, Textarea, Toast,
 * Tooltip. React-only extras (Icon, UserMenu, ThemeToggle, PageHeader,
 * AuthGuard, …) live in `@molecule/app-ui-react` and are NOT available here.
 *
 * @example
 * ```tsx
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * import { Button, Card, Modal } from '@molecule/app-ui-solid'
 * import { createSignal } from 'solid-js'
 *
 * // Once at startup, before first render — components throw without it:
 * setClassMap(classMap)
 *
 * function ConfirmPanel() {
 *   const [open, setOpen] = createSignal(false)
 *   return (
 *     <Card>
 *       <Button color="primary" onClick={() => setOpen(true)}>Open</Button>
 *       <Modal open={open()} onClose={() => setOpen(false)} title="Confirm">
 *         <Button color="error" onClick={() => setOpen(false)}>Done</Button>
 *       </Modal>
 *     </Card>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **`setClassMap()` must run before any component renders** — every component resolves
 *   styling via `getClassMap()` from `@molecule/app-ui`, which THROWS until a ClassMap bond
 *   (e.g. `@molecule/app-ui-tailwind`) is set.
 * - Follow Solid rules: pass signals as accessors in JSX (`open={open()}`), and don't
 *   destructure component props.
 *
 * @module
 */

export * from './components/index.js'
export * from './types.js'
export * from './utilities.js'
