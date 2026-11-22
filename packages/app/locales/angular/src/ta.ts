import type { AngularTranslations } from './types.js'

/** Angular translations for Tamil. */
export const ta: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider ஒரு ChatProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient ஆனது AuthProvider-க்குள் பயன்படுத்தப்பட வேண்டும்.',
  'angular.error.oauthFailed': 'OAuth உள்நுழைவு தோல்வியடைந்தது',
  'angular.error.unsupportedMethod': 'ஆதரிக்கப்படாத முறை: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider என்பது ஒரு StateProvider-க்குள் பயன்படுத்தப்பட வேண்டும்.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider ஒரு EditorProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient ஒரு HttpProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider ஒரு LoggerProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider ஒரு PreviewProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'angular.error.useRouterOutsideProvider':
    'இங்கே ரூட்டர் இல்லை. ஆங்குலரின் `provideRouter(routes)` பிறகு, ஆப்பின் வழங்குநர்களுக்கு ரூட்டிங் பாண்டிலிருந்து (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` சேர்க்கவும், அல்லது `router` ஐ `provideMolecule` க்கு அனுப்பவும். ஆப் ஏற்கனவே இதைச் செய்தால், அதன் ரூட்டிங் பாண்ட் இந்த பைண்டிங்கை விடப் பழமையானது: அதைப் புதுப்பிக்கவும் (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'இந்த ரூட்டிங் பாண்டில் இங்கே ரெண்டர் செய்வதற்கு ரூட் செய்யப்பட்ட வியூ எதுவும் இல்லை: அதற்குப் பதிலாக, பக்கத்தை சில்ட்ரன்களாக அனுப்பவும். செயலியானது `@molecule/app-routing-angular-router` மூலம் ரூட் செய்தால், அந்த பாண்ட் இந்த பைண்டிங்கை விடப் பழமையானது: அதை அப்டேட் செய்யவும் (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider ஒரு StorageProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ஒரு ThemeProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ஒரு WorkspaceProvider க்குள் பயன்படுத்தப்பட வேண்டும்',
}
