import type { VueTranslations } from './types.js'

/** Vue translations for Slovenian. */
export const sl: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Tukaj ni usmerjevalnika. Aplikacijo zavijte v `MoleculeRouterProvider` iz usmerjevalne vezi (`@molecule/app-routing-vue-router`) ali pa `router` posredujte `moleculePlugin`. Če aplikacija to že počne, je njena usmerjevalna vez starejša od te vezi: posodobite jo (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Ta usmerjevalna vez nima usmerjenega pogleda za upodobitev: namesto tega stran posredujte kot podrejene elemente. Če aplikacija usmerja z `@molecule/app-routing-vue-router`, je ta vez starejša od te vezi: posodobite jo (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider je treba uporabiti znotraj StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider je treba uporabiti znotraj ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient je treba uporabiti znotraj AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider je treba uporabiti znotraj StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient je treba uporabiti znotraj HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider je treba uporabiti znotraj LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast je treba uporabiti znotraj ToastProvider',
  'vue.error.unsupportedMethod': 'Nepodprta metoda: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider je treba uporabiti znotraj ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider se mora uporabljati znotraj EditorProvider',
  'vue.error.oauthFailed': 'Prijava OAuth ni uspela',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider se mora uporabljati znotraj PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider se mora uporabljati znotraj WorkspaceProvider',
}
