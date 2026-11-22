import type { VueTranslations } from './types.js'

/** Vue translations for Hausa. */
export const ha: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    "Babu na'urar sadarwa a nan. Naɗa manhajar a cikin `MoleculeRouterProvider` daga haɗin haɗin gwiwa (`@molecule/app-routing-vue-router`), ko kuma wuce `router` zuwa `moleculePlugin`. Idan manhajar ta riga ta yi haka, haɗin haɗin gwiwa ta tsufa fiye da wannan haɗin gwiwa: sabunta shi (`npm install @molecule/app-routing-vue-router@latest`).",
  'vue.error.noRoutedView':
    "Wannan haɗin hanyar sadarwa ba shi da wani ra'ayi da za a nuna a nan: wuce shafin a matsayin yara maimakon haka. Idan manhajar ta yi tafiya tare da `@molecule/app-routing-vue-router`, wannan haɗin ya girmi wannan haɗin: sabunta shi (`npm install @molecule/app-routing-vue-router@latest`).",
  'vue.error.useStoreOutsideProvider':
    'Dole ne a yi amfani da useStateProvider a cikin StateProvider',
  'vue.error.useThemeOutsideProvider':
    'Dole ne a yi amfani da useThemeProvider a cikin ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'Dole ne a yi amfani da useAuthClient a cikin AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'Dole ne a yi amfani da useStorageProvider a cikin StorageProvider',
  'vue.error.useHttpOutsideProvider': 'Dole ne a yi amfani da useHttpClient a cikin HttpProvider',
  'vue.error.useLoggerOutsideProvider':
    'Dole ne a yi amfani da useLoggerProvider a cikin LoggerProvider',
  'vue.error.useToastOutsideProvider': 'Dole ne a yi amfani da useToast a cikin ToastProvider',
  'vue.error.unsupportedMethod': 'Hanyar da ba a tallafawa ba: {{method}}',
  'vue.error.useChatOutsideProvider': 'Dole ne a yi amfani da useChatProvider a cikin ChatProvider',
  'vue.error.useEditorOutsideProvider':
    'Dole ne a yi amfani da useEditorProvider a cikin Mai Ba da Edita',
  'vue.error.oauthFailed': 'Shiga OAuth ya gaza',
  'vue.error.usePreviewOutsideProvider':
    'Dole ne a yi amfani da usePreviewProvider a cikin PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'Dole ne a yi amfani da mai samar da amfani da wurin aiki a cikin mai samar da wurin aiki',
}
