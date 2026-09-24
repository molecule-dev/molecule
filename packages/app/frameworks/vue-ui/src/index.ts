/**
 * Vue UI components for molecule.dev.
 *
 * Provides Vue 3 implementations of the core `@molecule/app-ui` component
 * interfaces, styled through the UIClassMap abstraction — 25 components:
 * Accordion, Alert, Avatar, Badge, Button, Card, Checkbox, Dropdown, Form,
 * Input, Layout helpers, Modal, Pagination, Progress, RadioGroup, Select,
 * Separator, Skeleton, Spinner, Switch, Table, Tabs, Textarea, Toast,
 * Tooltip. React-only extras (Icon, UserMenu, ThemeToggle, PageHeader, …)
 * live in `@molecule/app-ui-react` and are NOT available here.
 *
 * @example
 * ```typescript
 * import { createApp, defineComponent, h, ref } from 'vue'
 *
 * import { registerLocaleModule, t } from '@molecule/app-i18n'
 * import { setIconSet } from '@molecule/app-icons'
 * import { iconSet } from '@molecule/app-icons-molecule'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * import { Alert, Button, Modal } from '@molecule/app-ui-vue'
 *
 * // Once at startup, before mount: components throw without a ClassMap, and
 * // Modal/Alert render their icons from the bonded icon set.
 * setClassMap(classMap)
 * setIconSet(iconSet)
 * registerLocaleModule(commonLocales) // translations for the `settings.*` / `common.*` keys below
 *
 * const DeleteAccount = defineComponent({
 *   setup() {
 *     const open = ref(false)
 *     const deleted = ref(false)
 *     return () =>
 *       deleted.value
 *         ? h(Alert, { status: 'success' }, () => t('common.completed', undefined, { defaultValue: 'Completed' }))
 *         : h('div', [
 *             h(Button, { color: 'error', onClick: () => (open.value = true) }, () =>
 *               t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' }),
 *             ),
 *             h(
 *               Modal,
 *               {
 *                 open: open.value,
 *                 onClose: () => (open.value = false),
 *                 title: t('settings.deleteAccountModal.title', undefined, { defaultValue: 'Delete Account' }),
 *               },
 *               () =>
 *                 h(Button, { color: 'error', 'data-mol-id': 'confirm-delete-account', onClick: () => (deleted.value = true) }, () =>
 *                   t('common.delete', undefined, { defaultValue: 'Delete' }),
 *                 ),
 *             ),
 *           ])
 *   },
 * })
 *
 * createApp(DeleteAccount).mount('#app') // index.html contains <div id="app"></div>
 * ```
 *
 * @remarks
 * - **`setClassMap()` must run before mount** — every component resolves styling via
 *   `getClassMap()` from `@molecule/app-ui`, which THROWS until a ClassMap bond (e.g.
 *   `@molecule/app-ui-tailwind`) is set.
 * - **`Modal` (close button) and `Alert` (status icon) render icons** through
 *   `@molecule/app-icons` — call `setIconSet(iconSet)` (e.g. `@molecule/app-icons-molecule`) at
 *   startup too, or they throw on render. `Modal` teleports to `document.body`.
 * - Events are Vue emits: listen with `onClick` / `onClose` / `onDismiss` in `h()` props (or
 *   `@click` / `@close` in templates). In render functions pass children as a slot FUNCTION
 *   (`() => text`), not a bare string.
 * - Components are plain `defineComponent`s — usable in SFC templates (register or import in
 *   `<script setup>`) and in render functions as above. Slots are the default slot unless a
 *   component documents named slots.
 *
 * @module
 */

export * from './components/index.js'
export * from './types.js'
export * from './utilities.js'
