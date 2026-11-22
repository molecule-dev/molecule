import type { VueTranslations } from './types.js'

/** Vue translations for Hungarian. */
export const hu: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Nincs itt router. Csomagold be az alkalmazást `MoleculeRouterProvider`-be az útvonalválasztási kötelékből (`@molecule/app-routing-vue-router`), vagy add át `router` a `moleculePlugin`.',
  'vue.error.noRoutedView':
    'Ennek az útvonalválasztási kötvénynek nincs útvonalnézete, amelyet itt megjeleníthetne: ehelyett adja át az oldalt gyermekként.',
  'vue.error.useStoreOutsideProvider': 'A useStateProvider-t StateProvider-en belül kell használni',
  'vue.error.useThemeOutsideProvider': 'A useThemeProvider-t ThemeProvider-en belül kell használni',
  'vue.error.useAuthOutsideProvider': 'A useAuthClient-et AuthProvider-en belül kell használni',
  'vue.error.useStorageOutsideProvider':
    'A useStorageProvider-t StorageProvider-en belül kell használni',
  'vue.error.useHttpOutsideProvider': 'A useHttpClient-et HttpProvider-en belül kell használni',
  'vue.error.useLoggerOutsideProvider':
    'A useLoggerProvider-t LoggerProvider-en belül kell használni',
  'vue.error.useToastOutsideProvider': 'A useToast-ot ToastProvider-en belül kell használni',
  'vue.error.unsupportedMethod': 'Nem támogatott metódus: {{method}}',
  'vue.error.useChatOutsideProvider': 'A useChatProvider-t ChatProvider-en belül kell használni',
  'vue.error.useEditorOutsideProvider':
    'A useEditorProvider paramétert egy EditorProvider-en belül kell használni.',
  'vue.error.oauthFailed': 'OAuth bejelentkezés sikertelen',
  'vue.error.usePreviewOutsideProvider':
    'A usePreviewProvider paramétert PreviewProvider-en belül kell használni.',
  'vue.error.useWorkspaceOutsideProvider':
    'A useWorkspaceProvider paramétert egy WorkspaceProvider-en belül kell használni.',
}
