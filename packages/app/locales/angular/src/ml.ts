import type { AngularTranslations } from './types.js'

/** Angular translations for Malayalam. */
export const ml: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ഒരു ChatProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'angular.error.useAuthOutsideProvider': 'useAuthClient ഒരു AuthProvider-ൽ തന്നെ ഉപയോഗിക്കണം.',
  'angular.error.oauthFailed': 'OAuth ലോഗിൻ പരാജയപ്പെട്ടു',
  'angular.error.unsupportedMethod': 'പിന്തുണയ്ക്കാത്ത രീതി: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider ഒരു StateProvider-നുള്ളിൽ തന്നെ ഉപയോഗിക്കണം.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider ഒരു EditorProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'angular.error.useHttpOutsideProvider': 'useHttpClient ഒരു HttpProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider ഒരു LoggerProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider ഒരു PreviewProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'angular.error.useRouterOutsideProvider':
    'ഇവിടെ റൂട്ടർ ഇല്ല. ആംഗുലറിന്റെ `provideRouter(routes)`-ന് ശേഷം, റൂട്ടിംഗ് ബോണ്ടിൽ നിന്ന് (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` ആപ്പിന്റെ ദാതാക്കളിലേക്ക് ചേർക്കുക, അല്ലെങ്കിൽ `router` മുതൽ `provideMolecule` വരെ പാസ് ചെയ്യുക. ആപ്പ് ഇതിനകം ഇത് ചെയ്യുന്നുണ്ടെങ്കിൽ, അതിന്റെ റൂട്ടിംഗ് ബോണ്ട് ഈ ബൈൻഡിംഗിനേക്കാൾ പഴയതാണ്: അത് അപ്ഡേറ്റ് ചെയ്യുക (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'ഈ റൂട്ടിംഗ് ബോണ്ടിന് ഇവിടെ റെൻഡർ ചെയ്യാൻ റൂട്ട് ചെയ്ത വ്യൂ ഇല്ല: പകരം പേജ് ചിൽഡ്രൻ ആയി നൽകുക. ആപ്പ് `@molecule/app-routing-angular-router` ഉപയോഗിച്ച് റൂട്ട് ചെയ്യുകയാണെങ്കിൽ, ആ ബോണ്ട് ഈ ബൈൻഡിംഗിനേക്കാൾ പഴയതാണ്: അത് അപ്ഡേറ്റ് ചെയ്യുക (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider ഒരു StorageProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider ഒരു ThemeProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ഒരു WorkspaceProvider-നുള്ളിൽ ഉപയോഗിക്കണം',
}
