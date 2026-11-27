import type { VueTranslations } from './types.js'

/** Vue translations for Malayalam. */
export const ml: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'ഇവിടെ റൂട്ടർ ഇല്ല. റൂട്ടിംഗ് ബോണ്ടിൽ നിന്ന് (`@molecule/app-routing-vue-router`) ആപ്പ് `MoleculeRouterProvider`-ൽ പൊതിയുക, അല്ലെങ്കിൽ `moleculePlugin`-ലേക്ക് `router` നൽകുക. ആപ്പ് ഇതിനകം ഇത് ചെയ്യുന്നുണ്ടെങ്കിൽ, അതിന്റെ റൂട്ടിംഗ് ബോണ്ട് ഈ ബൈൻഡിംഗിനേക്കാൾ പഴയതാണ്: അത് അപ്ഡേറ്റ് ചെയ്യുക (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'ഈ റൂട്ടിംഗ് ബോണ്ടിന് ഇവിടെ റെൻഡർ ചെയ്യാൻ റൂട്ട് ചെയ്ത വ്യൂ ഇല്ല: പകരം പേജ് ചിൽഡ്രൻ ആയി നൽകുക. ആപ്പ് `@molecule/app-routing-vue-router` ഉപയോഗിച്ച് റൂട്ട് ചെയ്യുകയാണെങ്കിൽ, ആ ബോണ്ട് ഈ ബൈൻഡിംഗിനേക്കാൾ പഴയതാണ്: അത് അപ്ഡേറ്റ് ചെയ്യുക (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider ഒരു StateProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ഒരു ThemeProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'vue.error.useAuthOutsideProvider': 'useAuthClient ഒരു AuthProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider ഒരു StorageProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'vue.error.useHttpOutsideProvider': 'useHttpClient ഒരു HttpProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider ഒരു LoggerProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'vue.error.useToastOutsideProvider': 'useToast ഒരു ToastProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'vue.error.unsupportedMethod': 'പിന്തുണയ്ക്കാത്ത രീതി: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ഒരു ChatProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider ഒരു EditorProvider-ൽ തന്നെ ഉപയോഗിക്കണം.',
  'vue.error.oauthFailed': 'OAuth ലോഗിൻ പരാജയപ്പെട്ടു',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider ഒരു PreviewProvider-ൽ തന്നെ ഉപയോഗിക്കണം.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ഒരു WorkspaceProvider-നുള്ളിൽ തന്നെ ഉപയോഗിക്കണം.',
}
