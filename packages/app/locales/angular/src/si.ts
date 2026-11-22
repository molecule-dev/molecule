import type { AngularTranslations } from './types.js'

/** Angular translations for Sinhala. */
export const si: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ChatProvider තුළ භාවිතා කළ යුතුය',
  'angular.error.useAuthOutsideProvider': 'useAuthClient AuthProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'angular.error.oauthFailed': 'OAuth පුරනය වීම අසාර්ථක විය',
  'angular.error.unsupportedMethod': 'සහාය නොදක්වන ක්‍රමය: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider StateProvider එකක් තුළ භාවිතා කළ යුතුය.',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider EditorProvider තුළ භාවිතා කළ යුතුය',
  'angular.error.useHttpOutsideProvider': 'useHttpClient HttpProvider තුළ භාවිතා කළ යුතුය',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider LoggerProvider තුළ භාවිතා කළ යුතුය',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider තුළ භාවිතා කළ යුතුය',
  'angular.error.useRouterOutsideProvider':
    'මෙහි රවුටරයක් නොමැත. Angular හි `provideRouter(routes)` ට පසුව, රවුටින් බන්ධනයෙන් (`@molecule/app-routing-angular-router`) යෙදුමේ සපයන්නන් වෙත `provideMoleculeRouter()` එක් කරන්න, නැතහොත් `provideMolecule` වෙත `router` යවන්න. යෙදුම දැනටමත් මෙය කරන්නේ නම්, එහි රවුටින් බන්ධනය මෙම බන්ධනයට වඩා පැරණි ය: එය යාවත්කාලීන කරන්න (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'මෙම රවුටින් බන්ධනයට මෙහි විදැහුම් කිරීමට රවුටඩ් දසුනක් නොමැත: ඒ වෙනුවට පිටුව ළමා ලෙස යවන්න. යෙදුම `@molecule/app-routing-angular-router` සමඟ රවුට් කරන්නේ නම්, එම බන්ධනය මෙම බන්ධනයට වඩා පැරණි ය: එය යාවත්කාලීන කරන්න (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider තුළ භාවිතා කළ යුතුය',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider තුළ භාවිතා කළ යුතුය',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider තුළ භාවිතා කළ යුතුය',
}
