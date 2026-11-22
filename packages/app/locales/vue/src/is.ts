import type { VueTranslations } from './types.js'

/** Vue translations for Icelandic. */
export const is: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Engin leið hér. Vefjið appinu inn í `MoleculeRouterProvider` úr leiðartengingunni (`@molecule/app-routing-vue-router`), eða sendið `router` til `moleculePlugin`. Ef appið gerir þetta nú þegar, þá er leiðartenging þess eldra en þessi tenging: uppfærið hana (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Þessi leiðartenging hefur enga leiðarsýn til að birta hér: sendið síðuna sem undirsíður í staðinn. Ef appið leiðir með `@molecule/app-routing-vue-router`, þá er sú tenging eldri en þessi tenging: uppfærið hana (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider verður að nota innan StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider verður að nota innan ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient verður að nota innan AuthProvider',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider verður að nota innan StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient verður að nota innan HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider verður að nota innan LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast verður að nota innan ToastProvider',
  'vue.error.unsupportedMethod': 'Óstudd aðferð: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider verður að nota innan ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider verður að vera notað innan EditorProvider',
  'vue.error.oauthFailed': 'OAuth innskráning mistókst',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider verður að vera notað innan PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider verður að vera notaður innan WorkspaceProvider',
}
