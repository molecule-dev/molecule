import type { VueTranslations } from './types.js'

/** Vue translations for af. */
export const af: Partial<VueTranslations> = {
  'vue.error.unsupportedMethod': 'Nie-ondersteunde metode: {{method}}',
  'vue.error.useRouterOutsideProvider':
    'Geen router hier nie. Draai die toepassing in `MoleculeRouterProvider` toe vanaf die roeteringsbinding (`@molecule/app-routing-vue-router`), of gee `router` deur aan `moleculePlugin`.',
  'vue.error.noRoutedView':
    'Hierdie roeteringsbinding het geen gerouteerde aansig om hier te lewer nie: gee eerder die bladsy as kinders deur.',
  'vue.error.useStoreOutsideProvider': "useStateProvider moet binne 'n StateProvider gebruik word.",
  'vue.error.useThemeOutsideProvider': "useThemeProvider moet binne 'n Temaverskaffer gebruik word",
  'vue.error.useAuthOutsideProvider': "useAuthClient moet binne 'n AuthProvider gebruik word",
  'vue.error.useStorageOutsideProvider':
    "useStorageProvider moet binne 'n StorageProvider gebruik word.",
  'vue.error.useHttpOutsideProvider': "useHttpClient moet binne 'n HttpProvider gebruik word",
  'vue.error.useLoggerOutsideProvider':
    "useLoggerProvider moet binne 'n LoggerProvider gebruik word",
  'vue.error.useToastOutsideProvider': "useToast moet binne 'n ToastProvider gebruik word",
  'vue.error.useChatOutsideProvider': "useChatProvider moet binne 'n ChatProvider gebruik word.",
  'vue.error.useEditorOutsideProvider':
    "useEditorProvider moet binne 'n EditorProvider gebruik word.",
  'vue.error.oauthFailed': 'OAuth-aanmelding het misluk',
  'vue.error.usePreviewOutsideProvider':
    "usePreviewProvider moet binne 'n PreviewProvider gebruik word",
  'vue.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider moet binne 'n Werkruimteverskaffer gebruik word.",
}
