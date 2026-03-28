/**
 * Command palette core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for Cmd+K / Ctrl+K command palettes
 * with hierarchical groups, nested pages, and fuzzy search. Bond a provider
 * (e.g. `@molecule/app-command-palette-cmdk`) at startup, then use
 * {@link createPalette} anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, createPalette } from '@molecule/app-command-palette'
 * import { provider } from '@molecule/app-command-palette-cmdk'
 *
 * setProvider(provider)
 *
 * const palette = createPalette({
 *   groups: [
 *     {
 *       id: 'navigation',
 *       label: 'Navigation',
 *       commands: [
 *         { id: 'home', label: 'Go Home', onSelect: () => navigate('/') },
 *         { id: 'settings', label: 'Settings', onSelect: () => navigate('/settings') },
 *       ],
 *     },
 *   ],
 *   placeholder: 'Type a command…',
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
