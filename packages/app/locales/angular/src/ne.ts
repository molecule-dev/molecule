import type { AngularTranslations } from './types.js'

/** Angular translations for Nepali. */
export const ne: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ChatProvider भित्र प्रयोग गर्नुपर्छ',
  'angular.error.useAuthOutsideProvider': 'useAuthClient लाई AuthProvider भित्र प्रयोग गर्नुपर्छ।',
  'angular.error.oauthFailed': 'OAuth लगइन असफल भयो',
  'angular.error.unsupportedMethod': 'असमर्थित विधि: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider लाई StateProvider भित्र प्रयोग गर्नुपर्छ।',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider भित्र प्रयोग गर्नुपर्छ',
  'angular.error.useHttpOutsideProvider': 'useHttpClient HttpProvider भित्र प्रयोग गर्नुपर्छ',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider भित्र प्रयोग गर्नुपर्छ',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider भित्र प्रयोग गर्नुपर्छ',
  'angular.error.useRouterOutsideProvider':
    'यहाँ कुनै राउटर छैन। एङ्गुलरको `provideRouter(routes)` पछि, एपको प्रदायकहरूमा राउटिङ बन्ड (`@molecule/app-routing-angular-router`) बाट `provideMoleculeRouter()` थप्नुहोस्, वा `router` लाई `provideMolecule` मा पास गर्नुहोस्। यदि एपले पहिले नै यो गर्छ भने, यसको राउटिङ बन्ड यो बाइन्डिङ भन्दा पुरानो छ: यसलाई अपडेट गर्नुहोस् (`npm install @molecule/app-routing-angular-router@latest`)।',
  'angular.error.noRoutedView':
    'यो राउटिङ बन्डमा यहाँ रेन्डर गर्न कुनै राउटेड भ्यू छैन: यसको सट्टा पृष्ठलाई बालबालिकाको रूपमा पास गर्नुहोस्। यदि एपले `@molecule/app-routing-angular-router` सँग राउट गर्छ भने, त्यो बन्ड यो बाइन्डिङ भन्दा पुरानो छ: यसलाई अपडेट गर्नुहोस् (`npm install @molecule/app-routing-angular-router@latest`)।',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider भित्र प्रयोग गर्नुपर्छ',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider भित्र प्रयोग गर्नुपर्छ',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider भित्र प्रयोग गर्नुपर्छ',
}
