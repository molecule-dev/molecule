import type { ReactTranslations } from './types.js'

/** React translations for Hindi. */
export const hi: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion घटकों का उपयोग Accordion के अंदर किया जाना चाहिए',
  'react.error.useAuthOutsideProvider':
    'useAuthClient का उपयोग AuthProvider के अंदर किया जाना चाहिए',
  'react.error.useChatOutsideProvider':
    'useChatProvider का उपयोग ChatProvider के अंदर किया जाना चाहिए',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider का उपयोग EditorProvider के अंदर किया जाना चाहिए',
  'react.error.useHttpOutsideProvider':
    'useHttpClient का उपयोग HttpProvider के अंदर किया जाना चाहिए',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider का उपयोग LoggerProvider के अंदर किया जाना चाहिए',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider का उपयोग PreviewProvider के अंदर किया जाना चाहिए',
  'react.error.useRouterOutsideProvider':
    'यहां कोई राउटर नहीं है। ऐप के राउटिंग बॉन्ड से एक राउटर कंपोनेंट माउंट करें ( `@molecule/app-routing-react-router` से `BrowserRouter` ), या `MoleculeProvider` को `router` पास करें। यदि ऐप पहले से ही ऐसा करता है, तो उसका राउटिंग बॉन्ड इस बाइंडिंग से पुराना है: इसे अपडेट करें (`npm install @molecule/app-routing-react-router@latest`)।',
  'react.error.noRoutedView':
    'इस राउटिंग बॉन्ड में रेंडर करने के लिए कोई राउटेड व्यू नहीं है: इसके बजाय पेज को चाइल्ड के रूप में पास करें। यदि ऐप `@molecule/app-routing-react-router` के साथ राउट करता है, तो वह बॉन्ड इस बाइंडिंग से पुराना है: इसे अपडेट करें (`npm install @molecule/app-routing-react-router@latest`)।',
  'react.error.useStoreOutsideProvider':
    'useStateProvider का उपयोग StateProvider के अंदर किया जाना चाहिए',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider का उपयोग StorageProvider के अंदर किया जाना चाहिए',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider का उपयोग ThemeProvider के अंदर किया जाना चाहिए',
  'react.error.useToastOutsideProvider': 'useToast का उपयोग ToastProvider के अंदर किया जाना चाहिए',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider का उपयोग WorkspaceProvider के अंदर किया जाना चाहिए',
  'react.error.unsupportedMethod': 'असमर्थित विधि: {{method}}',
  'react.error.oauthFailed': 'OAuth लॉगिन विफल रहा',
}
