import type { SvelteTranslations } from './types.js'

/** Svelte translations for Nepali. */
export const ne: SvelteTranslations = {
  'svelte.error.noStateProvider':
    '\u0938\u094d\u091f\u0947\u091f \u092a\u094d\u0930\u094b\u092d\u093e\u0907\u0921\u0930 \u0938\u0928\u094d\u0926\u0930\u094d\u092d\u092e\u093e \u092d\u0947\u091f\u093f\u090f\u0928',
  'svelte.error.noAuthClient':
    '\u0905\u0925 \u0915\u094d\u0932\u093e\u0907\u0928\u094d\u091f \u0938\u0928\u094d\u0926\u0930\u094d\u092d\u092e\u093e \u092d\u0947\u091f\u093f\u090f\u0928',
  'svelte.error.noThemeProvider':
    '\u0925\u093f\u092e \u092a\u094d\u0930\u094b\u092d\u093e\u0907\u0921\u0930 \u0938\u0928\u094d\u0926\u0930\u094d\u092d\u092e\u093e \u092d\u0947\u091f\u093f\u090f\u0928',
  'svelte.error.noRouter':
    'यहाँ राउटर छैन। `+layout.svelte` रूटमा रहेको राउटिङ बन्ड (`@molecule/app-routing-sveltekit`) बाट `MoleculeRouterProvider` माउन्ट गर्नुहोस्, वा त्यहाँ `setMoleculeContext({ router })` लाई कल गर्नुहोस्। यदि एपले पहिले नै यो गर्छ भने, यसको राउटिङ बन्ड यो बाइन्डिङ भन्दा पुरानो छ: यसलाई अपडेट गर्नुहोस् (`npm install @molecule/app-routing-sveltekit@latest`)।',
  'svelte.error.noI18nProvider':
    'I18n \u092a\u094d\u0930\u094b\u092d\u093e\u0907\u0921\u0930 \u0938\u0928\u094d\u0926\u0930\u094d\u092d\u092e\u093e \u092d\u0947\u091f\u093f\u090f\u0928',
  'svelte.error.noHttpClient':
    'HTTP \u0915\u094d\u0932\u093e\u0907\u0928\u094d\u091f \u0938\u0928\u094d\u0926\u0930\u094d\u092d\u092e\u093e \u092d\u0947\u091f\u093f\u090f\u0928',
  'svelte.error.noStorageProvider':
    '\u0938\u094d\u091f\u094b\u0930\u0947\u091c \u092a\u094d\u0930\u094b\u092d\u093e\u0907\u0921\u0930 \u0938\u0928\u094d\u0926\u0930\u094d\u092d\u092e\u093e \u092d\u0947\u091f\u093f\u090f\u0928',
  'svelte.error.noLoggerProvider':
    '\u0932\u0917\u0930 \u092a\u094d\u0930\u094b\u092d\u093e\u0907\u0921\u0930 \u0938\u0928\u094d\u0926\u0930\u094d\u092d\u092e\u093e \u092d\u0947\u091f\u093f\u090f\u0928',
  'svelte.error.unknownPaginationDirection':
    '\u0905\u091c\u094d\u091e\u093e\u0924 \u092a\u0947\u091c\u093f\u0928\u0947\u0936\u0928 \u0926\u093f\u0936\u093e: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider ChatProvider भित्र प्रयोग गर्नुपर्छ',
  'svelte.error.useToastOutsideProvider': 'useToast ToastProvider भित्र प्रयोग गर्नुपर्छ',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider लाई WorkspaceProvider भित्र प्रयोग गर्नुपर्छ।',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider लाई EditorProvider भित्र प्रयोग गर्नुपर्छ।',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider लाई PreviewProvider भित्र प्रयोग गर्नुपर्छ।',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient लाई AuthProvider भित्र प्रयोग गर्नुपर्छ।',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider लाई ThemeProvider भित्र प्रयोग गर्नुपर्छ।',
  'svelte.error.useRouterOutsideProvider':
    'यहाँ राउटर छैन। `+layout.svelte` रूटमा रहेको राउटिङ बन्ड (`@molecule/app-routing-sveltekit`) बाट `MoleculeRouterProvider` माउन्ट गर्नुहोस्, वा त्यहाँ `setMoleculeContext({ router })` लाई कल गर्नुहोस्। यदि एपले पहिले नै यो गर्छ भने, यसको राउटिङ बन्ड यो बाइन्डिङ भन्दा पुरानो छ: यसलाई अपडेट गर्नुहोस् (`npm install @molecule/app-routing-sveltekit@latest`)।',
  'svelte.error.noRoutedView':
    'यहाँ कुनै राउटेड दृश्य छैन। SvelteKit ले लेआउटलाई यसको पृष्ठ `children` को रूपमा दिन्छ: यस कम्पोनेन्ट भित्र `{@render children()}` पास गर्नुहोस्।',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient HttpProvider भित्र प्रयोग गरिनु पर्छ।',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider लाई StorageProvider भित्र प्रयोग गर्नुपर्छ।',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider लाई LoggerProvider भित्र प्रयोग गर्नुपर्छ।',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider लाई StateProvider भित्र प्रयोग गर्नुपर्छ।',
  'svelte.error.unsupportedMethod': 'असमर्थित विधि: {{method}}',
  'svelte.error.oauthFailed': 'OAuth लगइन असफल भयो',
}
