import type { VueTranslations } from './types.js'

/** Vue translations for Polish. */
export const pl: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Brak routera. Opakuj aplikację w `MoleculeRouterProvider` z powiązania routingu (`@molecule/app-routing-vue-router`) lub przekaż `router` do `moleculePlugin`. Jeśli aplikacja już to robi, jej powiązanie routingu jest starsze niż to powiązanie: zaktualizuj je (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'To powiązanie routingu nie ma widoku routingu do renderowania w tym miejscu. Zamiast tego przekaż stronę jako potomną. Jeśli aplikacja kieruje za pomocą `@molecule/app-routing-vue-router`, to powiązanie jest starsze niż to powiązanie: zaktualizuj je (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider musi by\u0107 u\u017cywany wewn\u0105trz StateProvider',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider musi by\u0107 u\u017cywany wewn\u0105trz ThemeProvider',
  'vue.error.useAuthOutsideProvider':
    'useAuthClient musi by\u0107 u\u017cywany wewn\u0105trz AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider musi by\u0107 u\u017cywany wewn\u0105trz StorageProvider',
  'vue.error.useHttpOutsideProvider':
    'useHttpClient musi by\u0107 u\u017cywany wewn\u0105trz HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider musi by\u0107 u\u017cywany wewn\u0105trz LoggerProvider',
  'vue.error.useToastOutsideProvider':
    'useToast musi by\u0107 u\u017cywany wewn\u0105trz ToastProvider',
  'vue.error.unsupportedMethod': 'Nieobs\u0142ugiwana metoda: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider musi być używany wewnątrz ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider musi być używany w ramach EditorProvider',
  'vue.error.oauthFailed': 'Nieudane logowanie OAuth',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider musi być używany w PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musi być używany w WorkspaceProvider',
}
