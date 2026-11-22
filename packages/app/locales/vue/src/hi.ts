import type { VueTranslations } from './types.js'

/** Vue translations for Hindi. */
export const hi: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'यहां कोई राउटर नहीं है। ऐप को राउटिंग बॉन्ड (`@molecule/app-routing-vue-router`) से `MoleculeRouterProvider` में रैप करें, या `moleculePlugin` को `router` पास करें। यदि ऐप पहले से ही ऐसा कर रहा है, तो इसका राउटिंग बॉन्ड इस बाइंडिंग से पुराना है: इसे अपडेट करें (`npm install @molecule/app-routing-vue-router@latest`)।',
  'vue.error.noRoutedView':
    'इस राउटिंग बॉन्ड में रेंडर करने के लिए कोई राउटेड व्यू नहीं है: इसके बजाय पेज को चाइल्ड के रूप में पास करें। यदि ऐप `@molecule/app-routing-vue-router` के साथ राउट करता है, तो वह बॉन्ड इस बाइंडिंग से पुराना है: इसे अपडेट करें (`npm install @molecule/app-routing-vue-router@latest`)।',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider का उपयोग StateProvider के अंदर किया जाना चाहिए',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider का उपयोग ThemeProvider के अंदर किया जाना चाहिए',
  'vue.error.useAuthOutsideProvider': 'useAuthClient का उपयोग AuthProvider के अंदर किया जाना चाहिए',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider का उपयोग StorageProvider के अंदर किया जाना चाहिए',
  'vue.error.useHttpOutsideProvider': 'useHttpClient का उपयोग HttpProvider के अंदर किया जाना चाहिए',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider का उपयोग LoggerProvider के अंदर किया जाना चाहिए',
  'vue.error.useToastOutsideProvider': 'useToast का उपयोग ToastProvider के अंदर किया जाना चाहिए',
  'vue.error.unsupportedMethod': 'असमर्थित विधि: {{method}}',
  'vue.error.useChatOutsideProvider':
    'useChatProvider का उपयोग ChatProvider के अंदर किया जाना चाहिए',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider का उपयोग EditorProvider के भीतर ही किया जाना चाहिए।',
  'vue.error.oauthFailed': 'OAuth लॉगिन विफल',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider का उपयोग PreviewProvider के भीतर ही किया जाना चाहिए।',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider का उपयोग WorkspaceProvider के भीतर ही किया जाना चाहिए।',
}
