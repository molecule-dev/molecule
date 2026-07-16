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
 * import { LayerPanel, type Layer } from '@molecule/app-layer-panel-react'
 *
 * const initial: Layer[] = [
 *   { id: 'bg', name: 'Background', visible: true, locked: false },
 *   { id: 'fg', name: 'Sketch', visible: true, locked: false, opacity: 0.8 },
 * ]
 *
 * function Editor() {
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
 * @module
 */

export * from './LayerPanel.js'
export * from './types.js'
export * from './utilities.js'
