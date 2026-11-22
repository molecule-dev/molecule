import type { VueTranslations } from './types.js'

/** Vue translations for Serbian. */
export const sr: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Овде нема рутера. Умотајте апликацију у `MoleculeRouterProvider` из везе рутирања (`@molecule/app-routing-vue-router`) или проследите `router` до `moleculePlugin`. Ако апликација већ ово ради, њена веза рутирања је старија од ове везе: ажурирајте је (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Ова веза рутирања нема усмерен приказ за приказивање овде: уместо тога проследите страницу као потомке. Ако апликација рутира са `@molecule/app-routing-vue-router`, та веза је старија од ове везе: ажурирајте је (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider мора да се користи унутар StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider мора да се користи унутар ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient мора да се користи унутар AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider мора да се користи унутар StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient мора да се користи унутар HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider мора да се користи унутар LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast мора да се користи унутар ToastProvider',
  'vue.error.unsupportedMethod': 'Неподржани метод: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider мора да се користи унутар ChatProvider-а',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider мора бити коришћен унутар EditorProvider-а',
  'vue.error.oauthFailed': 'Пријављивање путем OAuth-а није успело',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider мора се користити унутар PreviewProvider-а',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider мора се користити унутар WorkspaceProvider-а',
}
