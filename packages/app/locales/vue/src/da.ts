import type { VueTranslations } from './types.js'

/** Vue translations for Danish. */
export const da: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Ingen router her. Pak appen ind i `MoleculeRouterProvider` fra routingbindingen (`@molecule/app-routing-vue-router`), eller send `router` til `moleculePlugin`.',
  'vue.error.noRoutedView':
    'Denne routing-binding har ingen routed view at gengive her: send siden som underordnede i stedet.',
  'vue.error.useStoreOutsideProvider': 'useStateProvider skal bruges inden for en StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider skal bruges inden for en ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient skal bruges inden for en AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider skal bruges inden for en StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient skal bruges inden for en HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider skal bruges inden for en LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast skal bruges inden for en ToastProvider',
  'vue.error.unsupportedMethod': 'Ikke-understøttet metode: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider skal bruges inden for en ChatProvider',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider skal bruges i en EditorProvider',
  'vue.error.oauthFailed': 'OAuth-login mislykkedes',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider skal bruges i en PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider skal bruges inden for en WorkspaceProvider',
}
