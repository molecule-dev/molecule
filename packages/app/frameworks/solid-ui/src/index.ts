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
 * import { createSignal } from 'solid-js'
 * import { render } from 'solid-js/web'
 *
 * import { registerLocaleModule, t } from '@molecule/app-i18n'
 * import { setIconSet } from '@molecule/app-icons'
 * import { iconSet } from '@molecule/app-icons-molecule'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { setClassMap } from '@molecule/app-ui'
 * import { Alert, Button, Card, CardContent, CardTitle, Modal } from '@molecule/app-ui-solid'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Once at startup, before the first render: components throw without a ClassMap,
 * // and Modal/Alert render their icons from the bonded icon set.
 * setClassMap(classMap)
 * setIconSet(iconSet)
 * registerLocaleModule(commonLocales) // translations for the `settings.*` / `common.*` keys below
 *
 * function DeleteAccountCard() {
 *   const [open, setOpen] = createSignal(false)
 *   const [deleted, setDeleted] = createSignal(false)
 *   return (
 *     <Card>
 *       <CardTitle>{t('settings.account', undefined, { defaultValue: 'Account' })}</CardTitle>
 *       <CardContent>
 *         {deleted() ? (
 *           <Alert status="success">{t('common.completed', undefined, { defaultValue: 'Completed' })}</Alert>
 *         ) : (
 *           <Button color="error" onClick={() => setOpen(true)}>
 *             {t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
 *           </Button>
 *         )}
 *       </CardContent>
 *       <Modal
 *         open={open()}
 *         onClose={() => setOpen(false)}
 *         title={t('settings.deleteAccountModal.title', undefined, { defaultValue: 'Delete Account' })}
 *       >
 *         <Button
 *           color="error"
 *           onClick={() => {
 *             setDeleted(true)
 *             setOpen(false)
 *           }}
 *         >
 *           {t('common.delete', undefined, { defaultValue: 'Delete' })}
 *         </Button>
 *       </Modal>
 *     </Card>
 *   )
 * }
 *
 * // index.html contains <div id="root"></div>.
 * render(() => <DeleteAccountCard />, document.getElementById('root') as HTMLElement)
 * ```
 *
 * @remarks
 * - **`setClassMap()` must run before any component renders** — every component resolves
 *   styling via `getClassMap()` from `@molecule/app-ui`, which THROWS until a ClassMap bond
 *   (e.g. `@molecule/app-ui-tailwind`) is set.
 * - **`Modal` (close button) and `Alert` (status icon) render icons** through
 *   `@molecule/app-icons` — call `setIconSet(iconSet)` (e.g. `@molecule/app-icons-molecule`) at
 *   startup too, or they throw on render. `Modal` renders into a `Portal` on `document.body`.
 * - Components ship as JSX-preserving `.jsx` files: the consuming app's bundler needs the Solid
 *   JSX transform (`vite-plugin-solid`).
 * - Follow Solid rules: pass signals as accessors in JSX (`open={open()}`), and don't
 *   destructure component props.
 *
 * @module
 */

export * from './components/index.js'
export * from './types.js'
export * from './utilities.js'
