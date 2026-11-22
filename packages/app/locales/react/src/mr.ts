import type { ReactTranslations } from './types.js'

/** React translations for Marathi. */
export const mr: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'Accordion घटक हे Accordion मध्ये वापरले पाहिजेत',
  'react.error.useAuthOutsideProvider': 'useAuthClient हे AuthProvider मध्ये वापरले पाहिजे',
  'react.error.useChatOutsideProvider': 'useChatProvider हे ChatProvider मध्ये वापरले पाहिजे',
  'react.error.useEditorOutsideProvider': 'useEditorProvider हे EditorProvider मध्ये वापरले पाहिजे',
  'react.error.useHttpOutsideProvider': 'useHttpClient हे HttpProvider मध्ये वापरले पाहिजे',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider हे LoggerProvider मध्ये वापरले पाहिजे',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider हे PreviewProvider मध्ये वापरले पाहिजे',
  'react.error.useRouterOutsideProvider':
    'येथे राउटर नाही. अॅपच्या राउटिंग बाँडमधून एक राउटर घटक माउंट करा ( `@molecule/app-routing-react-router` मधील `BrowserRouter` ), किंवा `MoleculeProvider` ला `router` पास करा. जर अॅप आधीच असे करत असेल, तर त्याचा राउटिंग बाँड या बाइंडिंगपेक्षा जुना आहे: तो अपडेट करा (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'या राउटिंग बाँडमध्ये येथे रेंडर करण्यासाठी कोणताही राउटेड व्ह्यू नाही: त्याऐवजी पेज चिल्ड्रेन म्हणून पास करा. जर ॲप `@molecule/app-routing-react-router` वापरून राउट करत असेल, तर तो बाँड या बाइंडिंगपेक्षा जुना आहे: त्याला अपडेट करा (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider हे StateProvider मध्ये वापरले पाहिजे',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider हे StorageProvider मध्ये वापरले पाहिजे',
  'react.error.useThemeOutsideProvider': 'useThemeProvider हे ThemeProvider मध्ये वापरले पाहिजे',
  'react.error.useToastOutsideProvider': 'useToast हे ToastProvider मध्ये वापरले पाहिजे',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider हे WorkspaceProvider मध्ये वापरले पाहिजे',
  'react.error.unsupportedMethod': 'असमर्थित पद्धत: {{method}}',
  'react.error.oauthFailed': 'OAuth लॉगिन अयशस्वी झाले',
}
