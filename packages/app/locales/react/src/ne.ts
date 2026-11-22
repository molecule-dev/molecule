import type { ReactTranslations } from './types.js'

/** React translations for Nepali. */
export const ne: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion कम्पोनेन्टहरू Accordion भित्र प्रयोग गर्नुपर्छ',
  'react.error.useAuthOutsideProvider': 'useAuthClient AuthProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.useChatOutsideProvider': 'useChatProvider ChatProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.useEditorOutsideProvider': 'useEditorProvider EditorProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.useHttpOutsideProvider': 'useHttpClient HttpProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider LoggerProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.useRouterOutsideProvider':
    'यहाँ कुनै राउटर छैन। एपको राउटिङ बन्ड (`BrowserRouter` from `@molecule/app-routing-react-router`), बाट राउटर कम्पोनेन्ट माउन्ट गर्नुहोस्, वा `router` लाई `MoleculeProvider` मा पास गर्नुहोस्। यदि एपले पहिले नै यो गर्छ भने, यसको राउटिङ बन्ड यो बाइन्डिङ भन्दा पुरानो छ: यसलाई अपडेट गर्नुहोस् (`npm install @molecule/app-routing-react-router@latest`)।',
  'react.error.noRoutedView':
    'यो राउटिङ बन्डमा यहाँ रेन्डर गर्न कुनै राउटेड भ्यू छैन: पृष्ठलाई बच्चाको रूपमा पास गर्नुहोस्। यदि एपले `@molecule/app-routing-react-router` सँग राउट गर्छ भने, त्यो बन्ड यो बाइन्डिङ भन्दा पुरानो छ: यसलाई अपडेट गर्नुहोस् (`npm install @molecule/app-routing-react-router@latest`)।',
  'react.error.useStoreOutsideProvider': 'useStateProvider StateProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.useToastOutsideProvider': 'useToast ToastProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider भित्र प्रयोग गर्नुपर्छ',
  'react.error.unsupportedMethod': 'समर्थित नभएको विधि: {{method}}',
  'react.error.oauthFailed': 'OAuth लगइन असफल भयो',
}
