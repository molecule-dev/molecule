import type { AngularTranslations } from './types.js'

/** Angular translations for Kyrgyz. */
export const ky: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ChatProvider ичинде колдонулушу керек',
  'angular.error.useAuthOutsideProvider': 'useAuthClient AuthProvider ичинде колдонулушу керек',
  'angular.error.oauthFailed': 'OAuth кирүүсү ишке ашкан жок',
  'angular.error.unsupportedMethod': 'Колдоого алынбаган ыкма: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider StateProvider ичинде колдонулушу керек',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider ичинде колдонулушу керек',
  'angular.error.useHttpOutsideProvider': 'useHttpClient HttpProvider ичинде колдонулушу керек',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider ичинде колдонулушу керек',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider ичинде колдонулушу керек',
  'angular.error.useRouterOutsideProvider':
    "Бул жерде роутер жок. Angular'дын `provideRouter(routes)` кийин, маршруттоо байланышынан (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` колдонмонун провайдерлерине кошуңуз же `router` `provideMolecule` өткөрүп бериңиз. Эгер колдонмо муну мурунтан эле жасаса, анын маршруттоо байланышы бул байланыштан эски: аны жаңыртыңыз (`npm install @molecule/app-routing-angular-router@latest`).",
  'angular.error.noRoutedView':
    'Бул маршруттоо байланышынын бул жерде көрсөтүү үчүн маршруттоо көрүнүшү жок: анын ордуна баракты балдар катары өткөрүп бериңиз. Эгерде колдонмо `@molecule/app-routing-angular-router` менен маршруттаса, ал байланыш бул байланыштан эски: аны жаңыртыңыз (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ичинде колдонулушу керек',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider ичинде колдонулушу керек',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ичинде колдонулушу керек',
}
