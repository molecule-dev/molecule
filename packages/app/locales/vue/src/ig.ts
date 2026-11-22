import type { VueTranslations } from './types.js'

/** Vue translations for ig. */
export const ig: Partial<VueTranslations> = {
  'vue.error.unsupportedMethod': 'Usoro a na-akwado\\u0300 ya: {{method}}',
  'vue.error.useRouterOutsideProvider':
    'Enweghị rawụta ebe a. Kechie ngwa ahụ na `MoleculeRouterProvider` site na njikọ routing (`@molecule/app-routing-vue-router`), ma ọ bụ nyefee `router` gaa na `moleculePlugin`. Ọ bụrụ na ngwa ahụ emeela nke a, njikọ routing ya adịla ochie karịa njikọ a: melite ya (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Njikọ nhazi a enweghị echiche ngagharị iji gosi ebe a: gafere peeji ahụ dịka ụmụaka kama. Ọ bụrụ na ngwa ahụ na-aga site na `@molecule/app-routing-vue-router`, njikọ ahụ dịla ochie karịa njikọ a: melite ya (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': "A ga-eji useStateProvider n'ime Onye Na-enye Steeti",
  'vue.error.useThemeOutsideProvider': "A ga-eji useThemeProvider n'ime ThemeProvider",
  'vue.error.useAuthOutsideProvider': "A ga-eji useAuthClient mee ihe n'ime Onye Na-enye ikike",
  'vue.error.useStorageOutsideProvider':
    "A ga-eji onye na-enye nchekwa data (useStorageProvider) n'ime onye na-enye nchekwa data",
  'vue.error.useHttpOutsideProvider': "A ga-eji useHttpClient mee ihe n'ime HttpProvider",
  'vue.error.useLoggerOutsideProvider': "A ga-eji useLoggerProvider n'ime LoggerProvider",
  'vue.error.useToastOutsideProvider': "A ga-eji Toast mee ihe n'ime Onye Na-enye Toast",
  'vue.error.useChatOutsideProvider': "A ga-eji useChatProvider n'ime ChatProvider",
  'vue.error.useEditorOutsideProvider': "A ga-eji useEditorProvider n'ime Onye Na-enye Editor",
  'vue.error.oauthFailed': 'Nbanye OAuth agaghị arụ ọrụ',
  'vue.error.usePreviewOutsideProvider': "A ga-eji usePreviewProvider n'ime PreviewProvider",
  'vue.error.useWorkspaceOutsideProvider':
    "A ga-eji onye na-enye ọrụ useWorkspaceProvider n'ime onye na-enye ọrụ",
}
