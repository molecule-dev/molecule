import type { VueTranslations } from './types.js'

/** Vue translations for Bengali. */
export const bn: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'এখানে কোনো রাউটার নেই। রাউটিং বন্ড (`@molecule/app-routing-vue-router`) থেকে অ্যাপটিকে `MoleculeRouterProvider` মধ্যে র‍্যাপ করুন, অথবা `moleculePlugin` এ `router` পাস করুন। যদি অ্যাপটি ইতিমধ্যেই এটি করে থাকে, তাহলে এর রাউটিং বন্ডটি এই বাইন্ডিংয়ের চেয়ে পুরোনো: এটি আপডেট করুন (`npm install @molecule/app-routing-vue-router@latest`)।',
  'vue.error.noRoutedView':
    'এই রাউটিং বন্ডে এখানে রেন্ডার করার জন্য কোনো রাউটেড ভিউ নেই: এর পরিবর্তে পেজটিকে চাইল্ড হিসেবে পাস করুন। যদি অ্যাপটি `@molecule/app-routing-vue-router` দিয়ে রাউট করে, তাহলে সেই বন্ডটি এই বাইন্ডিংয়ের চেয়ে পুরোনো: এটি আপডেট করুন (`npm install @molecule/app-routing-vue-router@latest`)।',
  'vue.error.useStoreOutsideProvider':
    'useStateProvider অবশ্যই StateProvider এর মধ্যে ব্যবহার করতে হবে',
  'vue.error.useThemeOutsideProvider':
    'useThemeProvider অবশ্যই ThemeProvider এর মধ্যে ব্যবহার করতে হবে',
  'vue.error.useAuthOutsideProvider': 'useAuthClient অবশ্যই AuthProvider এর মধ্যে ব্যবহার করতে হবে',
  'vue.error.useStorageOutsideProvider':
    'useStorageProvider অবশ্যই StorageProvider এর মধ্যে ব্যবহার করতে হবে',
  'vue.error.useHttpOutsideProvider': 'useHttpClient অবশ্যই HttpProvider এর মধ্যে ব্যবহার করতে হবে',
  'vue.error.useLoggerOutsideProvider':
    'useLoggerProvider অবশ্যই LoggerProvider এর মধ্যে ব্যবহার করতে হবে',
  'vue.error.useToastOutsideProvider': 'useToast অবশ্যই ToastProvider এর মধ্যে ব্যবহার করতে হবে',
  'vue.error.unsupportedMethod': 'অসমর্থিত পদ্ধতি: {{method}}',
  'vue.error.useChatOutsideProvider':
    'useChatProvider অবশ্যই একটি ChatProvider এর মধ্যে ব্যবহার করতে হবে',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider অবশ্যই একটি EditorProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'vue.error.oauthFailed': 'OAuth লগইন ব্যর্থ হয়েছে',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider অবশ্যই একটি PreviewProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider অবশ্যই একটি WorkspaceProvider-এর মধ্যে ব্যবহার করতে হবে।',
}
