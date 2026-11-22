import type { SolidTranslations } from './types.js'

/** Solid translations for Zulu. */
export const zu: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider kumele kusetshenziswe ngaphakathi kwe-MoleculeProvider okuhlela isimo',
  'solid.error.authOutsideProvider':
    'getAuthClient kumele kusetshenziswe ngaphakathi kwe-MoleculeProvider okuhlela ukuqinisekisa',
  'solid.error.themeOutsideProvider':
    'getThemeProvider kumele kusetshenziswe ngaphakathi kwe-MoleculeProvider okuhlela isihloko',
  'solid.error.routerOutsideProvider':
    'getRouter kumele kusetshenziswe ngaphakathi kwe-MoleculeProvider okuhlela iroutha',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider kumele kusetshenziswe ngaphakathi kwe-MoleculeProvider okuhlela i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient kumele kusetshenziswe ngaphakathi kwe-MoleculeProvider okuhlela HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider kumele kusetshenziswe ngaphakathi kwe-MoleculeProvider okuhlela isitoreji',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider kumele kusetshenziswe ngaphakathi kwe-MoleculeProvider okuhlela iloga',
  'solid.error.useAccordionOutsideProvider':
    'Izingxenye ze-Accordion kumele zisetshenziswe ngaphakathi kwe-Accordion',
  'solid.error.useToastOutsideProvider':
    'useToast kumele kusetshenziswe ngaphakathi kwe-ToastProvider',
  'solid.error.useChatOutsideProvider':
    'useChatProvider kumele kusetshenziswe ngaphakathi kwe-ChatProvider',
  'solid.error.useWorkspaceOutsideProvider':
    'I-useWorkspaceProvider kumele isetshenziswe ngaphakathi kwe-WorkspaceProvider',
  'solid.error.useEditorOutsideProvider':
    'i-useEditorProvider kumele isetshenziswe ngaphakathi kwe-EditorProvider',
  'solid.error.usePreviewOutsideProvider':
    'i-usePreviewProvider kumele isetshenziswe ngaphakathi kwe-PreviewProvider',
  'solid.error.useAuthOutsideProvider':
    'i-useAuthClient kumele isetshenziswe ngaphakathi kwe-AuthProvider',
  'solid.error.useHttpOutsideProvider':
    'i-useHttpClient kumele isetshenziswe ngaphakathi kwe-HttpProvider',
  'solid.error.unsupportedMethod': 'Indlela engasekelwa: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'i-useLoggerProvider kumele isetshenziswe ngaphakathi kwe-LoggerProvider',
  'solid.error.oauthFailed': 'Ukungena ngemvume kwe-OAuth kwehlulekile',
  'solid.error.useRouterOutsideProvider':
    'Ayikho i-router lapha. Sebenzisa `MoleculeRouterProvider` kusukela ku-routing bond (`@molecule/app-routing-solid-router`) njenge `root` ye-router, noma udlulisele `router` ku `MoleculeProvider`. Uma uhlelo lokusebenza seluvele lukwenza lokhu, i-routing bond yalo indala kunalokhu kubopha: yibuyekeze (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'Akukho ukubuka okuqondiswe lapha. I-Solid Router inikeza ingxenye yomzila umzila wayo ohlanganisiwe njenge `props.children`: sebenzisa lokhu njenge `component` yomzila, noma udlulise ikhasi njengezingane.',
  'solid.error.useStoreOutsideProvider':
    'i-useStateProvider kumele isetshenziswe ngaphakathi kwe-StateProvider',
  'solid.error.useStorageOutsideProvider':
    'i-useStorageProvider kumele isetshenziswe ngaphakathi kwe-StorageProvider',
  'solid.error.useThemeOutsideProvider':
    'i-useThemeProvider kumele isetshenziswe ngaphakathi kwe-ThemeProvider',
}
