import type { AngularTranslations } from './types.js'

/** Angular translations for Hindi. */
export const hi: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider का उपयोग ChatProvider के अंदर किया जाना चाहिए',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient का उपयोग AuthProvider के भीतर ही किया जाना चाहिए।',
  'angular.error.oauthFailed': 'OAuth लॉगिन विफल',
  'angular.error.unsupportedMethod': 'असमर्थित विधि: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider का उपयोग StateProvider के भीतर ही किया जाना चाहिए।',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider का उपयोग EditorProvider के अंदर किया जाना चाहिए',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient का उपयोग HttpProvider के अंदर किया जाना चाहिए',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider का उपयोग LoggerProvider के अंदर किया जाना चाहिए',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider का उपयोग PreviewProvider के अंदर किया जाना चाहिए',
  'angular.error.useRouterOutsideProvider':
    'यहां कोई राउटर नहीं है। एंगुलर के `provideRouter(routes)` के बाद, ऐप के प्रदाताओं में रूटिंग बॉन्ड (`@molecule/app-routing-angular-router`) से `provideMoleculeRouter()` जोड़ें, या `provideMolecule` को `router` पास करें।',
  'angular.error.noRoutedView':
    'इस राउटिंग बॉन्ड में यहां रेंडर करने के लिए कोई राउटेड व्यू नहीं है: इसके बजाय पेज को चाइल्ड के रूप में पास करें।',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider का उपयोग StorageProvider के अंदर किया जाना चाहिए',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider का उपयोग ThemeProvider के अंदर किया जाना चाहिए',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider का उपयोग WorkspaceProvider के अंदर किया जाना चाहिए',
}
