/**
 * Solid Photoshop / Figma–style reorderable layer panel.
 *
 * Exports:
 * - `LayerPanel` — the panel component (drag-to-reorder via pointer
 *   events, visibility / lock toggles, double-click inline rename,
 *   click-to-select, optional thumbnail + opacity + blend-mode metadata).
 * - Types: `LayerPanelProps`, `Layer`, `LayerBlendMode`.
 * - Helpers: `moveLayer()`, `formatOpacityPercent()`.
 *
 * It is the Solid counterpart of `@molecule/app-layer-panel-react`: the same
 * props (React names), the same ClassMap tokens and the same DOM for the same
 * input.
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
 * import { createSignal, type Component } from 'solid-js'
 *
 * import { LayerPanel, type Layer } from '@molecule/app-layer-panel-solid'
 *
 * const initial: Layer[] = [
 *   { id: 'bg', name: 'Background', visible: true, locked: false },
 *   { id: 'fg', name: 'Sketch', visible: true, locked: false, opacity: 0.8 },
 * ]
 *
 * const Editor: Component = () => {
 *   const [layers, setLayers] = createSignal<Layer[]>(initial)
 *   const [activeId, setActiveId] = createSignal<string | undefined>()
 *   const patch = (id: string, next: Partial<Layer>): void =>
 *     setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, ...next } : l)))
 *   return (
 *     <LayerPanel
 *       layers={layers()}
 *       activeId={activeId()}
 *       onReorder={setLayers}
 *       onVisibilityToggle={(id) => patch(id, { visible: !layers().find((l) => l.id === id)?.visible })}
 *       onLockToggle={(id) => patch(id, { locked: !layers().find((l) => l.id === id)?.locked })}
 *       onSelect={setActiveId}
 *       onRename={(id, name) => patch(id, { name })}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and
 *   `@molecule/app-solid`'s i18n provider (`useTranslation()` throws without
 *   it); toggle / rename labels come from the
 *   `@molecule/app-locales-layer-panel` companion bond.
 * - The rename field commits on Enter or blur, and cancels on Escape. An
 *   empty or unchanged trimmed name is not reported.
 * - Locked layers cannot be dragged or renamed; their eye / lock toggles
 *   still work.
 *
 * @module
 */

export * from './LayerPanel.jsx'
export * from './types.js'
export * from './utilities.js'
