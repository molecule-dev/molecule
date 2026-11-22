import type { VueTranslations } from './types.js'

/** Vue translations for Marathi. */
export const mr: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'येथे राउटर नाही. अॅपला राउटिंग बाँड (`@molecule/app-routing-vue-router`) मधील `MoleculeRouterProvider` मध्ये गुंडाळा, किंवा `moleculePlugin` ला `router` पास करा.',
  'vue.error.noRoutedView':
    'या राउटिंग बाँडमध्ये येथे रेंडर करण्यासाठी कोणताही राउटेड व्ह्यू नाही: त्याऐवजी पेजला चिल्ड्रेन म्हणून पास करा.',
  'vue.error.useStoreOutsideProvider': 'useStateProvider हे StateProvider च्या आत वापरले पाहिजे',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider हे ThemeProvider च्या आत वापरले पाहिजे',
  'vue.error.useAuthOutsideProvider': 'useAuthClient हे AuthProvider च्या आत वापरले पाहिजे',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider हे StorageProvider च्या आत वापरले पाहिजे',
  'vue.error.useHttpOutsideProvider': 'useHttpClient हे HttpProvider च्या आत वापरले पाहिजे',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider हे LoggerProvider च्या आत वापरले पाहिजे',
  'vue.error.useToastOutsideProvider': 'useToast हे ToastProvider च्या आत वापरले पाहिजे',
  'vue.error.unsupportedMethod': 'असमर्थित पद्धत: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider हे ChatProvider मध्ये वापरले पाहिजे',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider चा वापर EditorProvider च्या आतच केला पाहिजे.',
  'vue.error.oauthFailed': 'OAuth लॉगिन अयशस्वी झाले',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider चा वापर PreviewProvider च्या आतच केला पाहिजे.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider चा वापर WorkspaceProvider च्या आतच केला पाहिजे.',
}
