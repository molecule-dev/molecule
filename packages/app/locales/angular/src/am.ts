import type { AngularTranslations } from './types.js'

/** Angular translations for Amharic. */
export const am: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider በChatProvider ውስጥ መጠቀም አለበት',
  'angular.error.useAuthOutsideProvider': 'useAuthClient በፈቃድ አቅራቢ ውስጥ ጥቅም ላይ መዋል አለበት',
  'angular.error.oauthFailed': 'የOAuth መግቢያ አልተሳካም',
  'angular.error.unsupportedMethod': 'የማይደገፍ ዘዴ፦ {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider በስቴት አቅራቢ ውስጥ ጥቅም ላይ መዋል አለበት',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider በEditorProvider ውስጥ መጠቀም አለበት',
  'angular.error.useHttpOutsideProvider': 'useHttpClient በHttpProvider ውስጥ መጠቀም አለበት',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider በLoggerProvider ውስጥ መጠቀም አለበት',
  'angular.error.usePreviewOutsideProvider': 'usePreviewProvider በPreviewProvider ውስጥ መጠቀም አለበት',
  'angular.error.useRouterOutsideProvider':
    'እዚህ ራውተር የለም። ከ Angular `provideRouter(routes)` በኋላ `provideMoleculeRouter()` ን ከራውቲንግ ቦንድ (`@molecule/app-routing-angular-router`) ወደ አፕሊኬሽኑ አቅራቢዎች ያክሉ፣ ወይም `router` ወደ `provideMolecule` ያስተላልፉ። አፕሊኬሽኑ ይህንን ካደረገ፣ የማዞሪያ ቦንዱ ከዚህ ማሰሪያ የቆየ ነው፡ ያዘምኑት (`npm install @molecule/app-routing-angular-router@latest`)።',
  'angular.error.noRoutedView':
    'ይህ የማዞሪያ ቦንድ እዚህ ለማሳየት ምንም የተዘዋወረ እይታ የለውም፡ ገጹን እንደ ልጆች ይለፉ። መተግበሪያው `@molecule/app-routing-angular-router` ን የሚያገናኝ ከሆነ፣ ያ ቦንድ ከዚህ ማሰሪያ የቆየ ነው፡ ያዘምኑት (`npm install @molecule/app-routing-angular-router@latest`)።',
  'angular.error.useStorageOutsideProvider': 'useStorageProvider በStorageProvider ውስጥ መጠቀም አለበት',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider በThemeProvider ውስጥ መጠቀም አለበት',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider በWorkspaceProvider ውስጥ መጠቀም አለበት',
}
