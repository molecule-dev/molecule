import type { VueTranslations } from './types.js'

/** Vue translations for Macedonian. */
export const mk: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Нема рутер овде. Завиткајте ја апликацијата во `MoleculeRouterProvider` од врската за рутирање (`@molecule/app-routing-vue-router`), или предадете го `router` на `moleculePlugin`. Ако апликацијата веќе го прави ова, нејзината врска за рутирање е постара од ова поврзување: ажурирајте го (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Оваа врска за насочување нема рутиран приказ за рендерирање тука: наместо тоа, пренесете ја страницата како деца. Ако апликацијата насочува со `@molecule/app-routing-vue-router`, таа врска е постара од ова поврзување: ажурирајте ја (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider мора да се користи внатре во StateProvider',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider мора да се користи внатре во ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient мора да се користи внатре во AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider мора да се користи внатре во StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient мора да се користи внатре во HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider мора да се користи внатре во LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast мора да се користи внатре во ToastProvider',
  'vue.error.unsupportedMethod': 'Неподдржан метод: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider мора да се користи внатре во ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider мора да се користи во рамките на EditorProvider',
  'vue.error.oauthFailed': 'Најавувањето со OAuth не успеа',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider мора да се користи во рамките на PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider мора да се користи во рамките на WorkspaceProvider',
}
