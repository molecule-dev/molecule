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
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * import { Button, Card, Modal } from '@molecule/app-ui-vue'
 *
 * // Once at startup, before mount — components throw without it:
 * setClassMap(classMap)
 *
 * const Panel = defineComponent({
 *   setup() {
 *     const open = ref(false)
 *     return () =>
 *       h(Card, () => [
 *         h(Button, { color: 'primary', onClick: () => (open.value = true) }, () => 'Open'),
 *         h(Modal, { open: open.value, onClose: () => (open.value = false), title: 'Confirm' }),
 *       ])
 *   },
 * })
 *
 * createApp(Panel).mount('#app')
 * ```
 *
 * @remarks
 * - **`setClassMap()` must run before mount** — every component resolves styling via
 *   `getClassMap()` from `@molecule/app-ui`, which THROWS until a ClassMap bond (e.g.
 *   `@molecule/app-ui-tailwind`) is set.
 * - Components are plain `defineComponent`s — usable in SFC templates (register or import in
 *   `<script setup>`) and in render functions as above. Slots are the default slot unless a
 *   component documents named slots.
 *
 * @module
 */

export * from './components/index.js'
export * from './types.js'
export * from './utilities.js'
