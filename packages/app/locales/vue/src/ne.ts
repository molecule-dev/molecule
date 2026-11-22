import type { VueTranslations } from './types.js'

/** Vue translations for Nepali. */
export const ne: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'यहाँ राउटर छैन। राउटिङ बन्ड (`@molecule/app-routing-vue-router`) बाट एपलाई `MoleculeRouterProvider` मा र्‍याप गर्नुहोस्, वा `router` लाई `moleculePlugin` मा पास गर्नुहोस्। यदि एपले पहिले नै यो गर्छ भने, यसको राउटिङ बन्ड यो बाइन्डिङ भन्दा पुरानो छ: यसलाई अपडेट गर्नुहोस् (`npm install @molecule/app-routing-vue-router@latest`)।',
  'vue.error.noRoutedView':
    'यो राउटिङ बन्डमा यहाँ रेन्डर गर्न कुनै राउटेड भ्यू छैन: यसको सट्टा पृष्ठलाई बालबालिकाको रूपमा पास गर्नुहोस्। यदि एपले `@molecule/app-routing-vue-router` सँग राउट गर्छ भने, त्यो बन्ड यो बाइन्डिङ भन्दा पुरानो छ: यसलाई अपडेट गर्नुहोस् (`npm install @molecule/app-routing-vue-router@latest`)।',
  'vue.error.useStoreOutsideProvider': 'useStateProvider StateProvider भित्र प्रयोग गर्नुपर्छ',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider भित्र प्रयोग गर्नुपर्छ',
  'vue.error.useAuthOutsideProvider': 'useAuthClient AuthProvider भित्र प्रयोग गर्नुपर्छ',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider भित्र प्रयोग गर्नुपर्छ',
  'vue.error.useHttpOutsideProvider': 'useHttpClient HttpProvider भित्र प्रयोग गर्नुपर्छ',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider LoggerProvider भित्र प्रयोग गर्नुपर्छ',
  'vue.error.useToastOutsideProvider': 'useToast ToastProvider भित्र प्रयोग गर्नुपर्छ',
  'vue.error.unsupportedMethod': 'असमर्थित विधि: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ChatProvider भित्र प्रयोग गर्नुपर्छ',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider लाई EditorProvider भित्र प्रयोग गर्नुपर्छ।',
  'vue.error.oauthFailed': 'OAuth लगइन असफल भयो',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider लाई PreviewProvider भित्र प्रयोग गर्नुपर्छ।',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider लाई WorkspaceProvider भित्र प्रयोग गर्नुपर्छ।',
}
