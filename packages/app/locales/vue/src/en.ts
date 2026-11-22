import type { VueTranslations } from './types.js'

/** Vue translations for English. */
export const en: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'No router here. Wrap the app in `MoleculeRouterProvider` from the routing bond (`@molecule/app-routing-vue-router`), or pass `router` to `moleculePlugin`.',
  'vue.error.noRoutedView':
    'This routing bond has no routed view to render here: pass the page as children instead.',
  'vue.error.useStoreOutsideProvider': 'useStateProvider must be used within a StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider must be used within a ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient must be used within an AuthProvider',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider must be used within a StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient must be used within an HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider must be used within a LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast must be used within a ToastProvider',
  'vue.error.unsupportedMethod': 'Unsupported method: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider must be used within a ChatProvider',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider must be used within an EditorProvider',
  'vue.error.oauthFailed': 'OAuth login failed',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider must be used within a PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider must be used within a WorkspaceProvider',
}
