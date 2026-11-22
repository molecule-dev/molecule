import type { SolidTranslations } from './types.js'

/** Solid translations for Marathi. */
export const mr: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider स्टेट कॉन्फिगर केलेल्या MoleculeProvider मध्ये वापरणे आवश्यक आहे स्टेट',
  'solid.error.authOutsideProvider':
    'getAuthClient स्टेट कॉन्फिगर केलेल्या MoleculeProvider मध्ये वापरणे आवश्यक आहे ऑथ',
  'solid.error.themeOutsideProvider':
    'getThemeProvider स्टेट कॉन्फिगर केलेल्या MoleculeProvider मध्ये वापरणे आवश्यक आहे थीम',
  'solid.error.routerOutsideProvider':
    'getRouter स्टेट कॉन्फिगर केलेल्या MoleculeProvider मध्ये वापरणे आवश्यक आहे राउटर',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider स्टेट कॉन्फिगर केलेल्या MoleculeProvider मध्ये वापरणे आवश्यक आहे i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient स्टेट कॉन्फिगर केलेल्या MoleculeProvider मध्ये वापरणे आवश्यक आहे HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider स्टेट कॉन्फिगर केलेल्या MoleculeProvider मध्ये वापरणे आवश्यक आहे स्टोरेज',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider स्टेट कॉन्फिगर केलेल्या MoleculeProvider मध्ये वापरणे आवश्यक आहे लॉगर',
  'solid.error.useAccordionOutsideProvider': 'Accordion घटक Accordion मध्ये वापरणे आवश्यक आहे',
  'solid.error.useToastOutsideProvider': 'useToast ToastProvider मध्ये वापरणे आवश्यक आहे',
  'solid.error.useChatOutsideProvider': 'useChatProvider हे ChatProvider मध्ये वापरले पाहिजे',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider चा वापर WorkspaceProvider च्या आतच केला पाहिजे.',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider चा वापर EditorProvider च्या आतच केला पाहिजे.',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider चा वापर PreviewProvider च्या आतच केला पाहिजे.',
  'solid.error.useAuthOutsideProvider': 'useAuthClient चा वापर AuthProvider च्या आतच केला पाहिजे.',
  'solid.error.useHttpOutsideProvider': 'useHttpClient चा वापर HttpProvider च्या आतच केला पाहिजे.',
  'solid.error.unsupportedMethod': 'असमर्थित पद्धत: {{method}}',
  'solid.error.useLoggerOutsideProvider': 'useLoggerProvider हे LoggerProvider मध्ये वापरले पाहिजे',
  'solid.error.oauthFailed': 'OAuth लॉगिन अयशस्वी झाले',
  'solid.error.useRouterOutsideProvider':
    'येथे राउटर नाही. राउटरचा `root` म्हणून राउटिंग बाँडमधील (`@molecule/app-routing-solid-router`) `MoleculeRouterProvider` वापरा, किंवा `MoleculeProvider` ला `router` पास करा. जर ॲप आधीच असे करत असेल, तर त्याचा राउटिंग बाँड या बाइंडिंगपेक्षा जुना आहे: तो अपडेट करा (`npm install @molecule/app-routing-solid-router@latest`).',
  'solid.error.noRoutedView':
    'येथे कोणताही रूट केलेला व्ह्यू नाही. सॉलिड राउटर रूटच्या कंपोनंटला त्याचा नेस्टेड रूट `props.children` म्हणून देतो: याचा रूटचा `component` म्हणून वापर करा, किंवा पेजला चिल्ड्रेन म्हणून पास करा.',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider चा वापर StateProvider च्या आतच केला पाहिजे.',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider चा वापर StorageProvider च्या आतच केला पाहिजे.',
  'solid.error.useThemeOutsideProvider': 'useThemeProvider हे ThemeProvider मध्ये वापरले पाहिजे',
}
