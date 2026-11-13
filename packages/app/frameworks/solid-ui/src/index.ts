/**
 * SolidJS UI components for molecule.dev.
 *
 * Implements the same component surface as `@molecule/app-ui-react`, styled
 * through the UIClassMap abstraction: the core `@molecule/app-ui` components
 * (Accordion, Alert, Avatar, Badge, Button, Card, Checkbox, Dropdown, Form,
 * Input, Layout helpers, Modal, Pagination, Progress, RadioGroup, Select,
 * Separator, Skeleton, Spinner, Switch, Table, Tabs, Textarea, Toast,
 * Tooltip) plus the app-level components (AuthGuard, ConfirmButton,
 * ConfirmDialog, EmptyState, FloatingInput, Icon, LanguagePicker,
 * LoadErrorBanner, OptimisticToggleButton, PageHeader, PageShell,
 * PanelClose, PromptDialog, ResponsiveAppShell, SidebarUserCard, ThemeToggle,
 * UserMenu, UserMenuPopover) and their hooks (`usePanelClose`, `useToast`,
 * `useIsDesktop`, `useUserMenuPopoverClose`). Props keep React's names and
 * value shapes (`className`, camelCase `style` objects, `onClick`).
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
