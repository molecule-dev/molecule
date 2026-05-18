/** Translation keys for the feature-map-drawing locale package. */
export type MapDrawingTranslationKey =
  | 'mapDrawing.toolbar.aria'
  | 'mapDrawing.surface.aria'
  | 'mapDrawing.tool.polygon'
  | 'mapDrawing.tool.circle'
  | 'mapDrawing.tool.pin'
  | 'mapDrawing.tool.line'
  | 'mapDrawing.tool.select'
  | 'mapDrawing.tool.delete'

/** Translation record mapping map-drawing keys to translated strings. */
export type MapDrawingTranslations = Record<MapDrawingTranslationKey, string>
