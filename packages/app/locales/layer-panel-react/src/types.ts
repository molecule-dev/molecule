/** Translation keys used by `@molecule/app-layer-panel-react`. */
export type LayerPanelTranslationKey =
  | 'layerPanel.label'
  | 'layerPanel.show'
  | 'layerPanel.hide'
  | 'layerPanel.lock'
  | 'layerPanel.unlock'
  | 'layerPanel.renameInput'
  | 'layerPanel.metadata'

/** Translation record mapping layer-panel keys to translated strings. */
export type LayerPanelTranslations = Record<LayerPanelTranslationKey, string>
