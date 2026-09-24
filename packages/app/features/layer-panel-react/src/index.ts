/**
 * Photoshop / Figma–style reorderable layer panel for React.
 *
 * Exports:
 * - `<LayerPanel>` — the panel component (drag-to-reorder via pointer
 *   events, visibility / lock toggles, double-click inline rename,
 *   click-to-select, optional thumbnail + opacity + blend-mode metadata).
 * - Types: `LayerPanelProps`, `Layer`, `LayerBlendMode`.
 * - Helpers: `moveLayer()`, `formatOpacityPercent()`.
 *
 * The panel is fully controlled — the host application owns the
 * `Layer[]` array and re-renders with the next state in response to
 * the `onReorder` / `onVisibilityToggle` / `onLockToggle` / `onSelect`
 * / `onRename` callbacks.
 *
 * Layers are rendered top-down per Photoshop convention: index 0 is
 * the first row in the UI and represents the front-most layer.
 *
 * Toggle/rename labels route through `t()` — add the companion
 * `@molecule/app-locales-layer-panel` bond to translate them. Locked layers
 * cannot be dragged or renamed. The eye / lock toggles render emoji glyphs.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { LayerPanel, type Layer } from '@molecule/app-layer-panel-react'
 *
 * const initial: Layer[] = [
 *   { id: 'bg', name: 'Background', visible: true, locked: false },
 *   { id: 'fg', name: 'Sketch', visible: true, locked: false, opacity: 0.8 },
 * ]
 *
 * export function Editor() {
 *   const [layers, setLayers] = useState<Layer[]>(initial)
 *   const [activeId, setActiveId] = useState<string | undefined>()
 *   return (
 *     <LayerPanel
 *       layers={layers}
 *       activeId={activeId}
 *       onReorder={setLayers}
 *       onVisibilityToggle={(id) =>
 *         setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)))
 *       }
 *       onLockToggle={(id) =>
 *         setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)))
 *       }
 *       onSelect={setActiveId}
 *       onRename={(id, name) =>
 *         setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, name } : l)))
 *       }
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - It is fully CONTROLLED and mutates nothing: every one of `onReorder`, `onVisibilityToggle`,
 *   `onLockToggle`, `onSelect` and `onRename` is REQUIRED, and you must write the change back
 *   into `layers` or the click/drag/rename visibly does nothing.
 * - `onReorder` receives the WHOLE reordered array (pass `setLayers` directly); the others
 *   receive only the layer `id` (plus the new name for `onRename`) — toggle the flag yourself.
 * - `opacity` is a 0–1 fraction (`0.8` → "80%"), NOT a percentage. Index 0 is the front-most
 *   layer (top row); do not reverse the array for display.
 * - Locked layers cannot be dragged or renamed (rename is double-click, Enter/blur commits,
 *   Escape cancels; empty or unchanged names never reach `onRename`). Selecting and the
 *   eye/lock toggles still work on locked layers.
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render inside
 *   `<I18nProvider>` / `<MoleculeProvider>`; `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * @module
 */

export * from './LayerPanel.js'
export * from './types.js'
export * from './utilities.js'
