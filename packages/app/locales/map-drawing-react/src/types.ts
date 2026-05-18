/** Translation keys for the map-drawing-react locale package. */
export type MapDrawingTranslationKey =
  | 'mapDrawing.surface.aria'
  | 'mapDrawing.tool.polygon'
  | 'mapDrawing.tool.circle'
  | 'mapDrawing.tool.pin'
  | 'mapDrawing.tool.line'
  | 'mapDrawing.tool.select'
  | 'mapDrawing.tool.delete'
  | 'mapDrawing.toolbar.aria'

/** Translation record mapping map-drawing-react keys to translated strings. */
export type MapDrawingTranslations = Record<MapDrawingTranslationKey, string>
