import type { VueTranslations } from './types.js'

/** Vue translations for Bulgarian. */
export const bg: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Няма рутер тук. Обвийте приложението в `MoleculeRouterProvider` от връзката за маршрутизация (`@molecule/app-routing-vue-router`) или предайте `router` на `moleculePlugin`. Ако приложението вече прави това, неговата връзка за маршрутизация е по-стара от тази връзка: актуализирайте я (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Тази маршрутизираща връзка няма маршрутизиран изглед за рендиране тук: вместо това предайте страницата като деца. Ако приложението маршрутизира с `@molecule/app-routing-vue-router`, тази връзка е по-стара от това обвързване: актуализирайте я (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider трябва да се използва в StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider трябва да се използва в ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient трябва да се използва в AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider трябва да се използва в StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient трябва да се използва в HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider трябва да се използва в LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast трябва да се използва в ToastProvider',
  'vue.error.unsupportedMethod': 'Неподдържан метод: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider трябва да се използва в ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider трябва да се използва в рамките на EditorProvider',
  'vue.error.oauthFailed': 'Влизането чрез OAuth не бе успешно',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider трябва да се използва в рамките на PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider трябва да се използва в рамките на WorkspaceProvider',
}
