import type { AngularTranslations } from './types.js'

/** Angular translations for Telugu. */
export const te: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ChatProvider లోపల ఉపయోగించాలి',
  'angular.error.useAuthOutsideProvider': 'AuthProvider లోపల useAuthClient ను ఉపయోగించాలి',
  'angular.error.oauthFailed': 'OAuth లాగిన్ విఫలమైంది',
  'angular.error.unsupportedMethod': 'మద్దతు లేని పద్ధతి: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProviderను తప్పనిసరిగా StateProvider లోపల ఉపయోగించాలి',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider EditorProvider లోపల ఉపయోగించాలి',
  'angular.error.useHttpOutsideProvider': 'useHttpClient HttpProvider లోపల ఉపయోగించాలి',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider LoggerProvider లోపల ఉపయోగించాలి',
  'angular.error.usePreviewOutsideProvider': 'usePreviewProvider PreviewProvider లోపల ఉపయోగించాలి',
  'angular.error.useRouterOutsideProvider':
    'ఇక్కడ రౌటర్ లేదు. రౌటింగ్ బాండ్ (`@molecule/app-routing-angular-router`) నుండి `provideMoleculeRouter()` ను, Angular యొక్క `provideRouter(routes)` తర్వాత యాప్ ప్రొవైడర్లకు జోడించండి, లేదా `provideMolecule` కు `router` పంపండి. ఒకవేళ యాప్ ఇప్పటికే ఇలా చేస్తుంటే, దాని రౌటింగ్ బాండ్ ఈ బైండింగ్ కంటే పాతది: దానిని అప్‌డేట్ చేయండి (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'ఈ రూటింగ్ బాండ్‌లో ఇక్కడ రెండర్ చేయడానికి రూట్ చేయబడిన వ్యూ ఏదీ లేదు: దానికి బదులుగా పేజీని చిల్డ్రన్‌గా పంపండి. ఒకవేళ యాప్ `@molecule/app-routing-angular-router` తో రూట్ చేస్తే, ఆ బాండ్ ఈ బైండింగ్ కంటే పాతది: దానిని అప్‌డేట్ చేయండి (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider': 'useStorageProvider StorageProvider లోపల ఉపయోగించాలి',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider లోపల ఉపయోగించాలి',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider లోపల ఉపయోగించాలి',
}
