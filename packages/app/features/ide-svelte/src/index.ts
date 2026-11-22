/**
 * The molecule.dev IDE for Svelte 5: the counterpart of `@molecule/app-ide-react`, with
 * the same exports and props and the same DOM for the same input. The framework-neutral half
 * (commands, settings, chat, tests, share and shortcut utilities, panel types) is
 * `@molecule/app-ide-panel-logic`'s, re-exported here.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useNarrowViewport } from '@molecule/app-ide-svelte'
 *
 *   const narrow = useNarrowViewport()
 * </script>
 *
 * <div data-layout={$narrow ? 'stacked' : 'split'}>
 *   <!-- the panels -->
 * </div>
 * ```
 *
 * This file is generated from the files present (do not edit it by hand).
 *
 * @module
 */

export * from './components.js'
export * from './hooks/index.js'
export * from '@molecule/app-ide-panel-logic'
