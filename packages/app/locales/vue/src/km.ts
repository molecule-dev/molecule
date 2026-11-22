import type { VueTranslations } from './types.js'

/** Vue translations for Khmer. */
export const km: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'គ្មានរ៉ោតទ័រនៅទីនេះទេ។ រុំកម្មវិធីនៅក្នុង `MoleculeRouterProvider` ពីចំណងរ៉ោតទ័រ (`@molecule/app-routing-vue-router`) ឬបញ្ជូន `router` ទៅ `moleculePlugin` ។ ប្រសិនបើកម្មវិធីធ្វើបែបនេះរួចហើយ ចំណងរ៉ោតទ័ររបស់វាចាស់ជាងចំណងនេះ៖ ធ្វើបច្ចុប្បន្នភាពវា (`npm install @molecule/app-routing-vue-router@latest`)។',
  'vue.error.noRoutedView':
    'ចំណង​រ៉ោតទ័រ​នេះ​មិន​មាន​ទិដ្ឋភាព​រ៉ោតទ័រ​ដើម្បី​បង្ហាញ​នៅ​ទីនេះ​ទេ៖ សូម​បញ្ជូន​ទំព័រ​ជា​កូន​ជំនួស​វិញ។ ប្រសិនបើ​កម្មវិធី​រ៉ោតទ័រ​ជាមួយ `@molecule/app-routing-vue-router` ​ចំណង​នោះ​ចាស់​ជាង​ចំណង​នេះ៖ ធ្វើ​បច្ចុប្បន្នភាព​វា (`npm install @molecule/app-routing-vue-router@latest`)។',
  'vue.error.useStoreOutsideProvider': 'useStateProvider ត្រូវតែប្រើនៅក្នុង StateProvider',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ត្រូវតែប្រើនៅក្នុង ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'useAuthClient ត្រូវតែប្រើនៅក្នុង AuthProvider',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider ត្រូវតែប្រើនៅក្នុង StorageProvider',
  'vue.error.useHttpOutsideProvider': 'useHttpClient ត្រូវតែប្រើនៅក្នុង HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider ត្រូវតែប្រើនៅក្នុង LoggerProvider',
  'vue.error.useToastOutsideProvider': 'useToast ត្រូវតែប្រើនៅក្នុង ToastProvider',
  'vue.error.unsupportedMethod': 'វិធីសាស្រ្តដែលមិនគាំទ្រ: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ត្រូវតែប្រើនៅក្នុង ChatProvider',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider ត្រូវតែប្រើនៅក្នុង EditorProvider',
  'vue.error.oauthFailed': 'ការចូល OAuth បរាជ័យ',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider ត្រូវតែប្រើនៅក្នុង PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ត្រូវតែប្រើនៅក្នុង WorkspaceProvider',
}
