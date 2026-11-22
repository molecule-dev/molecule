import type { SolidTranslations } from './types.js'

/** Solid translations for Nepali. */
export const ne: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider कन्फिगर गरिएको MoleculeProvider भित्र प्रयोग गर्नुपर्छ स्टेट',
  'solid.error.authOutsideProvider':
    'getAuthClient कन्फिगर गरिएको MoleculeProvider भित्र प्रयोग गर्नुपर्छ अथ',
  'solid.error.themeOutsideProvider':
    'getThemeProvider कन्फिगर गरिएको MoleculeProvider भित्र प्रयोग गर्नुपर्छ थिम',
  'solid.error.routerOutsideProvider':
    'getRouter कन्फिगर गरिएको MoleculeProvider भित्र प्रयोग गर्नुपर्छ राउटर',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider कन्फिगर गरिएको MoleculeProvider भित्र प्रयोग गर्नुपर्छ i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient कन्फिगर गरिएको MoleculeProvider भित्र प्रयोग गर्नुपर्छ HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider कन्फिगर गरिएको MoleculeProvider भित्र प्रयोग गर्नुपर्छ स्टोरेज',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider कन्फिगर गरिएको MoleculeProvider भित्र प्रयोग गर्नुपर्छ लगर',
  'solid.error.useAccordionOutsideProvider':
    'Accordion कम्पोनेन्टहरू Accordion भित्र प्रयोग गर्नुपर्छ',
  'solid.error.useToastOutsideProvider': 'useToast ToastProvider भित्र प्रयोग गर्नुपर्छ',
  'solid.error.useChatOutsideProvider': 'useChatProvider ChatProvider भित्र प्रयोग गर्नुपर्छ',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider लाई WorkspaceProvider भित्र प्रयोग गर्नुपर्छ।',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider लाई EditorProvider भित्र प्रयोग गर्नुपर्छ।',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider लाई PreviewProvider भित्र प्रयोग गर्नुपर्छ।',
  'solid.error.useAuthOutsideProvider': 'useAuthClient लाई AuthProvider भित्र प्रयोग गर्नुपर्छ।',
  'solid.error.useHttpOutsideProvider': 'useHttpClient HttpProvider भित्र प्रयोग गरिनु पर्छ।',
  'solid.error.unsupportedMethod': 'असमर्थित विधि: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider लाई LoggerProvider भित्र प्रयोग गर्नुपर्छ।',
  'solid.error.oauthFailed': 'OAuth लगइन असफल भयो',
  'solid.error.useRouterOutsideProvider':
    'यहाँ राउटर छैन। राउटरको `root` को रूपमा राउटिङ बन्ड (`@molecule/app-routing-solid-router`) बाट `MoleculeRouterProvider` प्रयोग गर्नुहोस्, वा `router` लाई `MoleculeProvider` मा पास गर्नुहोस्।',
  'solid.error.noRoutedView':
    'यहाँ कुनै राउटेड दृश्य छैन। सोलिड राउटरले रुटको कम्पोनेन्टलाई यसको नेस्टेड रुट `props.children` को रूपमा दिन्छ: यसलाई रुटको `component` को रूपमा प्रयोग गर्नुहोस्, वा पृष्ठलाई बालबालिकाको रूपमा पास गर्नुहोस्।',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider लाई StateProvider भित्र प्रयोग गर्नुपर्छ।',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider लाई StorageProvider भित्र प्रयोग गर्नुपर्छ।',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider लाई ThemeProvider भित्र प्रयोग गर्नुपर्छ।',
}
