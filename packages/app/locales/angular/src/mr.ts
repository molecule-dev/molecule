import type { AngularTranslations } from './types.js'

/** Angular translations for Marathi. */
export const mr: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider हे ChatProvider मध्ये वापरले पाहिजे',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient चा वापर AuthProvider च्या आतच केला पाहिजे.',
  'angular.error.oauthFailed': 'OAuth लॉगिन अयशस्वी झाले',
  'angular.error.unsupportedMethod': 'असमर्थित पद्धत: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider चा वापर StateProvider च्या आतच केला पाहिजे.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider हे EditorProvider मध्ये वापरले पाहिजे',
  'angular.error.useHttpOutsideProvider': 'useHttpClient हे HttpProvider मध्ये वापरले पाहिजे',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider हे LoggerProvider मध्ये वापरले पाहिजे',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider हे PreviewProvider मध्ये वापरले पाहिजे',
  'angular.error.useRouterOutsideProvider':
    'येथे राउटर नाही. Angular च्या `provideRouter(routes)` नंतर, राउटिंग बाँड (`@molecule/app-routing-angular-router`) मधून `provideMoleculeRouter()` अ‍ॅपच्या प्रोव्हायडर्समध्ये जोडा, किंवा `provideMolecule` ला `router` पास करा. जर अ‍ॅप आधीच हे करत असेल, तर त्याचा राउटिंग बाँड या बाइंडिंगपेक्षा जुना आहे: तो अपडेट करा (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'या राउटिंग बाँडमध्ये येथे रेंडर करण्यासाठी कोणताही राउटेड व्ह्यू नाही: त्याऐवजी पेज चिल्ड्रेन म्हणून पास करा. जर ॲप `@molecule/app-routing-angular-router` वापरून राउट करत असेल, तर तो बाँड या बाइंडिंगपेक्षा जुना आहे: त्याला अपडेट करा (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider हे StorageProvider मध्ये वापरले पाहिजे',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider हे ThemeProvider मध्ये वापरले पाहिजे',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider हे WorkspaceProvider मध्ये वापरले पाहिजे',
}
