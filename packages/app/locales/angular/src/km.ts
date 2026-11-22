import type { AngularTranslations } from './types.js'

/** Angular translations for Khmer. */
export const km: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ត្រូវតែប្រើនៅក្នុង ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient ត្រូវតែប្រើនៅក្នុង AuthProvider',
  'angular.error.oauthFailed': 'ការចូល OAuth បរាជ័យ',
  'angular.error.unsupportedMethod': 'វិធីសាស្ត្រដែលមិនគាំទ្រ៖ {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider ត្រូវតែប្រើនៅក្នុង StateProvider',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider ត្រូវតែប្រើនៅក្នុង EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient ត្រូវតែប្រើនៅក្នុង HttpProvider',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider ត្រូវតែប្រើនៅក្នុង LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider ត្រូវតែប្រើនៅក្នុង PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'គ្មានរ៉ោតទ័រនៅទីនេះទេ។ បន្ថែម `provideMoleculeRouter()` ពីចំណង​រ៉ោតទ័រ (`@molecule/app-routing-angular-router`) ទៅកាន់អ្នកផ្តល់សេវារបស់កម្មវិធី បន្ទាប់ពី `provideRouter(routes)` របស់ Angular ឬបញ្ជូន `router` ទៅ `provideMolecule` ។ ប្រសិនបើកម្មវិធីធ្វើបែបនេះរួចហើយ ចំណងរ៉ោតទ័ររបស់វាចាស់ជាងចំណងនេះ៖ ធ្វើបច្ចុប្បន្នភាពវា (`npm install @molecule/app-routing-angular-router@latest`)។',
  'angular.error.noRoutedView':
    'ចំណង​រ៉ោតទ័រ​នេះ​មិន​មាន​ទិដ្ឋភាព​រ៉ោតទ័រ​ដើម្បី​បង្ហាញ​នៅ​ទីនេះ​ទេ៖ សូម​បញ្ជូន​ទំព័រ​ជា​កូន​ជំនួស​វិញ។ ប្រសិនបើ​កម្មវិធី​រ៉ោតទ័រ​ជាមួយ `@molecule/app-routing-angular-router` នោះ​ចំណង​នោះ​ចាស់​ជាង​ចំណង​នេះ៖ ធ្វើ​បច្ចុប្បន្នភាព​វា (`npm install @molecule/app-routing-angular-router@latest`)។',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider ត្រូវតែប្រើនៅក្នុង StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider ត្រូវតែប្រើនៅក្នុង ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ត្រូវតែប្រើនៅក្នុង WorkspaceProvider',
}
