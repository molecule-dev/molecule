import type { SolidTranslations } from './types.js'

/** Solid translations for Bengali. */
export const bn: SolidTranslations = {
  'solid.error.stateOutsideProvider':
    'getStateProvider অবশ্যই স্টেট কনফিগার করা MoleculeProvider-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.authOutsideProvider':
    'getAuthClient অবশ্যই অথ কনফিগার করা MoleculeProvider-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.themeOutsideProvider':
    'getThemeProvider অবশ্যই থিম কনফিগার করা MoleculeProvider-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.routerOutsideProvider':
    'getRouter অবশ্যই রাউটার কনফিগার করা MoleculeProvider-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.i18nOutsideProvider':
    'getI18nProvider অবশ্যই i18n কনফিগার করা MoleculeProvider-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.httpOutsideProvider':
    'getHttpClient অবশ্যই HTTP কনফিগার করা MoleculeProvider-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.storageOutsideProvider':
    'getStorageProvider অবশ্যই স্টোরেজ কনফিগার করা MoleculeProvider-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.loggerOutsideProvider':
    'getLoggerProvider অবশ্যই লগার কনফিগার করা MoleculeProvider-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.useAccordionOutsideProvider':
    'Accordion কম্পোনেন্টগুলি অবশ্যই একটি Accordion-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.useToastOutsideProvider':
    'useToast অবশ্যই একটি ToastProvider-এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.useChatOutsideProvider':
    'useChatProvider অবশ্যই একটি ChatProvider এর মধ্যে ব্যবহার করতে হবে',
  'solid.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider অবশ্যই একটি WorkspaceProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'solid.error.useEditorOutsideProvider':
    'useEditorProvider অবশ্যই একটি EditorProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'solid.error.usePreviewOutsideProvider':
    'usePreviewProvider অবশ্যই একটি PreviewProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'solid.error.useAuthOutsideProvider':
    'useAuthClient অবশ্যই একটি AuthProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'solid.error.useHttpOutsideProvider':
    'useHttpClient অবশ্যই একটি HttpProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'solid.error.unsupportedMethod': 'অসমর্থিত পদ্ধতি: {{method}}',
  'solid.error.useLoggerOutsideProvider':
    'useLoggerProvider অবশ্যই একটি LoggerProvider-এর ভিতরে ব্যবহার করতে হবে।',
  'solid.error.oauthFailed': 'OAuth লগইন ব্যর্থ হয়েছে',
  'solid.error.useRouterOutsideProvider':
    'এখানে কোনো রাউটার নেই। রাউটারের `root` হিসেবে রাউটিং বন্ড (`@molecule/app-routing-solid-router`) থেকে `MoleculeRouterProvider` ব্যবহার করুন, অথবা `MoleculeProvider` এ `router` পাস করুন। যদি অ্যাপটি ইতিমধ্যেই এটি করে থাকে, তাহলে এর রাউটিং বন্ডটি এই বাইন্ডিংয়ের চেয়ে পুরোনো: এটি আপডেট করুন (`npm install @molecule/app-routing-solid-router@latest`)।',
  'solid.error.noRoutedView':
    'এখানে কোনো রাউটেড ভিউ নেই। সলিড রাউটার একটি রাউটের কম্পোনেন্টকে তার নেস্টেড রাউট হিসেবে `props.children` দেয়: এটিকে রাউটের `component` হিসেবে ব্যবহার করুন, অথবা পেজটিকে চাইল্ড হিসেবে পাস করুন।',
  'solid.error.useStoreOutsideProvider':
    'useStateProvider অবশ্যই একটি StateProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'solid.error.useStorageOutsideProvider':
    'useStorageProvider অবশ্যই একটি StorageProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'solid.error.useThemeOutsideProvider':
    'useThemeProvider অবশ্যই একটি ThemeProvider-এর ভিতরে ব্যবহার করতে হবে।',
}
