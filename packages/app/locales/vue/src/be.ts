import type { VueTranslations } from './types.js'

/** Vue translations for Belarusian. */
export const be: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Тут няма маршрутызатара. Абгарніце праграму ў `MoleculeRouterProvider` з маршрутызацыйнай сувязі (`@molecule/app-routing-vue-router`) або перадайце `router` у `moleculePlugin`. Калі праграма ўжо робіць гэта, яе маршрутызацыйная сувязь старэйшая за гэту прывязку: абнавіце яе (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Гэтая сувязь маршрутызацыі не мае маршрутызаванага прадстаўлення для рэндэрынгу тут: замест гэтага перадайце старонку як даччыныя элементы. Калі праграма маршрутызуецца з `@molecule/app-routing-vue-router`, гэтая сувязь старэйшая за гэту прывязку: абнавіце яе (`npm install @molecule/app-routing-vue-router@latest`).',
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
