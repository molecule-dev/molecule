import type { VueTranslations } from './types.js'

/** Vue translations for German. */
export const de: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Hier ist kein Router vorhanden. Binden Sie die Anwendung in `MoleculeRouterProvider` aus dem Routing-Binding (`@molecule/app-routing-vue-router`) ein oder übergeben Sie `router` an `moleculePlugin`. Falls die Anwendung dies bereits tut, ist ihr Routing-Binding älter als dieses: Aktualisieren Sie es (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Diese Routing-Bindung hat keine geroutete Ansicht, die hier gerendert werden kann: Übergeben Sie die Seite stattdessen als Kindelemente. Wenn die App mit `@molecule/app-routing-vue-router` routet, ist diese Bindung älter als diese: Aktualisieren Sie sie (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider muss innerhalb eines StateProvider verwendet werden',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider muss innerhalb eines ThemeProvider verwendet werden',
  'vue.error.useAuthOutsideProvider':
    'useAuthClient muss innerhalb eines AuthProvider verwendet werden',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider muss innerhalb eines StorageProvider verwendet werden',
  'vue.error.useHttpOutsideProvider':
    'useHttpClient muss innerhalb eines HttpProvider verwendet werden',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider muss innerhalb eines LoggerProvider verwendet werden',
  'vue.error.useToastOutsideProvider':
    'useToast muss innerhalb eines ToastProvider verwendet werden',
  'vue.error.unsupportedMethod': 'Nicht unterstützte Methode: {{method}}',
  'vue.error.useChatOutsideProvider':
    'useChatProvider muss innerhalb eines ChatProvider verwendet werden',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider muss innerhalb eines EditorProviders verwendet werden.',
  'vue.error.oauthFailed': 'OAuth-Anmeldung fehlgeschlagen',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider muss innerhalb eines PreviewProvider verwendet werden.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider muss innerhalb eines WorkspaceProviders verwendet werden.',
}
