import type { ReactTranslations } from './types.js'

/** React translations for Bengali. */
export const bn: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion কম্পোনেন্টগুলি অবশ্যই একটি Accordion এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useAuthOutsideProvider':
    'useAuthClient অবশ্যই একটি AuthProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useChatOutsideProvider':
    'useChatProvider অবশ্যই একটি ChatProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider অবশ্যই একটি EditorProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useHttpOutsideProvider':
    'useHttpClient অবশ্যই একটি HttpProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider অবশ্যই একটি LoggerProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider অবশ্যই একটি PreviewProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useRouterOutsideProvider':
    'এখানে কোনো রাউটার নেই। অ্যাপের রাউটিং বন্ড থেকে একটি রাউটার কম্পোনেন্ট মাউন্ট করুন ( `@molecule/app-routing-react-router` থেকে `BrowserRouter` ), অথবা `MoleculeProvider` এ `router` পাস করুন। যদি অ্যাপটি ইতিমধ্যেই এটি করে থাকে, তাহলে এর রাউটিং বন্ডটি এই বাইন্ডিংয়ের চেয়ে পুরোনো: এটি আপডেট করুন (`npm install @molecule/app-routing-react-router@latest`)।',
  'react.error.noRoutedView':
    'এই রাউটিং বন্ডে এখানে রেন্ডার করার জন্য কোনো রাউটেড ভিউ নেই: এর পরিবর্তে পেজটিকে চাইল্ড হিসেবে পাস করুন। যদি অ্যাপটি `@molecule/app-routing-react-router` দিয়ে রাউট করে, তাহলে সেই বন্ডটি এই বাইন্ডিংয়ের চেয়ে পুরোনো: এটি আপডেট করুন (`npm install @molecule/app-routing-react-router@latest`)।',
  'react.error.useStoreOutsideProvider':
    'useStateProvider অবশ্যই একটি StateProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider অবশ্যই একটি StorageProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider অবশ্যই একটি ThemeProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useToastOutsideProvider':
    'useToast অবশ্যই একটি ToastProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider অবশ্যই একটি WorkspaceProvider এর মধ্যে ব্যবহার করতে হবে',
  'react.error.unsupportedMethod': 'অসমর্থিত পদ্ধতি: {{method}}',
  'react.error.oauthFailed': 'OAuth লগইন ব্যর্থ হয়েছে',
}
