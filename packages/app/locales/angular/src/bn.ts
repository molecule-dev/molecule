import type { AngularTranslations } from './types.js'

/** Angular translations for Bengali. */
export const bn: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider অবশ্যই একটি ChatProvider এর মধ্যে ব্যবহার করতে হবে',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient অবশ্যই একটি AuthProvider-এর মধ্যে ব্যবহার করতে হবে।',
  'angular.error.oauthFailed': 'OAuth লগইন ব্যর্থ হয়েছে',
  'angular.error.unsupportedMethod': 'অসমর্থিত পদ্ধতি: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider অবশ্যই একটি StateProvider-এর মধ্যে ব্যবহার করতে হবে।',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider অবশ্যই একটি EditorProvider এর মধ্যে ব্যবহার করতে হবে',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient অবশ্যই একটি HttpProvider এর মধ্যে ব্যবহার করতে হবে',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider অবশ্যই একটি LoggerProvider এর মধ্যে ব্যবহার করতে হবে',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider অবশ্যই একটি PreviewProvider এর মধ্যে ব্যবহার করতে হবে',
  'angular.error.useRouterOutsideProvider':
    'এখানে কোনো রাউটার নেই। রাউটিং বন্ড (`@molecule/app-routing-angular-router`) থেকে `provideMoleculeRouter()` ফাংশনটিকে অ্যাপের প্রোভাইডারগুলিতে, Angular-এর `provideRouter(routes)` পরে যোগ করুন, অথবা `provideMolecule` এ `router` পাস করুন। যদি অ্যাপটি ইতিমধ্যেই এটি করে থাকে, তাহলে এর রাউটিং বন্ডটি এই বাইন্ডিংয়ের চেয়ে পুরোনো: এটিকে আপডেট করুন (`npm install @molecule/app-routing-angular-router@latest`)।',
  'angular.error.noRoutedView':
    'এই রাউটিং বন্ডে এখানে রেন্ডার করার জন্য কোনো রাউটেড ভিউ নেই: এর পরিবর্তে পেজটিকে চাইল্ড হিসেবে পাস করুন। যদি অ্যাপটি `@molecule/app-routing-angular-router` দিয়ে রাউট করে, তাহলে সেই বন্ডটি এই বাইন্ডিংয়ের চেয়ে পুরোনো: এটি আপডেট করুন (`npm install @molecule/app-routing-angular-router@latest`)।',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider অবশ্যই একটি StorageProvider এর মধ্যে ব্যবহার করতে হবে',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider অবশ্যই একটি ThemeProvider এর মধ্যে ব্যবহার করতে হবে',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider অবশ্যই একটি WorkspaceProvider এর মধ্যে ব্যবহার করতে হবে',
}
