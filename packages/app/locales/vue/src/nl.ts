import type { VueTranslations } from './types.js'

/** Vue translations for Dutch. */
export const nl: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Geen router hier. Wikkel de app in `MoleculeRouterProvider` van de routing bond (`@molecule/app-routing-vue-router`), of geef `router` door aan `moleculePlugin`. Als de app dit al doet, is de routing bond ouder dan deze binding: update deze (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Deze routing-binding heeft geen gerouteerde weergave om hier weer te geven: geef de pagina in plaats daarvan door als children. Als de app routeert met `@molecule/app-routing-vue-router`, is die binding ouder dan deze binding: update deze (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider moet binnen een StateProvider worden gebruikt',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider moet binnen een ThemeProvider worden gebruikt',
  'vue.error.useAuthOutsideProvider': 'useAuthClient moet binnen een AuthProvider worden gebruikt',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider moet binnen een StorageProvider worden gebruikt',
  'vue.error.useHttpOutsideProvider': 'useHttpClient moet binnen een HttpProvider worden gebruikt',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider moet binnen een LoggerProvider worden gebruikt',
  'vue.error.useToastOutsideProvider': 'useToast moet binnen een ToastProvider worden gebruikt',
  'vue.error.unsupportedMethod': 'Niet-ondersteunde methode: {{method}}',
  'vue.error.useChatOutsideProvider':
    'useChatProvider moet binnen een ChatProvider worden gebruikt',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider moet binnen een EditorProvider worden gebruikt',
  'vue.error.oauthFailed': 'OAuth-aanmelding mislukt',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider moet binnen een PreviewProvider worden gebruikt.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider moet binnen een WorkspaceProvider worden gebruikt.',
}
