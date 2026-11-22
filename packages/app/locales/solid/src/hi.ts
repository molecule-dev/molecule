import type { SolidTranslations } from './types.js'

/** Solid translations for Hindi. */
export const hi: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider को कॉन्फ़िगर किए गए MoleculeProvider के अंदर उपयोग किया जाना चाहिए स्टेट',
  'solid.error.authOutsideProvider':
    'getAuthClient को कॉन्फ़िगर किए गए MoleculeProvider के अंदर उपयोग किया जाना चाहिए ऑथ',
  'solid.error.themeOutsideProvider':
    'getThemeProvider को कॉन्फ़िगर किए गए MoleculeProvider के अंदर उपयोग किया जाना चाहिए थीम',
  'solid.error.routerOutsideProvider':
    'getRouter को कॉन्फ़िगर किए गए MoleculeProvider के अंदर उपयोग किया जाना चाहिए राउटर',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider को कॉन्फ़िगर किए गए MoleculeProvider के अंदर उपयोग किया जाना चाहिए i18n',
  'solid.error.httpOutsideProvider':
    'getHttpClient को कॉन्फ़िगर किए गए MoleculeProvider के अंदर उपयोग किया जाना चाहिए HTTP',
  'solid.error.storageOutsideProvider':
    'getStorageProvider को कॉन्फ़िगर किए गए MoleculeProvider के अंदर उपयोग किया जाना चाहिए स्टोरेज',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider को कॉन्फ़िगर किए गए MoleculeProvider के अंदर उपयोग किया जाना चाहिए लॉगर',
  'solid.error.useAccordionOutsideProvider':
    'Accordion घटकों को Accordion के अंदर उपयोग किया जाना चाहिए',
  'solid.error.useToastOutsideProvider': 'useToast को ToastProvider के अंदर उपयोग किया जाना चाहिए',
  'solid.error.useChatOutsideProvider':
    'useChatProvider का उपयोग ChatProvider के अंदर किया जाना चाहिए',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider का उपयोग WorkspaceProvider के भीतर ही किया जाना चाहिए।',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider का उपयोग EditorProvider के भीतर ही किया जाना चाहिए।',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider का उपयोग PreviewProvider के भीतर ही किया जाना चाहिए।',
  'solid.error.useAuthOutsideProvider':
    'useAuthClient का उपयोग AuthProvider के भीतर ही किया जाना चाहिए।',
  'solid.error.useHttpOutsideProvider':
    'useHttpClient का उपयोग HttpProvider के भीतर ही किया जाना चाहिए।',
  'solid.error.unsupportedMethod': 'असमर्थित विधि: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider का उपयोग LoggerProvider के भीतर ही किया जाना चाहिए।',
  'solid.error.oauthFailed': 'OAuth लॉगिन विफल',
  'solid.error.useRouterOutsideProvider':
    'यहां कोई राउटर नहीं है। राउटिंग बॉन्ड (`@molecule/app-routing-solid-router`) से `MoleculeRouterProvider` राउटर के `root` के रूप में उपयोग करें, या `router` को `MoleculeProvider` पर पास करें। यदि ऐप पहले से ही ऐसा करता है, तो इसका राउटिंग बॉन्ड इस बाइंडिंग से पुराना है: इसे अपडेट करें (`npm install @molecule/app-routing-solid-router@latest`)।',
  'solid.error.noRoutedView':
    'यहां कोई राउटेड व्यू नहीं है। सॉलिड राउटर किसी रूट के कंपोनेंट को उसका नेस्टेड रूट `props.children` के रूप में देता है: इसे रूट के `component` के रूप में उपयोग करें, या पेज को children के रूप में पास करें।',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider का उपयोग StateProvider के भीतर ही किया जाना चाहिए।',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider का उपयोग StorageProvider के भीतर ही किया जाना चाहिए।',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider का उपयोग ThemeProvider के भीतर ही किया जाना चाहिए।',
}
