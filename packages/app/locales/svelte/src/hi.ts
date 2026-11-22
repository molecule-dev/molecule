import type { SvelteTranslations } from './types.js'

/** Svelte translations for Hindi. */
export const hi: SvelteTranslations = {
  'svelte.error.noStateProvider': 'स्टेट प्रोवाइडर कॉन्टेक्स्ट में नहीं मिला',
  'svelte.error.noAuthClient': 'ऑथ क्लाइंट कॉन्टेक्स्ट में नहीं मिला',
  'svelte.error.noThemeProvider': 'थीम प्रोवाइडर कॉन्टेक्स्ट में नहीं मिला',
  'svelte.error.noRouter':
    'यहां कोई राउटर नहीं है। रूट `+layout.svelte` में राउटिंग बॉन्ड (`@molecule/app-routing-sveltekit`) से `MoleculeRouterProvider` माउंट करें, या वहां `setMoleculeContext({ router })` कॉल करें।',
  'svelte.error.noI18nProvider': 'I18n प्रोवाइडर कॉन्टेक्स्ट में नहीं मिला',
  'svelte.error.noHttpClient': 'HTTP क्लाइंट कॉन्टेक्स्ट में नहीं मिला',
  'svelte.error.noStorageProvider': 'स्टोरेज प्रोवाइडर कॉन्टेक्स्ट में नहीं मिला',
  'svelte.error.noLoggerProvider': 'लॉगर प्रोवाइडर कॉन्टेक्स्ट में नहीं मिला',
  'svelte.error.unknownPaginationDirection': 'अज्ञात पेजिनेशन दिशा: "{{direction}}"',
  'svelte.error.useChatOutsideProvider':
    'useChatProvider का उपयोग ChatProvider के अंदर किया जाना चाहिए',
  'svelte.error.useToastOutsideProvider': 'useToast का उपयोग ToastProvider के अंदर किया जाना चाहिए',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider का उपयोग WorkspaceProvider के भीतर ही किया जाना चाहिए।',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider का उपयोग EditorProvider के भीतर ही किया जाना चाहिए।',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider का उपयोग PreviewProvider के भीतर ही किया जाना चाहिए।',
  'svelte.error.useAuthOutsideProvider':
    'useAuthClient का उपयोग AuthProvider के भीतर ही किया जाना चाहिए।',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider का उपयोग ThemeProvider के भीतर ही किया जाना चाहिए।',
  'svelte.error.useRouterOutsideProvider':
    'यहां कोई राउटर नहीं है। रूट `+layout.svelte` में राउटिंग बॉन्ड (`@molecule/app-routing-sveltekit`) से `MoleculeRouterProvider` माउंट करें, या वहां `setMoleculeContext({ router })` कॉल करें।',
  'svelte.error.noRoutedView':
    'यहां कोई राउटेड व्यू नहीं है। SvelteKit लेआउट को उसका पेज `children` के रूप में देता है: इस कंपोनेंट के अंदर `{@render children()}` पास करें।',
  'svelte.error.useHttpOutsideProvider':
    'useHttpClient का उपयोग HttpProvider के भीतर ही किया जाना चाहिए।',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider का उपयोग StorageProvider के भीतर ही किया जाना चाहिए।',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider का उपयोग LoggerProvider के भीतर ही किया जाना चाहिए।',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider का उपयोग StateProvider के भीतर ही किया जाना चाहिए।',
  'svelte.error.unsupportedMethod': 'असमर्थित विधि: {{method}}',
  'svelte.error.oauthFailed': 'OAuth लॉगिन विफल',
}
