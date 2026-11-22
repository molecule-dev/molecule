import type { VueTranslations } from './types.js'

/** Vue translations for Belarusian. */
export const be: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Тут няма маршрутызатара. Абгарніце праграму ў `MoleculeRouterProvider` з маршрутызацыйнай сувязі (`@molecule/app-routing-vue-router`) або перадайце `router` у `moleculePlugin`.',
  'vue.error.noRoutedView':
    'Гэтая маршрутная сувязь не мае маршрутнага выгляду для рэндэрынгу: замест гэтага перадайце старонку як даччыныя элементы.',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider павінен выкарыстоўвацца ўнутры StateProvider',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider павінен выкарыстоўвацца ўнутры ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient павінен выкарыстоўвацца ўнутры AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider павінен выкарыстоўвацца ўнутры StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient павінен выкарыстоўвацца ўнутры HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider павінен выкарыстоўвацца ўнутры LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast павінен выкарыстоўвацца ўнутры ToastProvider',
  'vue.error.unsupportedMethod': 'Непадтрымліваемы метад: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider павінен выкарыстоўвацца ўнутры ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider павінен выкарыстоўвацца ўнутры EditorProvider',
  'vue.error.oauthFailed': 'Памылка ўваходу праз OAuth',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider павінен выкарыстоўвацца ўнутры PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider павінен выкарыстоўвацца ўнутры WorkspaceProvider',
}
