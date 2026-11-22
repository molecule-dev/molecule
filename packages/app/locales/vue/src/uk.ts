import type { VueTranslations } from './types.js'

/** Vue translations for Ukrainian. */
export const uk: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    "Тут немає маршрутизатора. Оберніть застосунок у `MoleculeRouterProvider` з маршрутизаційного зв'язку (`@molecule/app-routing-vue-router`) або передайте `router` до `moleculePlugin`. Якщо застосунок вже це робить, його маршрутизаційний зв'язок старший за цей зв'язок: оновіть його (`npm install @molecule/app-routing-vue-router@latest`).",
  'vue.error.noRoutedView':
    "Цей зв'язок маршрутизації не має маршрутизованого представлення для відображення тут: передайте сторінку як дочірні елементи. Якщо програма маршрутизується з `@molecule/app-routing-vue-router`, цей зв'язок старший за цей зв'язок: оновіть його (`npm install @molecule/app-routing-vue-router@latest`).",
  'vue.error.useStoreOutsideProvider':
    'useStateProvider повинен використовуватися всередині StateProvider',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider повинен використовуватися всередині ThemeProvider',
  'vue.error.useAuthOutsideProvider':
    'useAuthClient повинен використовуватися всередині AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider повинен використовуватися всередині StorageProvider',
  'vue.error.useHttpOutsideProvider':
    'useHttpClient повинен використовуватися всередині HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider повинен використовуватися всередині LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast повинен використовуватися всередині ToastProvider',
  'vue.error.unsupportedMethod': 'Непідтримуваний метод: {{method}}',
  'vue.error.useChatOutsideProvider':
    'useChatProvider повинен використовуватися всередині ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider має використовуватися всередині EditorProvider',
  'vue.error.oauthFailed': 'Не вдалося ввійти через OAuth',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider має використовуватися всередині PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider має використовуватися всередині WorkspaceProvider',
}
