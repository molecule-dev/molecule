/**
 * `@molecule/app-ide-panel-logic` — the framework-neutral logic of the IDE
 * panels (chat, preview, file explorer, tests): command and settings metadata,
 * the custom-event-card registry, and the pure helper modules behind the
 * `@molecule/app-ide-react` components. Every framework's IDE package imports
 * (and React's re-exports) this exact set, so the logic exists once.
 *
 * @remarks
 * - The `./panels` entry holds the further helper modules the panel views use
 *   directly; it is not re-exported by the framework packages.
 * - `registerCustomEventCard()` holds module state: every importer reaches THIS
 *   package's one copy of the registry, never a second one.
 *
 * @example
 * ```ts
 * import { t } from '@molecule/app-i18n'
 * import { COMMANDS, registerCustomEventCard } from '@molecule/app-ide-panel-logic'
 *
 * // Read the shared slash-command registry (same array the API prompt reads).
 * const share = COMMANDS.find((command) => command.id === 'share')
 *
 * // Register an app-specific chat card once; every framework's IDE package
 * // sees it because the registry lives in this package.
 * registerCustomEventCard('build_degraded', () => ({
 *   text: t('app.buildDegraded', undefined, { defaultValue: 'This build ran on a smaller model.' }),
 *   tone: 'upgrade',
 *   action: { label: t('app.upgrade', undefined, { defaultValue: 'Upgrade' }), href: '/pricing' },
 * }))
 * ```
 *
 * @module
 */

export * from './command-metadata.js'
export * from './components/activity-utilities.js'
export * from './components/chat-autocommit-utilities.js'
export * from './components/chat-card-style.js'
export * from './components/chat-format-utilities.js'
export * from './components/chat-report-utilities.js'
export * from './components/chat-share-utilities.js'
export * from './components/chat-timestamps-utilities.js'
export * from './components/chat-ui-constants.js'
export * from './components/device-cycle.js'
export * from './components/search-utilities.js'
export * from './components/tests-card-utilities.js'
export * from './components/user-avatar-utilities.js'
export * from './components/workspace-layout-utilities.js'
export * from './customEventCards.js'
export * from './icon-names.js'
export * from './keyboard-shortcut-utilities.js'
export * from './settings-metadata.js'
export * from './types.js'
export * from './viewport-queries.js'
