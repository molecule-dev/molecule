import type { VueTranslations } from './types.js'

/** Vue translations for Azerbaijani. */
export const az: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Burada router yoxdur. Tətbiqi marşrutlaşdırma bağlantısından (`@molecule/app-routing-vue-router`) `MoleculeRouterProvider`-ə sarın və ya `router` `moleculePlugin`-ə ötürün. Əgər tətbiq bunu artıq edirsə, onun marşrutlaşdırma bağlantısı bu bağlantıdan daha köhnədir: onu yeniləyin (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Bu marşrutlaşdırma bağının burada göstəriləcək marşrutlaşdırılmış görünüşü yoxdur: səhifəni uşaq kimi ötürün. Əgər tətbiq `@molecule/app-routing-vue-router` ilə marşrutlaşdırırsa, həmin bağ bu bağlanmadan daha köhnədir: onu yeniləyin (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider StateProvider daxilində istifadə olunmalıdır',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider daxilində istifadə olunmalıdır',
  'vue.error.useAuthOutsideProvider': 'useAuthClient AuthProvider daxilində istifadə olunmalıdır',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider daxilində istifadə olunmalıdır',
  'vue.error.useHttpOutsideProvider': 'useHttpClient HttpProvider daxilində istifadə olunmalıdır',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider daxilində istifadə olunmalıdır',
  'vue.error.useToastOutsideProvider': 'useToast ToastProvider daxilində istifadə olunmalıdır',
  'vue.error.unsupportedMethod': 'Dəstəklənməyən metod: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ChatProvider daxilində istifadə edilməlidir',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider daxilində istifadə olunmalıdır',
  'vue.error.oauthFailed': 'OAuth girişi uğursuz oldu',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider, PreviewProvider daxilində istifadə olunmalıdır',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider daxilində istifadə olunmalıdır',
}
